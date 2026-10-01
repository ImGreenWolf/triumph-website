import payloadConfig from '@payload-config'
import { randomBytes } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import type { Application, AspirementConfig, Comission, User } from '@/payload-types'
import {
  CUSTOM_MAIL_BODY_MAX_LENGTH,
  CUSTOM_MAIL_SUBJECT_MAX_LENGTH,
  DEFAULT_CUSTOM_MAIL_SENDER,
  getCustomMailFromHeader,
  getCustomMailSenderAddress,
} from '@/utilities/customCandidateMail'
import {
  buildRecruitmentEmailHTML,
  createApplicantParameters,
  generateInterviewSlots,
  generateInterviewScheduleToken,
  getCommissionLabel,
  getInterviewScheduleURL,
  renderRecruitmentMessage,
  renderPlainTextEmailHTML,
  validateInterviewIntervals,
  type RecruitmentApplication,
} from '@/utilities/aspirementRecruitment'
import { isBoardMember } from '@/utilities/membersAccess'
import { getEndOfBucharestDay, getStartOfBucharestDay } from '@/utilities/recruitmentWorkflow'
import { slugify } from 'payload/shared'

type ExtendedReviewProcess = NonNullable<Application['reviewProcess']> & {
  aspirerUser?: string | User | null
  coordonatorReviewChecks?: (string | User)[] | null
  finalMailSentAt?: string | null
  finalMailSentBy?: string | User | null
  interviewScores?: InterviewScoreEntry[] | null
  interviewMailSentAt?: string | null
  interviewMailSentBy?: string | User | null
  interviewNotes?:
    | {
        author: string | User
        createdAt: string
        id?: string | null
        note: string
      }[]
    | null
  formReviewComments?:
    | {
        author: string | User
        comment: string
        createdAt: string
        id?: string | null
      }[]
    | null
  interviewScheduleToken?: string | null
  interviewScheduleTokenCreatedAt?: string | null
  interviewAttendance?: 'scheduled' | 'late' | 'absent' | 'completed' | null
  customMailHistory?:
    | {
        body: string
        id?: string | null
        recipient: string
        senderAddress?: string | null
        sentAt: string
        sentBy: string | User
        subject: string
      }[]
    | null
}

type ExtendedApplication = Application & {
  reviewProcess?: ExtendedReviewProcess
}

type ExtendedCommission = Comission & {
  recruitmentReviews?:
    | {
        confirmedAt: string
        coordinator: string | User
        id?: string | null
      }[]
    | null
}

type ApplicationStatus = NonNullable<NonNullable<Application['reviewProcess']>['status']>

const reviewStatuses = new Set<ApplicationStatus>([
  'coordonator-review',
  'submission-waitlisted',
  'submission-rejected',
])
const finalMailStatuses = new Set<ApplicationStatus>(['interview-passed', 'interview-rejected'])
const finalStatuses = new Set<ApplicationStatus>(['interview-passed', 'interview-rejected'])
const invitationMailStatuses = new Set<ApplicationStatus>([
  'coordonator-review',
  'interview',
  'submission-rejected',
])

type MailBatchResult = {
  failed: number
  failures: {
    email: string
    id: string
    message: string
    name: string
  }[]
  sent: number
  skipped: number
  warnings: string[]
}

type RouteScope = 'commissions' | 'recruitment'

type InterviewScores = {
  comunicare?: number | null
  interact?: number | null
  leadership?: number | null
  situatii?: number | null
  teamPlayer?: number | null
}

type InterviewScoreEntry = InterviewScores & {
  coordinator: string | User
  id?: string | null
}

const interviewScoreKeys = [
  'interact',
  'teamPlayer',
  'situatii',
  'comunicare',
  'leadership',
] as const

const coordinatorActions = new Set([
  'add-note',
  'confirm-review',
  'final-decision',
  'save-interview-scores',
  'set-interview-attendance',
  'toggle-known',
  'update-commission-schedule',
])

export async function PATCH(request: Request) {
  const scope: RouteScope = new URL(request.url).pathname.startsWith('/members/recruitment/')
    ? 'recruitment'
    : 'commissions'
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRequest(request, payload)
  if ('response' in authentication) return authentication.response

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const action = normalizeText(body.action)
  const user = authentication.user

  try {
    assertScopeActionAccess(action, user, scope)

    if (action === 'review-submission') {
      return await reviewSubmission({ body, payload, user })
    }

    if (action === 'delete-application') {
      return await deleteApplication({ body, payload, user })
    }

    if (action === 'bulk-review-submissions') {
      return await bulkReviewSubmissions({ body, payload, user })
    }

    if (action === 'toggle-known') {
      return await toggleKnownApplicant({ body, payload, user })
    }

    if (action === 'confirm-review') {
      return await confirmCoordinatorReview({ body, payload, user })
    }

    if (action === 'assign-candidate') {
      return await assignCandidate({ body, payload, user })
    }

    if (action === 'bulk-assign-candidates') {
      return await bulkAssignCandidates({ body, payload, user })
    }

    if (action === 'update-commission-schedule') {
      return await updateCommissionSchedule({ body, payload, scope, user })
    }

    if (action === 'update-recruitment-config') {
      return await updateRecruitmentConfig({ body, payload, user })
    }

    if (action === 'add-form-comment') {
      return await addFormReviewComment({ body, payload, user })
    }

    if (action === 'add-note') {
      return await addInterviewNote({ body, payload, user })
    }

    if (action === 'save-interview-scores') {
      return await saveInterviewScores({ body, payload, user })
    }

    if (action === 'set-interview-attendance') {
      return await setInterviewAttendance({ body, payload, user })
    }

    if (action === 'final-decision') {
      return await finalDecision({ body, payload, user })
    }

    if (action === 'send-interview-mails') {
      return await sendInterviewMails({ body, payload, request, user })
    }

    if (action === 'send-final-mails') {
      return await sendFinalMails({ body, payload, user })
    }

    if (action === 'send-custom-mail') {
      return await sendCustomCandidateMail({ body, payload, user })
    }

    return Response.json({ message: 'Actiune necunoscuta.' }, { status: 400 })
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Actiunea nu a putut fi salvata.',
      },
      { status: getErrorStatus(error) },
    )
  }
}

