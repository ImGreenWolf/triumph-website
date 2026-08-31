import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type {
  Application,
  AspirementConfig,
  Comission,
  FormSubmission,
  User,
} from '@/payload-types'
import { normalizeInstagramUsername } from '@/utilities/instagram'
import { normalizeGooglePlace } from '@/utilities/googlePlace'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import HRRecruitmentWizard, {
  type ManagedApplication,
  type ManagedCommission,
  type ManagedRecruitmentConfig,
  type ManagedUpload,
  type ManagedUser,
} from './HRRecruitmentWizard'

export const metadata: Metadata = {
  description: 'Fluxul de recruitment HR Interact Bucuresti Triumph.',
  title: 'Recruitment HR | Interact Bucuresti Triumph',
}

export default async function HRRecruitmentPage() {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })

  if (!auth.user) redirect('/members/login')

  const member = (await payload.findByID({
    collection: 'users',
    depth: 1,
    id: auth.user.id,
    overrideAccess: false,
    user: auth.user,
  })) as User
  if (member.role !== 'hr-director') redirect('/members')

  const [config, commissionResult, applicationResult] = await Promise.all([
    payload.findGlobal({ slug: 'aspirementConfig', depth: 0, overrideAccess: true }),
    payload.find({
      collection: 'comissions',
      depth: 2,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      sort: 'commissionNumber',
    }),
    payload.find({
      collection: 'applications',
      depth: 2,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      sort: '-createdAt',
    }),
  ])

  return (
    <HRRecruitmentWizard
      applications={(applicationResult.docs as Application[]).map(serializeApplication)}
      commissions={(commissionResult.docs as Comission[]).map(serializeCommission)}
      config={serializeConfig(config as AspirementConfig)}
      user={serializeUser(member) as ManagedUser}
    />
  )
}

function serializeConfig(config: AspirementConfig): ManagedRecruitmentConfig {
  return {
    defaultInterviewDate: normalizeDate(config.recruitment?.defaultInterviewDate),
    interviewSchedulingDeadline: normalizeDate(config.recruitment?.interviewSchedulingDeadline),
    recruitmentEndDate: normalizeDate(config.recruitment?.recruitmentEndDate),
    recruitmentStartDate: normalizeDate(config.recruitment?.recruitmentStartDate),
  }
}

function serializeCommission(commission: Comission): ManagedCommission {
  return {
    commissionNumber: commission.commissionNumber,
    coordinators: commission.coordinators.map(serializeUser).filter(isManagedUser),
    id: commission.id,
    interviewIntervals: (commission.interviewIntervals ?? []).map((interval) => ({
      breaks: (interval.breaks ?? []).map((item) => ({
        endTime: normalizeDate(item.endTime),
        startTime: normalizeDate(item.startTime),
      })),
      endDateTime: normalizeDate(interval.endDateTime),
      interviewDuration: interval.interviewDuration ?? null,
      location: normalizeGooglePlace(interval.location),
      pauseBetween: interval.pauseBetween ?? null,
      startDateTime: normalizeDate(interval.startDateTime),
    })),
    label: `Comisia ${commission.commissionNumber}`,
    recruitmentReviews: (commission.recruitmentReviews ?? []).map((review) => ({
      confirmedAt: normalizeDate(review.confirmedAt) || review.confirmedAt,
      coordinatorId: getRelationshipID(review.coordinator),
    })),
  }
}

function serializeApplication(application: Application): ManagedApplication {
  const review = application.reviewProcess ?? {}
  const submission =
    typeof application.formSubmission === 'string' ? null : application.formSubmission
  const answers = getSubmissionAnswers(submission)

  return {
    aspirerUserId: getRelationshipID(review.aspirerUser),
    commissionId: getRelationshipID(review.comission),
    createdAt: application.createdAt,
    email: application.email,
    finalMailSentAt: normalizeDate(review.finalMailSentAt),
    formAnswers: answers,
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

function getSubmissionUploads(submission: FormSubmission | null): ManagedUpload[] {
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
    .filter((upload): upload is ManagedUpload => Boolean(upload))
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

function serializeUser(value: string | User | null | undefined): ManagedUser | null {
  if (!value || typeof value === 'string') return null
  return {
    email: value.email,
    id: value.id,
    name: value.name || value.email,
    role: value.role,
  }
}

function isManagedUser(value: ManagedUser | null): value is ManagedUser {
  return Boolean(value)
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
