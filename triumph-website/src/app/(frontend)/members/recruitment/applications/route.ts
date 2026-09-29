import payloadConfig from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Application, FormSubmission, User } from '@/payload-types'
import { DEFAULT_CUSTOM_MAIL_SENDER } from '@/utilities/customCandidateMail'
import { normalizeInstagramUsername } from '@/utilities/instagram'
import { isBoardMember } from '@/utilities/membersAccess'

export { PATCH } from '../../commissions/applications/route'

export async function GET(request: Request) {
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRecruitmentRequest(request, payload)
  if ('response' in authentication) return authentication.response

  if (!isBoardMember(authentication.user)) {
    return Response.json({ message: 'Doar boardul poate vedea aplicatiile.' }, { status: 403 })
  }

  const applicationResult = await payload.find({
    collection: 'applications',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
  })

  return Response.json({
    applications: (applicationResult.docs as Application[]).map(serializeApplication),
  })
}

async function authenticateRecruitmentRequest(request: Request, payload: Payload) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return { response: Response.json({ message: 'Cerere nepermisa.' }, { status: 403 }) }
  }

  const authHeaders = new Headers(request.headers)
  authHeaders.delete('origin')
  if (!authHeaders.has('sec-fetch-site')) {
    authHeaders.set('sec-fetch-site', 'same-origin')
  }

  const auth = await payload.auth({ headers: authHeaders })
  if (!auth.user) {
    return {
      response: Response.json(
        { message: 'Sesiunea a expirat. Autentifica-te din nou.' },
        { status: 401 },
      ),
    }
  }

  return { user: auth.user as User }
}

function serializeApplication(application: Application) {
  const review = application.reviewProcess ?? {}
  const submission =
    typeof application.formSubmission === 'string' ? null : application.formSubmission
  const answers = getSubmissionAnswers(submission)

  return {
    aspirerUserId: getRelationshipID(review.aspirerUser),
    commissionId: getRelationshipID(review.comission),
    createdAt: application.createdAt,
    customMailHistory: (review.customMailHistory ?? []).map((mail) => ({
      body: mail.body,
      id: mail.id ?? `${mail.sentAt}-${mail.recipient}`,
      recipient: mail.recipient,
      senderAddress: mail.senderAddress ?? DEFAULT_CUSTOM_MAIL_SENDER,
      sentAt: mail.sentAt,
      sentBy: serializeUser(mail.sentBy),
      subject: mail.subject,
    })),
    email: application.email,
    finalMailSentAt: normalizeDate(review.finalMailSentAt),
    formAnswers: answers,
    formReviewComments: (review.formReviewComments ?? []).map((comment) => ({
      author: serializeUser(comment.author),
      comment: comment.comment,
      createdAt: comment.createdAt,
      id: comment.id ?? `${getRelationshipID(comment.author)}-${comment.createdAt}`,
    })),
    formUploads: getSubmissionUploads(submission),
    id: application.id,
    instagram: normalizeInstagramUsername(findSubmissionValue(answers, ['insta', 'instagram'])),
    interviewAttendance: review.interviewAttendance ?? null,
    interviewDate: normalizeDate(review.interviewDate),
    interviewMailSentAt: normalizeDate(review.interviewMailSentAt),
    interviewNotes: (review.interviewNotes ?? []).map((note) => ({
      author: serializeUser(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    knownCoordinatorIds: (review.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    name: application.name,
    notes: review.notes ?? '',
    phone: findSubmissionValue(answers, ['phone', 'telefon', 'tel']),
    reviewMailSentAt: normalizeDate(review.reviewMailSentAt),
    reviewedCoordinatorIds: (review.coordonatorReviewChecks ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    status: review.status ?? 'submitted',
  }
}

function getSubmissionAnswers(submission: FormSubmission | null) {
  const fieldLabels = getSubmissionFieldLabels(submission)

  return (submission?.submissionData ?? []).map((item) => ({
    field: item.field,
    label: fieldLabels.get(item.field) || item.field,
    value: item.value,
  }))
}

function getSubmissionUploads(submission: FormSubmission | null) {
  const fieldLabels = getSubmissionFieldLabels(submission)

  return (submission?.submissionUploads ?? [])
    .flatMap((entry) =>
      entry.value.map((relation) => {
        const file = relation.value
        if (typeof file === 'string') return null

        return {
          filename: file.filename || file.id,
          field: entry.field,
          id: file.id,
          label: fieldLabels.get(entry.field) || entry.field,
          mimeType: file.mimeType || null,
          previewURL: file.url || null,
          url: file.url || null,
        }
      }),
    )
    .filter(Boolean)
}

function getSubmissionFieldLabels(submission: FormSubmission | null) {
  if (!submission || typeof submission.form === 'string') return new Map<string, string>()

  return new Map(
    (submission.form.fields ?? []).flatMap((field) => {
      if (!('name' in field) || typeof field.name !== 'string') return []

      const label = 'label' in field && typeof field.label === 'string' ? field.label.trim() : ''
      return [[field.name, label || field.name]]
    }),
  )
}

function findSubmissionValue(answers: Array<{ field: string; value: string }>, names: string[]) {
  const match = answers.find((item) => {
    const field = item.field.toLocaleLowerCase('ro')
    return names.some((name) => field.includes(name))
  })
  return match?.value ?? ''
}

function serializeUser(value: string | User | null | undefined) {
  if (!value || typeof value === 'string') return null
  return {
    clubMail: value.clubMail,
    email: value.email,
    id: value.id,
    name: value.name || value.email,
    role: value.role,
  }
}

function getRelationshipID(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }
  return ''
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