async function reviewSubmission(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const status = normalizeText(args.body.status)

  if (!isReviewStatus(status)) {
    return Response.json({ message: 'Selecteaza un status valid.' }, { status: 400 })
  }
  if (
    !['submitted', 'submission-waitlisted'].includes(
      application.reviewProcess?.status ?? 'submitted',
    )
  ) {
    return Response.json(
      { message: 'Doar formularele neprocesate sau din lista de asteptare pot fi revizuite.' },
      { status: 409 },
    )
  }

  const updated = await updateApplicationReview(args.payload, application, {
    notes: normalizeOptionalText(args.body.notes) ?? application.reviewProcess?.notes,
    status,
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function deleteApplication(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))

  await args.payload.delete({
    collection: 'applications',
    id: application.id,
    overrideAccess: true,
  })

  return Response.json({
    deletedApplicationId: application.id,
    message: 'Aplicația a fost ștearsă.',
  })
}

export async function sendCustomCandidateMail(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const subject = normalizeText(args.body.subject)
  const body = normalizeText(args.body.body)

  if (!subject) {
    throw Object.assign(new Error('Adaugă subiectul emailului.'), { status: 400 })
  }
  if (subject.length > CUSTOM_MAIL_SUBJECT_MAX_LENGTH) {
    throw Object.assign(
      new Error(`Subiectul poate avea maximum ${CUSTOM_MAIL_SUBJECT_MAX_LENGTH} de caractere.`),
      { status: 400 },
    )
  }
  if (!body) {
    throw Object.assign(new Error('Adaugă conținutul emailului.'), { status: 400 })
  }
  if (body.length > CUSTOM_MAIL_BODY_MAX_LENGTH) {
    throw Object.assign(new Error('Conținutul poate avea maximum 20.000 de caractere.'), {
      status: 400,
    })
  }

  const recipient = application.email.trim()
  const senderAddress = getCustomMailSenderAddress(args.user)
  const sentAt = new Date().toISOString()
  const emailPayload = {
    from: getCustomMailFromHeader(args.user),
    html: await buildRecruitmentEmailHTML({
      messageHTML: renderPlainTextEmailHTML(body),
      preheader: body.replace(/\s+/g, ' ').slice(0, 140),
      title: subject,
    }),
    replyTo: senderAddress,
    subject,
    text: body,
    to: recipient,
  }

  try {
    const emailResult = await args.payload.sendEmail(emailPayload)

    await createEmailLog(args.payload, {
      action: 'send-custom-mail',
      application,
      emailPayload,
      recipient,
      result: emailResult,
      sentBy: args.user,
      status: 'sent',
      timestamp: sentAt,
    })
  } catch (error) {
    await createEmailLog(args.payload, {
      action: 'send-custom-mail',
      application,
      emailPayload,
      error,
      recipient,
      sentBy: args.user,
      status: 'failed',
      timestamp: sentAt,
    })
    throw error
  }

  const updated = await updateApplicationReview(args.payload, application, {
    customMailHistory: [
      ...(application.reviewProcess?.customMailHistory ?? []),
      {
        body,
        recipient,
        senderAddress,
        sentAt,
        sentBy: args.user.id,
        subject,
      },
    ],
  })

  return Response.json({
    application: serializeApplicationUpdate(updated),
    message: `Email trimis către ${recipient}.`,
  })
}

async function updateRecruitmentConfig(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const config = (await args.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const recruitment = config.recruitment ?? {}
  const recruitmentStartDate = normalizeConfigDate(args.body.recruitmentStartDate)
  const recruitmentEndDate = normalizeConfigDate(args.body.recruitmentEndDate)
  const defaultInterviewDate = normalizeConfigDate(args.body.defaultInterviewDate)
  const interviewSchedulingDeadline = normalizeConfigDate(args.body.interviewSchedulingDeadline)

  const start = getStartOfBucharestDay(recruitmentStartDate)
  const end = getEndOfBucharestDay(recruitmentEndDate)
  if (start && end && start > end) {
    return Response.json(
      { message: 'Data de inceput trebuie sa fie inainte de data finala.' },
      { status: 400 },
    )
  }

  const updated = (await args.payload.updateGlobal({
    slug: 'aspirementConfig',
    data: {
      recruitment: {
        ...recruitment,
        defaultInterviewDate,
        interviewSchedulingDeadline,
        recruitmentEndDate,
        recruitmentStartDate,
      },
    },
    overrideAccess: true,
  })) as AspirementConfig

  return Response.json({
    recruitmentConfig: {
      defaultInterviewDate: updated.recruitment?.defaultInterviewDate ?? null,
      interviewSchedulingDeadline: updated.recruitment?.interviewSchedulingDeadline ?? null,
      reviewAcceptedMessage: updated.recruitment?.['review-accepted-message'] ?? null,
      recruitmentEndDate: updated.recruitment?.recruitmentEndDate ?? null,
      recruitmentStartDate: updated.recruitment?.recruitmentStartDate ?? null,
    },
  })
}

async function bulkReviewSubmissions(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const status = normalizeText(args.body.status)
  if (!isReviewStatus(status)) {
    return Response.json({ message: 'Selecteaza un status valid.' }, { status: 400 })
  }

  const applicationIDs = normalizeStringList(args.body.applicationIds)
  if (applicationIDs.length === 0) {
    return Response.json({ message: 'Selecteaza cel putin un candidat.' }, { status: 400 })
  }

  const result = {
    applications: [] as ReturnType<typeof serializeApplicationUpdate>[],
    failed: 0,
    skipped: 0,
    updated: 0,
    warnings: [] as string[],
  }

  for (const applicationID of applicationIDs) {
    try {
      const application = await getApplication(args.payload, applicationID)

      if (application.reviewProcess?.status && application.reviewProcess.status !== 'submitted') {
        result.skipped += 1
        result.warnings.push(`${application.name}: candidatul nu mai este in etapa de formular.`)
        continue
      }

      const updated = await updateApplicationReview(args.payload, application, {
        notes: normalizeOptionalText(args.body.notes) ?? application.reviewProcess?.notes,
        status,
      })

      result.applications.push(serializeApplicationUpdate(updated))
      result.updated += 1
    } catch (error) {
      result.failed += 1
      result.warnings.push(
        `${applicationID}: ${
          error instanceof Error ? error.message : 'Candidatul nu a putut fi actualizat.'
        }`,
      )
    }
  }

  return Response.json({ bulkReview: result })
}

async function updateCommissionSchedule(args: {
  body: Record<string, unknown>
  payload: Payload
  scope: RouteScope
  user: User
}) {
  const commission = await getCommission(args.payload, normalizeText(args.body.commissionId))
  if (!(await canManageCommissionSchedule(args.payload, commission, args.user, args.scope))) {
    return Response.json(
      { message: 'Nu ai permisiunea de a edita programul acestei comisii.' },
      { status: 403 },
    )
  }

  const intervals = normalizeInterviewIntervals(args.body.interviewIntervals)
  const validation = validateInterviewIntervals(intervals)
  if (!validation.valid && intervals.length > 0) {
    return Response.json(
      { message: validation.errors[0] || 'Programul nu este valid.' },
      { status: 400 },
    )
  }

  const updated = (await args.payload.update({
    collection: 'comissions',
    data: { interviewIntervals: intervals },
    id: commission.id,
    overrideAccess: true,
  })) as ExtendedCommission

  return Response.json({ commission: serializeCommissionUpdate(updated) })
}

async function toggleKnownApplicant(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const coordinatesCommission = await userCoordinatesAnyCommission(args.payload, args.user)

  if (!coordinatesCommission) {
    return Response.json(
      { message: 'Doar coordonatorii pot marca aplicanti cunoscuti.' },
      { status: 403 },
    )
  }

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))

  if (application.reviewProcess?.status !== 'coordonator-review') {
    return Response.json(
      { message: 'Candidatul nu este in etapa de verificare a coordonatorilor.' },
      { status: 409 },
    )
  }

  const currentIDs = new Set(
    (application.reviewProcess.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
  )
  const reviewedIDs = new Set(
    (application.reviewProcess.coordonatorReviewChecks ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
  )
  const known = args.body.known === true

  if (known) currentIDs.add(args.user.id)
  else currentIDs.delete(args.user.id)
  reviewedIDs.add(args.user.id)

  const updated = await updateApplicationReview(args.payload, application, {
    coordonatorIncompatability: [...currentIDs],
    coordonatorReviewChecks: [...reviewedIDs],
  })

  return Response.json({
    application: {
      id: updated.id,
      knownCoordinatorIds: getKnownCoordinatorIDs(updated),
      reviewedCoordinatorIds: getReviewedCoordinatorIDs(updated),
    },
  })
}

async function confirmCoordinatorReview(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const commission = await getCommission(args.payload, normalizeText(args.body.commissionId))

  if (!(await canManageCommission(args.payload, commission, args.user))) {
    return Response.json(
      { message: 'Nu poti confirma verificarea pentru aceasta comisie.' },
      { status: 403 },
    )
  }

  await requireAllCoordinatorReviewApplicantsChecked(args.payload, args.user)

  const reviews = (commission.recruitmentReviews ?? []).filter(
    (review) => getRelationshipID(review.coordinator) !== args.user.id,
  )
  reviews.push({
    confirmedAt: new Date().toISOString(),
    coordinator: args.user.id,
  })

  const updated = (await args.payload.update({
    collection: 'comissions',
    data: {
      recruitmentReviews: reviews,
    },
    id: commission.id,
    overrideAccess: true,
  })) as ExtendedCommission

  return Response.json({
    commission: {
      id: updated.id,
      recruitmentReviews: (updated.recruitmentReviews ?? []).map((review) => ({
        confirmedAt: review.confirmedAt,
        coordinatorId: getRelationshipID(review.coordinator),
      })),
    },
  })
}

async function assignCandidate(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getCommission(args.payload, normalizeText(args.body.commissionId))

  if (application.reviewProcess?.status !== 'coordonator-review') {
    return Response.json(
      { message: 'Candidatul trebuie sa fie in review-ul coordonatorilor.' },
      { status: 409 },
    )
  }

  assertCommissionReadyForApplicant(commission, application)

  const updated = await updateApplicationReview(args.payload, application, {
    comission: commission.id,
    interviewDate: null,
    status: 'interview',
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function bulkAssignCandidates(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const assignments = normalizeAssignmentDraft(args.body.assignments)
  if (assignments.length === 0) {
    return Response.json({ message: 'Selecteaza cel putin o asignare.' }, { status: 400 })
  }

  const updatedApplications: ReturnType<typeof serializeApplicationUpdate>[] = []
  const warnings: string[] = []
  let skipped = 0

  for (const assignment of assignments) {
    try {
      const application = await getApplication(args.payload, assignment.applicationId)
      const commission = await getCommission(args.payload, assignment.commissionId)
      const status = application.reviewProcess?.status

      if (!['coordonator-review', 'interview'].includes(status ?? '')) {
        throw Object.assign(
          new Error('Candidatul trebuie sa fie acceptat la review sau in etapa de interview.'),
          { status: 409 },
        )
      }

      assertCommissionReadyForApplicant(commission, application)

      const currentCommissionID = getRelationshipID(application.reviewProcess?.comission)
      if (status === 'interview' && currentCommissionID === commission.id) {
        skipped += 1
        continue
      }

      const updated = await updateApplicationReview(args.payload, application, {
        comission: commission.id,
        interviewDate: null,
        status: 'interview',
      })

      updatedApplications.push(serializeApplicationUpdate(updated))
    } catch (error) {
      warnings.push(
        `${assignment.applicationId}: ${
          error instanceof Error ? error.message : 'Candidatul nu a putut fi asignat.'
        }`,
      )
    }
  }

  const message = `${updatedApplications.length} candidati asignati.${skipped ? ` ${skipped} fara schimbari.` : ''}${warnings.length ? ` ${warnings.length} esuate: ${warnings[0]}` : ''}`
  return Response.json({ applications: updatedApplications, message })
}

async function addInterviewNote(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)

  if (!(await canManageAssignedApplication(args.payload, commission, args.user))) {
    return Response.json(
      { message: 'Nu ai permisiunea de a nota acest candidat.' },
      { status: 403 },
    )
  }

  const note = normalizeText(args.body.note)
  if (!note || note.length > 2000) {
    return Response.json(
      { message: 'Nota trebuie sa aiba intre 1 si 2000 caractere.' },
      { status: 400 },
    )
  }

  const updated = await updateApplicationReview(args.payload, application, {
    interviewNotes: [
      ...(application.reviewProcess?.interviewNotes ?? []),
      {
        author: args.user.id,
        createdAt: new Date().toISOString(),
        note,
      },
    ],
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function saveInterviewScores(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)

  if (!isCommissionCoordinator(commission, args.user)) {
    return Response.json(
      { message: 'Doar coordonatorii comisiei pot salva evaluarea.' },
      { status: 403 },
    )
  }

  const scores = normalizeInterviewScores(args.body.scores)
  const existingScores = normalizeInterviewScoreEntries(application.reviewProcess?.interviewScores)
  const updated = await updateApplicationReview(args.payload, application, {
    interviewScores: [
      ...existingScores.filter((entry) => getRelationshipID(entry.coordinator) !== args.user.id),
      {
        coordinator: args.user.id,
        ...scores,
      },
    ],
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function addFormReviewComment(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)

  const comment = normalizeText(args.body.comment)
  if (!comment || comment.length > 2000) {
    return Response.json(
      { message: 'Comentariul trebuie sa aiba intre 1 si 2000 caractere.' },
      { status: 400 },
    )
  }

  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const updated = await updateApplicationReview(args.payload, application, {
    formReviewComments: [
      ...(application.reviewProcess?.formReviewComments ?? []),
      {
        author: args.user.id,
        comment,
        createdAt: new Date().toISOString(),
      },
    ],
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function setInterviewAttendance(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)
  if (!(await canManageAssignedApplication(args.payload, commission, args.user))) {
    return Response.json({ message: 'Nu ai permisiunea de a actualiza prezenta.' }, { status: 403 })
  }

  const attendanceValue = normalizeText(args.body.attendance)
  if (!['late', 'absent', 'completed'].includes(attendanceValue)) {
    return Response.json({ message: 'Selecteaza un status de prezenta valid.' }, { status: 400 })
  }
  const attendance = attendanceValue as 'late' | 'absent' | 'completed'
  if (application.reviewProcess?.status !== 'interview') {
    return Response.json({ message: 'Interview-ul nu mai poate fi actualizat.' }, { status: 409 })
  }

  if (attendance === 'late' && !application.reviewProcess?.interviewDate) {
    return Response.json(
      { message: 'Doar un candidat programat poate fi marcat intarziat.' },
      { status: 409 },
    )
  }
  if (attendance === 'completed' && !application.reviewProcess?.interviewDate) {
    return Response.json(
      { message: 'Candidatul trebuie programat pentru a finaliza interview-ul.' },
      { status: 409 },
    )
  }
  if (attendance === 'absent' && !application.reviewProcess?.interviewDate) {
    const config = await args.payload.findGlobal({
      slug: 'aspirementConfig',
      depth: 0,
      overrideAccess: true,
    })
    const deadlineValue = config.recruitment?.interviewSchedulingDeadline
    const deadline = deadlineValue ? new Date(deadlineValue) : null
    if (!deadline || Number.isNaN(deadline.getTime()) || deadline > new Date()) {
      return Response.json(
        { message: 'Un candidat neprogramat poate fi marcat absent doar dupa deadline.' },
        { status: 409 },
      )
    }
  }

  const updated = await updateApplicationReview(args.payload, application, {
    interviewAttendance: attendance,
    status:
      attendance === 'completed' ? 'interviewed' : attendance === 'absent' ? 'absent' : 'interview',
  })

  return Response.json({ application: serializeApplicationUpdate(updated) })
}

async function finalDecision(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)

  if (!(await canManageAssignedApplication(args.payload, commission, args.user))) {
    return Response.json(
      { message: 'Nu ai permisiunea de a decide pentru acest candidat.' },
      { status: 403 },
    )
  }

  const status = normalizeText(args.body.status)
  if (!isFinalStatus(status)) {
    return Response.json({ message: 'Selecteaza o decizie valida.' }, { status: 400 })
  }

  if (!['interviewed', 'absent'].includes(application.reviewProcess?.status ?? '')) {
    return Response.json(
      {
        message: 'Decizia finala este disponibila doar dupa finalizarea sau absenta la interview.',
      },
      { status: 409 },
    )
  }
  await assertCommissionInterviewRoundComplete(args.payload, commission)

  const updated = await updateApplicationReview(args.payload, application, {
    status,
  })

  return Response.json({
    application: serializeApplicationUpdate(updated),
  })
}

async function sendInterviewMails(args: {
  body: Record<string, unknown>
  payload: Payload
  request: Request
  user: User
}) {
  requireBoard(args.user)

  const config = (await args.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const schedulingDeadline = config.recruitment?.interviewSchedulingDeadline
  const applicationId = normalizeOptionalText(args.body.applicationId)
  const includeAcceptedReviewCandidates =
    args.body.debugIncludeAcceptedReviewCandidates === true && args.user.role === 'pr-director'
  const applications = await findApplicationsForMailBatch(args.payload, {
    applicationId,
    status: includeAcceptedReviewCandidates
      ? ['coordonator-review', 'interview', 'submission-rejected']
      : ['interview', 'submission-rejected'],
  })
  const pending = applicationId
    ? applications
    : applications.filter((application) => !application.reviewProcess?.interviewMailSentAt)
  const result = createMailBatchResult(applications.length - pending.length)
  const updatedApplications: ReturnType<typeof serializeApplicationUpdate>[] = []
  const hasInterviewInvite = pending.some(
    (application) => application.reviewProcess?.status === 'interview',
  )

  if (hasInterviewInvite && (!schedulingDeadline || new Date(schedulingDeadline) <= new Date())) {
    return Response.json(
      { message: 'Configureaza un deadline viitor pentru programarea interview-urilor.' },
      { status: 409 },
    )
  }

  for (const application of pending) {
    try {
      const accepted = ['coordonator-review', 'interview'].includes(
        application.reviewProcess?.status ?? '',
      )
      const schedulesInterview = application.reviewProcess?.status === 'interview'
      let message: ReturnType<typeof renderRecruitmentMessage>
      let prepared = application
      let scheduleLink = ''

      if (schedulesInterview) {
        const commission = await getApplicationCommission(args.payload, application)
        assertCommissionReadyForApplicant(commission, application)
        const scheduleValidation = validateInterviewIntervals(commission.interviewIntervals)
        if (!scheduleValidation.valid) {
          throw Object.assign(
            new Error(scheduleValidation.errors[0] || 'Programul comisiei nu este valid.'),
            {
              status: 409,
            },
          )
        }
        await assertCommissionHasInterviewCapacity(args.payload, commission)

        prepared = await ensureApplicationScheduleToken(args.payload, application)
        const token = prepared.reviewProcess?.interviewScheduleToken
        if (!token) throw new Error('Nu s-a putut genera linkul de programare.')

        scheduleLink = getInterviewScheduleURL(token, args.request)
        message = renderRecruitmentMessage({
          fallback:
            'Ai fost acceptat pentru etapa de interview. Te rugam sa iti alegi un interval pentru programare.',
          message: config.recruitment?.['review-accepted-message'],
          parameters: createApplicantParameters({
            application: prepared,
            commissionLabel: getCommissionLabel(commission),
            scheduleLink,
          }),
        })
      } else if (accepted) {
        message = renderRecruitmentMessage({
          fallback:
            'Ai fost acceptat mai departe dupa review-ul formularului. Te vom contacta cu detalii despre urmatoarea etapa.',
          message: config.recruitment?.['review-accepted-message'],
          parameters: createApplicantParameters({
            application,
            commissionLabel: getCommissionLabel(application.reviewProcess?.comission),
          }),
        })
      } else {
        message = renderRecruitmentMessage({
          fallback:
            'Iti multumim pentru aplicatie. Din pacate, nu ai fost acceptat mai departe dupa review-ul formularului.',
          message: config.recruitment?.['review-rejected-message'],
          parameters: createApplicantParameters({
            application,
            commissionLabel: getCommissionLabel(application.reviewProcess?.comission),
          }),
        })
      }

      const emailPayload = {
        html: await buildRecruitmentEmailHTML({
          cta: schedulesInterview
            ? {
                href: scheduleLink,
                label: 'Programează interview-ul',
              }
            : undefined,
          messageHTML: message.html,
          preheader: schedulesInterview
            ? 'Programează-ți intervieul.'
            : accepted
              ? 'Ai trecut mai departe in procesul de selectie.'
              : 'Avem un update despre aplicația ta.',
          title: 'Update cu privire la aplicația ta pentru clubul Interact București Triumph',
        }),
        subject: 'Update cu privire la aplicația ta pentru clubul Interact București Triumph.',
        text: schedulesInterview ? `${message.text}\n\nProgramare: ${scheduleLink}` : message.text,
        to: application.email,
      }
      const sentAt = new Date().toISOString()
      const emailResult = await args.payload.sendEmail(emailPayload)

      await createEmailLog(args.payload, {
        action: 'send-interview-mails',
        application: prepared,
        emailPayload,
        extra: {
          accepted,
          schedulesInterview,
          scheduleLink: scheduleLink || null,
          unresolvedPlaceholders: message.unresolvedPlaceholders,
        },
        recipient: application.email,
        result: emailResult,
        sentBy: args.user,
        status: 'sent',
        timestamp: sentAt,
      })

      const updated = await updateApplicationReview(args.payload, prepared, {
        interviewMailSentAt: sentAt,
        interviewMailSentBy: args.user.id,
      })

      updatedApplications.push(serializeApplicationUpdate(updated))
      result.sent += 1
      addPlaceholderWarnings(result, prepared, message.unresolvedPlaceholders)
    } catch (error) {
      const eligibilityError = isEligibilityError(error)
      await createEmailLog(args.payload, {
        action: 'send-interview-mails',
        application,
        error,
        recipient: application.email,
        sentBy: args.user,
        status: eligibilityError ? 'skipped' : 'failed',
      })

      if (isEligibilityError(error)) {
        result.skipped += 1
        result.warnings.push(
          `${application.name} (${application.email}): ${
            error instanceof Error ? error.message : 'Candidatul nu este eligibil pentru email.'
          }`,
        )
        continue
      }

      result.failed += 1
      result.failures.push({
        email: application.email,
        id: application.id,
        message: error instanceof Error ? error.message : 'Emailul nu a putut fi trimis.',
        name: application.name,
      })
    }
  }

  return Response.json({ applications: updatedApplications, mailBatch: result })
}

async function sendFinalMails(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  requireBoard(args.user)
  await assertAllInterviewRoundsComplete(args.payload)

  const applicationId = normalizeOptionalText(args.body.applicationId)
  const config = (await args.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const applications = await findApplicationsForMailBatch(args.payload, {
    applicationId,
    status: ['interview-passed', 'interview-rejected'],
  })
  const pending = applicationId
    ? applications
    : applications.filter((application) => !application.reviewProcess?.finalMailSentAt)
  const result = createMailBatchResult(applications.length - pending.length)
  const updatedApplications: ReturnType<typeof serializeApplicationUpdate>[] = []

  for (const application of pending) {
    try {
      const accepted = application.reviewProcess?.status === 'interview-passed'
      const message = renderRecruitmentMessage({
        fallback: accepted
          ? 'Update cu privire la aplicația ta pentru clubul Interact București Triumph.'
          : 'Update cu privire la aplicația ta pentru clubul Interact București Triumph.',
        message: accepted
          ? config.recruitment?.['interview-accepted-message']
          : config.recruitment?.['interview-rejected-message'],
        parameters: createApplicantParameters({
          application,
          commissionLabel: getCommissionLabel(application.reviewProcess?.comission),
        }),
      })

      const emailPayload = {
        html: await buildRecruitmentEmailHTML({
          messageHTML: message.html,
          preheader: 'Update cu privire la aplicația ta pentru clubul Interact București Triumph',
          title: 'Update cu privire la aplicația ta pentru clubul Interact București Triumph',
        }),
        subject: 'Update cu privire la aplicația ta pentru clubul Interact București Triumph',
        text: message.text,
        to: application.email,
      }
      const sentAt = new Date().toISOString()
      const emailResult = await args.payload.sendEmail(emailPayload)

      await createEmailLog(args.payload, {
        action: 'send-final-mails',
        application,
        emailPayload,
        extra: {
          accepted,
          unresolvedPlaceholders: message.unresolvedPlaceholders,
        },
        recipient: application.email,
        result: emailResult,
        sentBy: args.user,
        status: 'sent',
        timestamp: sentAt,
      })

      let aspirerUserId = getRelationshipID(application.reviewProcess?.aspirerUser)

      if (accepted) {
        const commission = await getApplicationCommission(args.payload, application)
        const aspirerUser = await ensureAspirerUser({
          application,
          commission,
          payload: args.payload,
        })
        aspirerUserId = aspirerUser.id
      }

      const updated = await updateApplicationReview(args.payload, application, {
        aspirerUser: aspirerUserId || undefined,
        finalMailSentAt: sentAt,
        finalMailSentBy: args.user.id,
      })

      updatedApplications.push(serializeApplicationUpdate(updated))
      result.sent += 1
      addPlaceholderWarnings(result, application, message.unresolvedPlaceholders)
    } catch (error) {
      await createEmailLog(args.payload, {
        action: 'send-final-mails',
        application,
        error,
        recipient: application.email,
        sentBy: args.user,
        status: 'failed',
      })

      result.failed += 1
      result.failures.push({
        email: application.email,
        id: application.id,
        message: error instanceof Error ? error.message : 'Emailul nu a putut fi trimis.',
        name: application.name,
      })
    }
  }

  return Response.json({ applications: updatedApplications, mailBatch: result })
}

async function ensureAspirerUser(args: {
  application: ExtendedApplication
  commission: ExtendedCommission
  payload: Payload
}) {
  const email = args.application.email.trim().toLocaleLowerCase('ro')
  const existing = await args.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        equals: email,
      },
    },
  })
  const user =
    (existing.docs[0] as User | undefined) ??
    ((await args.payload.create({
      collection: 'users',
      data: {
        email,
        joinedAt: new Date().toISOString(),
        name: args.application.name,
        password: generateTemporaryPassword(),
        role: 'aspirer',
        slug: slugify(args.application.name)!,
      },
      overrideAccess: true,
    })) as User)

  const aspirerIDs = new Set(
    (args.commission.aspirers ?? []).map(getRelationshipID).filter(Boolean),
  )
  aspirerIDs.add(user.id)

  await args.payload.update({
    collection: 'comissions',
    data: {
      aspirers: [...aspirerIDs],
    },
    id: args.commission.id,
    overrideAccess: true,
  })

  return user
}

async function getApplication(payload: Payload, id: string) {
  if (!id) throw Object.assign(new Error('Selecteaza un candidat valid.'), { status: 400 })

  try {
    return (await payload.findByID({
      collection: 'applications',
      depth: 0,
      id,
      overrideAccess: true,
    })) as ExtendedApplication
  } catch {
    throw Object.assign(new Error('Candidatul nu a fost gasit.'), { status: 404 })
  }
}

async function getCommission(payload: Payload, id: string) {
  if (!id) throw Object.assign(new Error('Selecteaza o comisie valida.'), { status: 400 })

  try {
    return (await payload.findByID({
      collection: 'comissions',
      depth: 0,
      id,
      overrideAccess: true,
    })) as ExtendedCommission
  } catch {
    throw Object.assign(new Error('Comisia nu a fost gasita.'), { status: 404 })
  }
}

async function getApplicationCommission(payload: Payload, application: ExtendedApplication) {
  const commissionID = getRelationshipID(application.reviewProcess?.comission)
  if (!commissionID)
    throw Object.assign(new Error('Candidatul nu este asignat unei comisii.'), { status: 400 })

  return getCommission(payload, commissionID)
}

async function assertCommissionInterviewRoundComplete(
  payload: Payload,
  commission: ExtendedCommission,
) {
  const result = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { 'reviewProcess.comission': { equals: commission.id } },
        { 'reviewProcess.status': { equals: 'interview' } },
      ],
    },
  })
  if (result.docs.length > 0) {
    throw Object.assign(
      new Error('Toate interview-urile comisiei trebuie rezolvate inainte de decizii.'),
      {
        status: 409,
      },
    )
  }
}

async function assertAllInterviewRoundsComplete(payload: Payload) {
  const result = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: {
      'reviewProcess.status': { in: ['interview', 'interviewed', 'absent'] },
    },
  })
  if (result.docs.length > 0) {
    throw Object.assign(new Error('Exista candidati fara decizie finala.'), { status: 409 })
  }
}

async function updateApplicationReview(
  payload: Payload,
  application: ExtendedApplication,
  data: Partial<ExtendedReviewProcess>,
) {
  return (await payload.update({
    collection: 'applications',
    data: {
      reviewProcess: {
        ...(application.reviewProcess ?? {}),
        ...data,
      },
    },
    id: application.id,
    overrideAccess: true,
  })) as ExtendedApplication
}

async function findApplicationsForMailBatch(
  payload: Payload,
  args: { applicationId?: string | null; status: ApplicationStatus | ApplicationStatus[] },
) {
  const statusWhere = {
    'reviewProcess.status': Array.isArray(args.status)
      ? {
          in: args.status,
        }
      : {
          equals: args.status,
        },
  }
  const result = await payload.find({
    collection: 'applications',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: args.applicationId
      ? {
          and: [
            {
              id: {
                equals: args.applicationId,
              },
            },
            statusWhere,
          ],
        }
      : statusWhere,
  })

  const applications = result.docs.filter(isRecruitmentApplication)
  if (args.applicationId && applications.length === 0) {
    throw Object.assign(new Error('Candidatul nu este eligibil pentru acest email.'), {
      status: 404,
    })
  }

  return applications
}

async function ensureApplicationScheduleToken(
  payload: Payload,
  application: RecruitmentApplication,
) {
  if (application.reviewProcess?.interviewScheduleToken) return application

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateInterviewScheduleToken()
    const existing = await payload.find({
      collection: 'applications',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        'reviewProcess.interviewScheduleToken': {
          equals: token,
        },
      },
    })

    if (existing.docs.length > 0) continue

    return (await updateApplicationReview(payload, application, {
      interviewScheduleToken: token,
      interviewScheduleTokenCreatedAt: new Date().toISOString(),
    })) as RecruitmentApplication
  }

  throw new Error('Nu s-a putut genera un token unic de programare.')
}

