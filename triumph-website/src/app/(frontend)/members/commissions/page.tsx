import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Application, Comission, FormSubmission, Mandate, User } from '@/payload-types'
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
    coordonatorReviewChecks?: (string | User)[] | null
    finalMailSentAt?: string | null
    finalMailSentBy?: string | User | null
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
  const hasHRAccess = member.role === 'hr-director'

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
  const commissions = commissionResult.docs as CommissionWithReviews[]

  if (!hasBoardAccess && commissions.length === 0) {
    return (
      <CommissionCoordinatorDashboard
        applications={[]}
        commissions={[]}
        isBoard={false}
        isHR={false}
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

  const manageableCommissionIDs = new Set(commissionIDs)
  const managedApplications = applications
    .filter((application) =>
      hasBoardAccess
        ? true
        : manageableCommissionIDs.has(getRelationshipID(application.reviewProcess?.comission)),
    )
    .map(serializeApplication)
  const recruitmentPool = applications
    .filter((application) => application.reviewProcess?.status === 'coordonator-review')
    .map(serializeRecruitmentPoolApplicant)

  return (
    <CommissionCoordinatorDashboard
      applications={managedApplications}
      commissions={commissions.map(serializeCommission)}
      isBoard={hasBoardAccess}
      isHR={hasHRAccess}
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
    finalMailSentAt: normalizeDate(reviewProcess.finalMailSentAt),
    id: application.id,
    interviewDate: normalizeDate(reviewProcess.interviewDate),
    interviewMailSentAt: normalizeDate(reviewProcess.interviewMailSentAt),
    interviewNotes: (reviewProcess.interviewNotes ?? []).map((note) => ({
      author: serializeUser(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    knownCoordinatorIds: (reviewProcess.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
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
    knownCoordinatorIds: (reviewProcess.coordonatorIncompatability ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
    name: application.name,
    reviewedCoordinatorIds: (reviewProcess.coordonatorReviewChecks ?? [])
      .map(getRelationshipID)
      .filter(Boolean),
  }
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

  return (value.submissionData ?? []).map((item) => ({
    field: item.field,
    value: item.value,
  }))
}

function getInstagram(answers: Array<{ field: string; value: string }>) {
  const answer = answers.find((item) => item.field.toLocaleLowerCase('ro').includes('insta'))
  if (answer?.value) return answer.value

  const handle = answers
    .map((item) => item.value)
    .find((value) => /^@?[a-z0-9._]{2,30}$/i.test(value.trim()) && value.includes('.'))

  return handle ?? ''
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
