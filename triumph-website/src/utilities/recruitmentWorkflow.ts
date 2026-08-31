import { validateInterviewIntervals, type InterviewIntervalInput } from './aspirementRecruitment'

export const recruitmentSteps = [
  { key: 'forms', label: 'Review formulare', number: 1 },
  { key: 'coordinator-review', label: 'Verificare coordonatori', number: 2 },
  { key: 'assignment', label: 'Asignare si program', number: 3 },
  { key: 'invitations', label: 'Invitatii interview', number: 4 },
  { key: 'interviews', label: 'Interview-uri', number: 5 },
  { key: 'results', label: 'Rezultate finale', number: 6 },
] as const

export type RecruitmentStepKey = (typeof recruitmentSteps)[number]['key']

export type WorkflowApplicationStatus =
  | 'submitted'
  | 'submission-waitlisted'
  | 'submission-rejected'
  | 'coordonator-review'
  | 'interview'
  | 'interview-withdrawn'
  | 'interviewed'
  | 'absent'
  | 'interview-passed'
  | 'interview-rejected'

export type WorkflowApplication = {
  commissionId?: string | null
  finalMailSentAt?: string | null
  id: string
  interviewDate?: string | null
  interviewMailSentAt?: string | null
  knownCoordinatorIds?: string[]
  reviewedCoordinatorIds?: string[]
  status: WorkflowApplicationStatus
}

export type WorkflowCommission = {
  coordinators: Array<{ id: string }>
  id: string
  interviewIntervals?: InterviewIntervalInput[] | null
  label?: string
  recruitmentReviews: Array<{ coordinatorId: string }>
}

export type WorkflowConfig = {
  interviewSchedulingDeadline?: string | null
  recruitmentEndDate?: string | null
  recruitmentStartDate?: string | null
}

type Gate = {
  complete: boolean
  blockers: string[]
}

export type RecruitmentWorkflowState = {
  currentStep: RecruitmentStepKey
  gates: Record<RecruitmentStepKey, Gate>
  metrics: {
    accepted: number
    assigned: number
    finalPending: number
    interviewsPending: number
    mailedInterviews: number
    scheduled: number
    submitted: number
    waitlisted: number
  }
  window: {
    end: string | null
    isOpen: boolean
    start: string | null
  }
}