function createMailBatchResult(skipped: number): MailBatchResult {
  return {
    failed: 0,
    failures: [],
    sent: 0,
    skipped,
    warnings: [],
  }
}

function addPlaceholderWarnings(
  result: MailBatchResult,
  application: Pick<Application, 'email' | 'name'>,
  placeholders: string[],
) {
  if (placeholders.length === 0) return

  result.warnings.push(
    `${application.name} (${application.email}): placeholders fara valoare: ${placeholders.join(', ')}.`,
  )
}

async function createEmailLog(
  payload: Payload,
  args: {
    action: string
    application?: Pick<Application, 'email' | 'id' | 'name'> | null
    emailPayload?: unknown
    error?: unknown
    extra?: Record<string, unknown>
    recipient: string
    result?: unknown
    sentBy?: Pick<User, 'email' | 'id' | 'name' | 'role'> | null
    status: 'failed' | 'sent' | 'skipped'
    timestamp?: string
  },
) {
  const timestamp = args.timestamp ?? new Date().toISOString()

  try {
    await payload.create({
      collection: 'logs',
      data: {
        text: stringifyLogData({
          action: args.action,
          application: args.application
            ? {
                email: args.application.email,
                id: args.application.id,
                name: args.application.name,
              }
            : null,
          email: args.emailPayload ?? null,
          error: args.error ? serializeLogError(args.error) : null,
          extra: args.extra ?? null,
          recipient: args.recipient,
          result: args.result ?? null,
          sentBy: args.sentBy
            ? {
                email: args.sentBy.email,
                id: args.sentBy.id,
                name: args.sentBy.name,
                role: args.sentBy.role,
              }
            : null,
          status: args.status,
          timestamp,
        }),
        title: `${args.recipient} - ${timestamp}`,
        type: 'email',
      },
      overrideAccess: true,
    })
  } catch (error) {
    console.error('Failed to create email log', error)
  }
}

