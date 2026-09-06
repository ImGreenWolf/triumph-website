import payloadConfig from '@payload-config'
import { randomBytes } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import type { Application, AspirementConfig, Comission, User } from '@/payload-types'
import {
  buildRecruitmentEmailHTML,
  createApplicantParameters,
  generateInterviewScheduleToken,
  getCommissionLabel,
  getInterviewScheduleURL,
  renderRecruitmentMessage,
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
  interviewScheduleToken?: string | null
  interviewScheduleTokenCreatedAt?: string | null
  interviewAttendance?: 'scheduled' | 'late' | 'absent' | 'completed' | null
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

const coordinatorActions = new Set([
  'add-note',
  'confirm-review',
  'final-decision',
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

    if (action === 'update-commission-schedule') {
      return await updateCommissionSchedule({ body, payload, scope, user })
    }

    if (action === 'update-recruitment-config') {
      return await updateRecruitmentConfig({ body, payload, user })
    }

    if (action === 'add-note') {
      return await addInterviewNote({ body, payload, user })
    }

    if (action === 'set-interview-attendance') {
      return await setInterviewAttendance({ body, payload, user })
    }

    if (action === 'final-decision') {
      return await finalDecision({ body, payload, user })
    }

    if (action === 'send-interview-mails') {
      return await sendInterviewMails({ payload, request, user })
    }

    if (action === 'send-final-mails') {
      return await sendFinalMails({ payload, user })
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
  if (!canManageCommissionSchedule(commission, args.user, args.scope)) {
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

  if (!isCommissionCoordinator(commission, args.user)) {
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

async function addInterviewNote(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)

  if (!canManageAssignedApplication(commission, args.user)) {
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

async function setInterviewAttendance(args: {
  body: Record<string, unknown>
  payload: Payload
  user: User
}) {
  const application = await getApplication(args.payload, normalizeText(args.body.applicationId))
  const commission = await getApplicationCommission(args.payload, application)
  if (!canManageAssignedApplication(commission, args.user)) {
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

  if (!canManageAssignedApplication(commission, args.user)) {
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

async function sendInterviewMails(args: { payload: Payload; request: Request; user: User }) {
  requireBoard(args.user)

  const config = (await args.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const schedulingDeadline = config.recruitment?.interviewSchedulingDeadline
  if (!schedulingDeadline || new Date(schedulingDeadline) <= new Date()) {
    return Response.json(
      { message: 'Configureaza un deadline viitor pentru programarea interview-urilor.' },
      { status: 409 },
    )
  }
  const applications = await findApplicationsForMailBatch(args.payload, {
    status: 'interview',
  })
  const pending = applications.filter(
    (application) => !application.reviewProcess?.interviewMailSentAt,
  )
  const result = createMailBatchResult(applications.length - pending.length)

  for (const application of pending) {
    try {
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

      const prepared = await ensureApplicationScheduleToken(args.payload, application)
      const token = prepared.reviewProcess?.interviewScheduleToken
      if (!token) throw new Error('Nu s-a putut genera linkul de programare.')

      const scheduleLink = getInterviewScheduleURL(token, args.request)
      const message = renderRecruitmentMessage({
        fallback:
          'Ai fost acceptat pentru etapa de interview. Te rugam sa iti alegi un interval pentru programare.',
        message: config.recruitment?.['review-accepted-message'],
        parameters: createApplicantParameters({
          application: prepared,
          commissionLabel: getCommissionLabel(commission),
          scheduleLink,
        }),
      })

      await args.payload.sendEmail({
        html: buildRecruitmentEmailHTML({
          cta: {
            href: scheduleLink,
            label: 'Programeaza interview-ul',
          },
          messageHTML: message.html,
          preheader: 'Ai fost acceptat pentru etapa de interview.',
          title: 'Invitatie la interview',
        }),
        subject: 'Invitatie la interview | Interact Bucuresti Triumph',
        text: `${message.text}\n\nProgramare: ${scheduleLink}`,
        to: prepared.email,
      })

      await updateApplicationReview(args.payload, prepared, {
        interviewMailSentAt: new Date().toISOString(),
        interviewMailSentBy: args.user.id,
      })

      result.sent += 1
      addPlaceholderWarnings(result, prepared, message.unresolvedPlaceholders)
    } catch (error) {
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

  return Response.json({ mailBatch: result })
}

async function sendFinalMails(args: { payload: Payload; user: User }) {
  requireBoard(args.user)
  await assertAllInterviewRoundsComplete(args.payload)

  const config = (await args.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const applications = await findApplicationsForMailBatch(args.payload, {
    status: ['interview-passed', 'interview-rejected'],
  })
  const pending = applications.filter((application) => !application.reviewProcess?.finalMailSentAt)
  const result = createMailBatchResult(applications.length - pending.length)

  for (const application of pending) {
    try {
      const accepted = application.reviewProcess?.status === 'interview-passed'
      const message = renderRecruitmentMessage({
        fallback: accepted
          ? 'Felicitari, ai fost acceptat ca aspirant.'
          : 'Iti multumim pentru participarea la interview. Din pacate, nu ai fost acceptat mai departe.',
        message: accepted
          ? config.recruitment?.['interview-accepted-message']
          : config.recruitment?.['interview-rejected-message'],
        parameters: createApplicantParameters({
          application,
          commissionLabel: getCommissionLabel(application.reviewProcess?.comission),
        }),
      })

      await args.payload.sendEmail({
        html: buildRecruitmentEmailHTML({
          messageHTML: message.html,
          preheader: 'Rezultatul interview-ului tau este disponibil.',
          title: 'Rezultat interview',
        }),
        subject: 'Rezultat interview | Interact Bucuresti Triumph',
        text: message.text,
        to: application.email,
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

      await updateApplicationReview(args.payload, application, {
        aspirerUser: aspirerUserId || undefined,
        finalMailSentAt: new Date().toISOString(),
        finalMailSentBy: args.user.id,
      })

      result.sent += 1
      addPlaceholderWarnings(result, application, message.unresolvedPlaceholders)
    } catch (error) {
      result.failed += 1
      result.failures.push({
        email: application.email,
        id: application.id,
        message: error instanceof Error ? error.message : 'Emailul nu a putut fi trimis.',
        name: application.name,
      })
    }
  }

  return Response.json({ mailBatch: result })
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
  args: { status: ApplicationStatus | ApplicationStatus[] },
) {
  const result = await payload.find({
    collection: 'applications',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: {
      'reviewProcess.status': Array.isArray(args.status)
        ? {
            in: args.status,
          }
        : {
            equals: args.status,
          },
    },
  })

  return result.docs.filter(isRecruitmentApplication)
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

function canManageAssignedApplication(commission: ExtendedCommission, user: User) {
  return canUseCoordinatorWorkspace(user) && isCommissionCoordinator(commission, user)
}

function canManageCommissionSchedule(
  commission: ExtendedCommission,
  user: User,
  scope: RouteScope,
) {
  if (scope === 'recruitment') return isBoardMember(user)
  return canUseCoordinatorWorkspace(user) && isCommissionCoordinator(commission, user)
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

  if (!canUseCoordinatorWorkspace(user)) {
    throw Object.assign(
      new Error('Boardul poate consulta comisiile, dar nu poate modifica acest spatiu de lucru.'),
      { status: 403 },
    )
  }

  if (!coordinatorActions.has(action)) {
    throw Object.assign(new Error('Aceasta actiune este disponibila numai in panoul HR.'), {
      status: 403,
    })
  }
}

function canUseCoordinatorWorkspace(user: User) {
  return !isBoardMember(user) || user.role === 'hr-director'
}

function isReviewStatus(value: string): value is ApplicationStatus {
  return reviewStatuses.has(value as ApplicationStatus)
}

function isFinalStatus(value: string): value is ApplicationStatus {
  return finalStatuses.has(value as ApplicationStatus)
}

function isRecruitmentApplication(application: Application): application is RecruitmentApplication {
  const status = application.reviewProcess?.status
  return status === 'interview' || (status ? finalMailStatuses.has(status) : false)
}

function serializeApplicationUpdate(application: ExtendedApplication) {
  return {
    aspirerUserId: getRelationshipID(application.reviewProcess?.aspirerUser),
    commissionId: getRelationshipID(application.reviewProcess?.comission),
    finalMailSentAt: application.reviewProcess?.finalMailSentAt ?? null,
    id: application.id,
    interviewDate: application.reviewProcess?.interviewDate ?? null,
    interviewAttendance: application.reviewProcess?.interviewAttendance ?? null,
    interviewMailSentAt: application.reviewProcess?.interviewMailSentAt ?? null,
    interviewNotes: (application.reviewProcess?.interviewNotes ?? []).map((note) => ({
      authorId: getRelationshipID(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    knownCoordinatorIds: getKnownCoordinatorIDs(application),
    notes: application.reviewProcess?.notes ?? '',
    reviewedCoordinatorIds: getReviewedCoordinatorIDs(application),
    status: application.reviewProcess?.status ?? 'submitted',
  }
}

function serializeCommissionUpdate(commission: ExtendedCommission) {
  return {
    id: commission.id,
    interviewIntervals: commission.interviewIntervals ?? [],
    recruitmentReviews: (commission.recruitmentReviews ?? []).map((review) => ({
      confirmedAt: review.confirmedAt,
      coordinatorId: getRelationshipID(review.coordinator),
    })),
  }
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
      pauseBetween: normalizeNumber(interval.pauseBetween) ?? 0,
      startDateTime: normalizeOptionalText(interval.startDateTime) ?? null,
    }
  })
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