export function getRecruitmentWorkflowState(args: {
  applications: WorkflowApplication[]
  commissions: WorkflowCommission[]
  config: WorkflowConfig
  now?: Date
}): RecruitmentWorkflowState {
  const now = args.now ?? new Date()
  const applications = args.applications
  const commissions = args.commissions
  const submissionQueue = applications.filter((application) => application.status === 'submitted')
  const coordinatorPool = applications.filter(
    (application) => application.status === 'coordonator-review',
  )
  const assigned = applications.filter(
    (application) =>
      Boolean(application.commissionId) &&
      ['interview', 'interviewed', 'absent'].includes(application.status),
  )
  const interviewApplications = applications.filter(
    (application) => application.status === 'interview',
  )
  const unresolvedInterviews = assigned.filter((application) =>
    ['interview', 'interviewed', 'absent'].includes(application.status),
  )
  const finalDecisionApplications = applications.filter(
    (application) =>
      Boolean(application.commissionId) &&
      ['interview-passed', 'interview-rejected'].includes(application.status),
  )
  const deadline = getEndOfBucharestDay(args.config.interviewSchedulingDeadline)
  const recruitmentEnd = getEndOfBucharestDay(args.config.recruitmentEndDate)
  const recruitmentStart = getStartOfBucharestDay(args.config.recruitmentStartDate)
  const windowOpen =
    (!recruitmentStart || now >= recruitmentStart) && (!recruitmentEnd || now <= recruitmentEnd)

  const formsBlockers: string[] = []
  if (!args.config.recruitmentEndDate)
    formsBlockers.push('Configureaza data finala a inscrierilor.')
  if (recruitmentEnd && now <= recruitmentEnd)
    formsBlockers.push('Perioada de inscrieri este inca deschisa.')
  if (submissionQueue.length > 0)
    formsBlockers.push(`${submissionQueue.length} formulare asteapta review.`)
  const forms = { blockers: formsBlockers, complete: formsBlockers.length === 0 }

  const coordinatorBlockers = getCoordinatorReviewBlockers(coordinatorPool, commissions)
  const coordinatorReview = {
    blockers: forms.complete ? coordinatorBlockers : ['Finalizeaza review-ul formularelor.'],
    complete: forms.complete && coordinatorBlockers.length === 0,
  }

  const assignmentBlockers: string[] = []
  if (!coordinatorReview.complete)
    assignmentBlockers.push('Asteapta confirmarea tuturor coordonatorilor.')
  if (coordinatorPool.length > 0)
    assignmentBlockers.push(`${coordinatorPool.length} candidati nu sunt asignati.`)
  const assignedCommissionIDs = new Set(
    assigned
      .map((application) => application.commissionId)
      .filter((value): value is string => Boolean(value)),
  )
  for (const commission of commissions.filter((item) => assignedCommissionIDs.has(item.id))) {
    const validity = validateInterviewIntervals(commission.interviewIntervals)
    if (!validity.valid) {
      assignmentBlockers.push(
        `${getCommissionLabel(commission)}: ${validity.errors[0] || 'program invalid.'}`,
      )
    }
  }
  const assignment = {
    blockers: assignmentBlockers,
    complete: coordinatorReview.complete && assignmentBlockers.length === 0,
  }

  const invitationBlockers: string[] = []
  if (!assignment.complete)
    invitationBlockers.push('Finalizeaza asignarea si programele comisiilor.')
  const unsentInvites = interviewApplications.filter(
    (application) => !application.interviewMailSentAt,
  )
  if (unsentInvites.length > 0)
    invitationBlockers.push(`${unsentInvites.length} invitatii nu sunt trimise.`)
  if (!args.config.interviewSchedulingDeadline)
    invitationBlockers.push('Configureaza deadline-ul de programare.')
  if (deadline && now <= deadline)
    invitationBlockers.push('Perioada de programare este inca deschisa.')
  const invitations = {
    blockers: invitationBlockers,
    complete: assignment.complete && invitationBlockers.length === 0,
  }

  const interviewBlockers: string[] = []
  if (!invitations.complete) interviewBlockers.push('Asteapta inchiderea perioadei de programare.')
  if (unresolvedInterviews.length > 0) {
    interviewBlockers.push(
      `${unresolvedInterviews.length} interview-uri au nevoie de decizie sau prezenta.`,
    )
  }
  const interviews = {
    blockers: interviewBlockers,
    complete: invitations.complete && interviewBlockers.length === 0,
  }

  const resultBlockers: string[] = []
  if (!interviews.complete) resultBlockers.push('Finalizeaza toate interview-urile si deciziile.')
  const pendingFinalMails = finalDecisionApplications.filter(
    (application) => !application.finalMailSentAt,
  )
  if (pendingFinalMails.length > 0)
    resultBlockers.push(`${pendingFinalMails.length} emailuri finale nu sunt trimise.`)
  const results = {
    blockers: resultBlockers,
    complete: interviews.complete && resultBlockers.length === 0,
  }

  const gates = {
    assignment,
    'coordinator-review': coordinatorReview,
    forms,
    interviews,
    invitations,
    results,
  }
  const firstIncomplete = recruitmentSteps.find((step) => !gates[step.key].complete)

  return {
    currentStep: firstIncomplete?.key ?? 'results',
    gates,
    metrics: {
      accepted: applications.filter((application) => application.status === 'interview-passed')
        .length,
      assigned: assigned.length,
      finalPending: pendingFinalMails.length,
      interviewsPending: unresolvedInterviews.length,
      mailedInterviews: interviewApplications.filter(
        (application) => application.interviewMailSentAt,
      ).length,
      scheduled: interviewApplications.filter((application) => application.interviewDate).length,
      submitted: submissionQueue.length,
      waitlisted: applications.filter(
        (application) => application.status === 'submission-waitlisted',
      ).length,
    },
    window: {
      end: args.config.recruitmentEndDate ?? null,
      isOpen: windowOpen,
      start: args.config.recruitmentStartDate ?? null,
    },
  }
}

export function getStartOfBucharestDay(value?: string | null) {
  return getBucharestBoundary(value, false)
}

export function getEndOfBucharestDay(value?: string | null) {
  return getBucharestBoundary(value, true)
}

function getCoordinatorReviewBlockers(
  applications: WorkflowApplication[],
  commissions: WorkflowCommission[],
) {
  const blockers: string[] = []
  const coordinatorIDs = new Set(
    commissions.flatMap((commission) => commission.coordinators.map((item) => item.id)),
  )

  if (applications.length > 0 && coordinatorIDs.size === 0) {
    blockers.push('Nu exista coordonatori configurati pentru review.')
  }

  for (const commission of commissions) {
    const ids = commission.coordinators.map((item) => item.id)
    const confirmed = new Set(commission.recruitmentReviews.map((review) => review.coordinatorId))
    const pending = ids.filter((id) => !confirmed.has(id))
    if (pending.length > 0) {
      blockers.push(`${getCommissionLabel(commission)}: ${pending.length} confirmari lipsa.`)
    }
  }

  const pendingChecks = applications.filter((application) => {
    const checked = new Set(application.reviewedCoordinatorIds ?? [])
    return [...coordinatorIDs].some((id) => !checked.has(id))
  })
  if (pendingChecks.length > 0)
    blockers.push(`${pendingChecks.length} candidati nu sunt verificati de toti coordonatorii.`)

  return blockers
}

function getCommissionLabel(commission: WorkflowCommission) {
  return commission.label || 'Comisie'
}

function getBucharestBoundary(value: string | null | undefined, endOfDay: boolean) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = endOfDay ? 23 : 0
  const minute = endOfDay ? 59 : 0
  const second = endOfDay ? 59 : 0
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, endOfDay ? 999 : 0)
  const initialOffset = getBucharestOffset(new Date(utcGuess))
  const resolved = new Date(utcGuess - initialOffset)
  const resolvedOffset = getBucharestOffset(resolved)

  return new Date(utcGuess - resolvedOffset)
}

function getBucharestOffset(value: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )

  return asUTC - value.getTime()
}