function stringifyLogData(data: unknown) {
  const seen = new WeakSet<object>()

  return JSON.stringify(
    data,
    (_key, value: unknown) => {
      if (value instanceof Error) return serializeLogError(value)
      if (typeof value === 'bigint') return value.toString()
      if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`

      if (value && typeof value === 'object') {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
      }

      return value
    },
    2,
  )
}

function serializeLogError(error: unknown) {
  if (error instanceof Error) {
    return {
      ...Object.fromEntries(Object.entries(error)),
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  return error
}

async function authenticateRequest(request: Request, payload: Payload) {
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

async function userCoordinatesAnyCommission(payload: Payload, user: User) {
  const result = await payload.find({
    collection: 'comissions',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      coordinators: {
        contains: user.id,
      },
    },
  })

  return result.docs.length > 0
}

async function requireAllCoordinatorReviewApplicantsChecked(payload: Payload, user: User) {
  const result = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: {
      'reviewProcess.status': {
        equals: 'coordonator-review',
      },
    },
  })
  const uncheckedCount = (result.docs as ExtendedApplication[]).filter(
    (application) => !getReviewedCoordinatorIDs(application).includes(user.id),
  ).length

  if (uncheckedCount > 0) {
    throw Object.assign(new Error(`Mai ai ${uncheckedCount} aplicanti fara o optiune selectata.`), {
      status: 409,
    })
  }
}

async function canManageAssignedApplication(
  payload: Payload,
  commission: ExtendedCommission,
  user: User,
) {
  return canManageCommission(payload, commission, user)
}

async function canManageCommissionSchedule(
  payload: Payload,
  commission: ExtendedCommission,
  user: User,
  scope: RouteScope,
) {
  if (scope === 'recruitment') return isBoardMember(user)
  return canManageCommission(payload, commission, user)
}

async function canManageCommission(payload: Payload, commission: ExtendedCommission, user: User) {
  if (isCommissionCoordinator(commission, user)) return true
  if (user.role !== 'hr-director') return false

  return userCoordinatesAnyCommission(payload, user)
}

function assertCommissionReadyForApplicant(
  commission: ExtendedCommission,
  application: ExtendedApplication,
) {
  const coordinatorIDs = (commission.coordinators ?? []).map(getRelationshipID).filter(Boolean)

  if (coordinatorIDs.length === 0) {
    throw Object.assign(new Error('Comisia nu are coordonatori configurati.'), { status: 400 })
  }

  const completedCoordinatorIDs = new Set(
    (commission.recruitmentReviews ?? []).map((review) => getRelationshipID(review.coordinator)),
  )
  const pendingCoordinatorCount = coordinatorIDs.filter(
    (coordinatorID) => !completedCoordinatorIDs.has(coordinatorID),
  ).length

  if (pendingCoordinatorCount > 0) {
    throw Object.assign(
      new Error('Toti coordonatorii comisiei trebuie sa finalizeze review-ul inainte de asignare.'),
      { status: 409 },
    )
  }

  const knownCoordinatorIDs = new Set(getKnownCoordinatorIDs(application))
  const conflictCount = coordinatorIDs.filter((coordinatorID) =>
    knownCoordinatorIDs.has(coordinatorID),
  ).length

  if (conflictCount > 0) {
    throw Object.assign(
      new Error(
        'Candidatul nu poate fi asignat la o comisie unde un coordonator l-a marcat cunoscut.',
      ),
      { status: 409 },
    )
  }
}

async function assertCommissionHasInterviewCapacity(
  payload: Payload,
  commission: ExtendedCommission,
) {
  const slotCount = generateInterviewSlots(commission.interviewIntervals).length
  const assignedResult = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { 'reviewProcess.comission': { equals: commission.id } },
        { 'reviewProcess.status': { equals: 'interview' } },
      ],
    },
  })
  const assignedCount = assignedResult.totalDocs ?? assignedResult.docs.length

  if (slotCount < assignedCount) {
    throw Object.assign(
      new Error(
        `${getCommissionLabel(commission)} are ${slotCount} sloturi pentru ${assignedCount} candidati.`,
      ),
      { status: 409 },
    )
  }
}

function isCommissionCoordinator(commission: ExtendedCommission, user: User) {
  return (commission.coordinators ?? []).some(
    (coordinator) => getRelationshipID(coordinator) === user.id,
  )
}

function requireBoard(user: User) {
  if (!isBoardMember(user)) {
    throw Object.assign(new Error('Doar boardul poate face aceasta actiune.'), { status: 403 })
  }
}

function assertScopeActionAccess(action: string, user: User, scope: RouteScope) {
  if (scope === 'recruitment') {
    if (!isBoardMember(user)) {
      throw Object.assign(new Error('Doar boardul poate face aceasta actiune.'), {
        status: 403,
      })
    }
    return
  }

  if (!coordinatorActions.has(action)) {
    throw Object.assign(new Error('Aceasta actiune este disponibila numai in panoul HR.'), {
      status: 403,
    })
  }
}

function isReviewStatus(value: string): value is ApplicationStatus {
  return reviewStatuses.has(value as ApplicationStatus)
}

function isFinalStatus(value: string): value is ApplicationStatus {
  return finalStatuses.has(value as ApplicationStatus)
}

function isRecruitmentApplication(application: Application): application is RecruitmentApplication {
  const status = application.reviewProcess?.status
  return (
    status === 'interview' ||
    (status ? finalMailStatuses.has(status) || invitationMailStatuses.has(status) : false)
  )
}

function serializeApplicationUpdate(application: ExtendedApplication) {
  return {
    aspirerUserId: getRelationshipID(application.reviewProcess?.aspirerUser),
    commissionId: getRelationshipID(application.reviewProcess?.comission),
    customMailHistory: (application.reviewProcess?.customMailHistory ?? []).map((mail) => ({
      body: mail.body,
      id: mail.id ?? `${mail.sentAt}-${mail.recipient}`,
      recipient: mail.recipient,
      senderAddress: mail.senderAddress ?? DEFAULT_CUSTOM_MAIL_SENDER,
      sentAt: mail.sentAt,
      sentById: getRelationshipID(mail.sentBy),
      subject: mail.subject,
    })),
    finalMailSentAt: application.reviewProcess?.finalMailSentAt ?? null,
    id: application.id,
    interviewDate: application.reviewProcess?.interviewDate ?? null,
    interviewAttendance: application.reviewProcess?.interviewAttendance ?? null,
    interviewMailSentAt: application.reviewProcess?.interviewMailSentAt ?? null,
    formReviewComments: (application.reviewProcess?.formReviewComments ?? []).map((comment) => ({
      authorId: getRelationshipID(comment.author),
      comment: comment.comment,
      createdAt: comment.createdAt,
      id: comment.id ?? `${getRelationshipID(comment.author)}-${comment.createdAt}`,
    })),
    interviewNotes: (application.reviewProcess?.interviewNotes ?? []).map((note) => ({
      authorId: getRelationshipID(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    interviewScores: serializeInterviewScores(application.reviewProcess?.interviewScores),
    knownCoordinatorIds: getKnownCoordinatorIDs(application),
    notes: application.reviewProcess?.notes ?? '',
    onlineInterview: Boolean(application.reviewProcess?.onlineInterview),
    reviewedCoordinatorIds: getReviewedCoordinatorIDs(application),
    status: application.reviewProcess?.status ?? 'submitted',
  }
}

function serializeCommissionUpdate(commission: ExtendedCommission) {
  return {
    id: commission.id,
    interviewIntervals: (commission.interviewIntervals ?? []).map((interval) => ({
      breaks: (interval.breaks ?? []).map((item) => ({
        endTime: item.endTime ?? null,
        startTime: item.startTime ?? null,
      })),
      endDateTime: interval.endDateTime ?? null,
      interviewDuration: interval.interviewDuration ?? null,
      location: interval.location ?? null,
      onlineInterview: Boolean(interval.onlineInterview),
      pauseBetween: interval.pauseBetween ?? null,
      startDateTime: interval.startDateTime ?? null,
    })),
    recruitmentReviews: (commission.recruitmentReviews ?? []).map((review) => ({
      confirmedAt: review.confirmedAt,
      coordinatorId: getRelationshipID(review.coordinator),
    })),
  }
}

function serializeInterviewScores(value?: InterviewScoreEntry[] | null) {
  return normalizeInterviewScoreEntries(value)
    .map((entry) => ({
      coordinatorId: getRelationshipID(entry.coordinator),
      ...normalizeInterviewScores(entry),
    }))
    .filter((entry) => Boolean(entry.coordinatorId))
}

function getKnownCoordinatorIDs(application: ExtendedApplication) {
  return (application.reviewProcess?.coordonatorIncompatability ?? [])
    .map(getRelationshipID)
    .filter(Boolean)
}

function getReviewedCoordinatorIDs(application: ExtendedApplication) {
  return (application.reviewProcess?.coordonatorReviewChecks ?? [])
    .map(getRelationshipID)
    .filter(Boolean)
}

function getRelationshipID(value: unknown) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id
  return ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value)
  return text || undefined
}

function normalizeAssignmentDraft(value: unknown) {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const assignments: Array<{ applicationId: string; commissionId: string }> = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue

    const applicationId = normalizeText((item as Record<string, unknown>).applicationId)
    const commissionId = normalizeText((item as Record<string, unknown>).commissionId)
    if (!applicationId || !commissionId || seen.has(applicationId)) continue

    seen.add(applicationId)
    assignments.push({ applicationId, commissionId })
  }

  return assignments.slice(0, 500)
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map(normalizeText).filter(Boolean)
}

function normalizeInterviewIntervals(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const interval = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const breaks = Array.isArray(interval.breaks)
      ? interval.breaks.map((breakItem) => {
          const entry =
            breakItem && typeof breakItem === 'object' ? (breakItem as Record<string, unknown>) : {}
          return {
            endTime: normalizeOptionalText(entry.endTime) ?? null,
            startTime: normalizeOptionalText(entry.startTime) ?? null,
          }
        })
      : []

    return {
      breaks,
      endDateTime: normalizeOptionalText(interval.endDateTime) ?? null,
      interviewDuration: normalizeNumber(interval.interviewDuration),
      location: interval.location ?? null,
      onlineInterview: interval.onlineInterview === true,
      pauseBetween: normalizeNumber(interval.pauseBetween) ?? 0,
      startDateTime: normalizeOptionalText(interval.startDateTime) ?? null,
    }
  })
}

function normalizeInterviewScores(value: unknown): InterviewScores {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return Object.fromEntries(
    interviewScoreKeys.map((key) => [key, normalizeInterviewScore(input[key])]),
  ) as InterviewScores
}

function normalizeInterviewScoreEntries(value: unknown): InterviewScoreEntry[] {
  if (!Array.isArray(value)) return []

  const entries: InterviewScoreEntry[] = []

  value.forEach((item) => {
    const entry = item && typeof item === 'object' ? (item as InterviewScoreEntry) : null
    const coordinator = getRelationshipID(entry?.coordinator)
    if (!entry || !coordinator) return

    entries.push({
      coordinator,
      ...normalizeInterviewScores(entry),
    })
  })

  return entries
}

function normalizeInterviewScore(value: unknown) {
  if (value === null || value === '') return null

  const score = normalizeNumber(value)
  if (score === null) return null

  return Math.min(10, Math.max(0, score))
}

function normalizeNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeConfigDate(value: unknown) {
  if (value === null || value === '') return null
  if (typeof value !== 'string') return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function generateTemporaryPassword() {
  return randomBytes(18).toString('base64url')
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) return 400
  const status = Number(error.status)
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 400
}

function isEligibilityError(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) return false

  const status = Number(error.status)
  return status === 400 || status === 409
}
