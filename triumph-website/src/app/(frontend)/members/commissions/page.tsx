import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Application, Comission, FormSubmission, Mandate, User } from '@/payload-types'
import { normalizeInstagramUsername } from '@/utilities/instagram'
import { isBoardMember } from '@/utilities/membersAccess'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import CommissionCoordinatorDashboard, {
  type ManagedApplication,
  type ManagedCommission,
  type ManagedRecruitmentPoolApplicant,
  type ManagedUser,
} from './CommissionCoordinatorDashboard'

export const metadata: Metadata = {
  description: 'Recruitment si evidenta pentru comisiile Interact Bucuresti Triumph.',
  title: 'Panou Coordonatori | Interact Bucuresti Triumph',
}

type ApplicationWithExtendedReview = Application & {
  reviewProcess?: Application['reviewProcess'] & {
    aspirerUser?: (string | null) | User
    interviewNotes?:
      | {
          author: string | User
          createdAt: string
          id?: string | null
          note: string
        }[]
      | null
    interviewScores?:
      | {
          comunicare?: number | null
          coordinator: string | User
          id?: string | null
          interact?: number | null
          leadership?: number | null
          situatii?: number | null
          teamPlayer?: number | null
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
    coordonatorReviewChecks?: (string | User)[] | null
    finalMailSentAt?: string | null
    finalMailSentBy?: string | User | null
    interviewArrivedLateAt?: string | null
    interviewMailSentAt?: string | null
    interviewMailSentBy?: string | User | null
    interviewScheduleToken?: string | null
    interviewScheduleTokenCreatedAt?: string | null
  }
}

type CommissionWithReviews = Comission & {
  recruitmentReviews?:
    | {
        confirmedAt: string
        coordinator: string | User
        id?: string | null
      }[]
    | null
}

export default async function CommissionCoordinatorPage() {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })

  if (!auth.user) redirect('/members/login')

  const authUser = auth.user as User
  const member = (await payload.findByID({
    collection: 'users',
    depth: 1,
    id: authUser.id,
    overrideAccess: false,
    user: authUser,
  })) as User
  const hasBoardAccess = isBoardMember(member)

  const commissionResult = await payload.find({
    collection: 'comissions',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: 'commissionNumber',
    where: hasBoardAccess
      ? undefined
      : {
          coordinators: {
            contains: member.id,
          },
        },
  })
  const accessibleCommissions = commissionResult.docs as CommissionWithReviews[]
  const coordinatedCommissions = accessibleCommissions.filter((commission) =>
    commission.coordinators.some((coordinator) => getRelationshipID(coordinator) === member.id),
  )
  const canManageAllCommissions = member.role === 'hr-director' && coordinatedCommissions.length > 0
  const commissions = accessibleCommissions
  const preferredCommissionId = coordinatedCommissions[0]?.id ?? commissions[0]?.id ?? ''
  const manageableCommissionIds = canManageAllCommissions
    ? commissions.map((commission) => commission.id)
    : coordinatedCommissions.map((commission) => commission.id)

  if (!hasBoardAccess && commissions.length === 0) {
    return (
      <CommissionCoordinatorDashboard
        applications={[]}
        commissions={[]}
        initialCommissionId=""
        isBoard={false}
        manageableCommissionIds={[]}
        recruitmentPool={[]}
        user={{
          email: member.email,
          id: member.id,
          name: member.name || member.email,
          role: member.role,
        }}
      />
    )
  }

  const commissionIDs = commissions.map((commission) => commission.id)
  const applicationWhere: Where | undefined = hasBoardAccess
    ? undefined
    : {
        or: [
          {
            'reviewProcess.comission': {
              in: commissionIDs,
            },
          },
          {
            'reviewProcess.status': {
              equals: 'coordonator-review',
            },
          },
        ],
      }
  const applicationResult = await payload.find({
    collection: 'applications',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: applicationWhere,
  })
  const applications = applicationResult.docs as ApplicationWithExtendedReview[]

  const manageableCommissionIDSet = new Set(commissionIDs)
  const managedApplications = applications
    .filter((application) =>
      hasBoardAccess
        ? true
        : manageableCommissionIDSet.has(getRelationshipID(application.reviewProcess?.comission)),
    )
    .map(serializeApplication)
  const recruitmentPool = applications
    .filter((application) => application.reviewProcess?.status === 'coordonator-review')
    .map(serializeRecruitmentPoolApplicant)

  return (
    <CommissionCoordinatorDashboard
      applications={managedApplications}
      commissions={commissions.map(serializeCommission)}
      generalViewHref={hasBoardAccess ? '/members/recruitment' : undefined}
      initialCommissionId={preferredCommissionId}
      isBoard={hasBoardAccess}
      manageableCommissionIds={manageableCommissionIds}
      recruitmentPool={recruitmentPool}
      user={{
        email: member.email,
        id: member.id,
        name: member.name || member.email,
        role: member.role,
      }}
    />
  )
}

function serializeCommission(commission: CommissionWithReviews): ManagedCommission {
  return {
    aspirers: (commission.aspirers ?? []).map(serializeUser).filter(isManagedUser),
    commissionNumber: commission.commissionNumber,
    coordinators: commission.coordinators.map(serializeUser).filter(isManagedUser),
    id: commission.id,
    label: `Comisia ${commission.commissionNumber}`,
    mandateLabel: getMandateLabel(commission.mandate),
    recruitmentReviews: (commission.recruitmentReviews ?? [])
      .map((review) => ({
        confirmedAt: review.confirmedAt,
        coordinatorId: getRelationshipID(review.coordinator),
      }))
      .filter((review) => Boolean(review.coordinatorId && review.confirmedAt)),
  }
}

function serializeApplication(application: ApplicationWithExtendedReview): ManagedApplication {
  const reviewProcess = application.reviewProcess ?? {}

  return {
    aspirerUserId: getRelationshipID(reviewProcess.aspirerUser),
    commissionId: getRelationshipID(reviewProcess.comission),
    createdAt: application.createdAt,
    email: application.email,
    formAnswers: getSubmissionAnswers(application.formSubmission),
    formReviewComments: (reviewProcess.formReviewComments ?? []).map((comment) => ({
      author: serializeUser(comment.author),
      comment: comment.comment,
      createdAt: comment.createdAt,
      id: comment.id ?? `${getRelationshipID(comment.author)}-${comment.createdAt}`,
    })),
    finalMailSentAt: normalizeDate(reviewProcess.finalMailSentAt),
    id: application.id,
    interviewArrivedLateAt: normalizeDate(reviewProcess.interviewArrivedLateAt),
    interviewAttendance: reviewProcess.interviewAttendance ?? null,
    interviewDate: normalizeDate(reviewProcess.interviewDate),
    interviewMailSentAt: normalizeDate(reviewProcess.interviewMailSentAt),
    interviewNotes: (reviewProcess.interviewNotes ?? []).map((note) => ({
      author: serializeUser(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    interviewScores:
      reviewProcess.interviewScores && reviewProcess.interviewScores?.length
        ? reviewProcess.interviewScores
            .map((entry) => ({
              comunicare: normalizeScore(entry.comunicare),
              coordinatorId: getRelationshipID(entry.coordinator),
              interact: normalizeScore(entry.interact),
              leadership: normalizeScore(entry.leadership),
              situatii: normalizeScore(entry.situatii),
              teamPlayer: normalizeScore(entry.teamPlayer),
            }))
            .filter((entry) => Boolean(entry.coordinatorId))
        : undefined,
    knownCoordinatorIds: (reviewProcess.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    onlineInterview: Boolean(reviewProcess.onlineInterview),
    reviewedCoordinatorIds: (reviewProcess.coordonatorReviewChecks ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    name: application.name,
    notes: reviewProcess.notes ?? '',
    status: reviewProcess.status ?? 'submitted',
  }
}

function serializeRecruitmentPoolApplicant(
  application: ApplicationWithExtendedReview,
): ManagedRecruitmentPoolApplicant {
  const reviewProcess = application.reviewProcess ?? {}

  return {
    id: application.id,
    instagram: getInstagram(getSubmissionAnswers(application.formSubmission)),
    highschool: getSubmissionAnswers(application.formSubmission).find(
      (val) => val.field == 'highschool',
    )?.value,
    knownCoordinatorIds: (reviewProcess.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    name: application.name,
    phone: getPhone(getSubmissionAnswers(application.formSubmission)),
    reviewedCoordinatorIds: (reviewProcess.coordonatorReviewChecks ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
  }
}

function getPhone(answers: Array<{ field: string; value: string }>) {
  const answer = answers.find((item) => /phone|telefon|tel/i.test(item.field))
  return answer?.value ?? ''
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

function getSubmissionAnswers(value: string | FormSubmission) {
  if (!value || typeof value === 'string') return []

  const labels = getSubmissionFieldLabels(value)
  return (value.submissionData ?? []).map((item) => ({
    field: item.field,
    label: labels.get(item.field) || item.field,
    value: item.value,
  }))
}

function getSubmissionFieldLabels(submission: FormSubmission) {
  if (typeof submission.form === 'string') return new Map<string, string>()

  return new Map(
    (submission.form.fields ?? []).flatMap((field) => {
      if (!('name' in field) || typeof field.name !== 'string') return []

      const label = 'label' in field && typeof field.label === 'string' ? field.label.trim() : ''
      return [[field.name, label || field.name]]
    }),
  )
}

function getInstagram(answers: Array<{ field: string; value: string }>) {
  const answer = answers.find((item) => item.field.toLocaleLowerCase('ro').includes('insta'))
  if (answer?.value) return normalizeInstagramUsername(answer.value)

  const handle = answers
    .map((item) => item.value)
    .find((value) => /^@?[a-z0-9._]{2,30}$/i.test(value.trim()) && value.includes('.'))

  return normalizeInstagramUsername(handle)
}

function getMandateLabel(value: string | Mandate) {
  if (!value || typeof value === 'string') return 'Mandat neconfigurat'
  return `${value.year}`
}

function getRelationshipID(value: unknown) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id
  return ''
}

function normalizeDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeScore(value: unknown) {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? Math.min(10, Math.max(0, score)) : null
}
