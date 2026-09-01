import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload, type Where } from 'payload'

import type {
  Application,
  AspirementConfig,
  Comission,
  FormSubmission,
  User,
} from '@/payload-types'
import { normalizeInstagramUsername } from '@/utilities/instagram'
import { normalizeGooglePlace } from '@/utilities/googlePlace'
import { isBoardMember } from '@/utilities/membersAccess'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import CommissionInterviewWorkspace, {
  type InterviewWorkspaceApplication,
  type InterviewWorkspaceCommission,
  type InterviewWorkspaceUser,
} from './CommissionInterviewWorkspace'

export const metadata: Metadata = {
  description: 'Workspace pentru ziua de interview a comisiilor.',
  title: 'Interview-uri Comisii | Interact Bucuresti Triumph',
}

type Args = {
  searchParams: Promise<{ commission?: string }>
}

export default async function CommissionInterviewsPage({ searchParams }: Args) {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })
  if (!auth.user) redirect('/members/login')

  const user = (await payload.findByID({
    collection: 'users',
    depth: 1,
    id: auth.user.id,
    overrideAccess: false,
    user: auth.user,
  })) as User
  const board = isBoardMember(user)
  const commissionResult = await payload.find({
    collection: 'comissions',
    depth: 2,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: 'commissionNumber',
    where: board ? undefined : { coordinators: { contains: user.id } },
  })
  const accessibleCommissions = commissionResult.docs as Comission[]
  const coordinatedCommissions = accessibleCommissions.filter((commission) =>
    commission.coordinators.some((coordinator) => getRelationshipID(coordinator) === user.id),
  )
  const useCoordinatorWorkspace = user.role === 'hr-director' && coordinatedCommissions.length > 0
  const commissions = useCoordinatorWorkspace ? coordinatedCommissions : accessibleCommissions
  const commissionIDs = commissions.map((commission) => commission.id)
  const applicationWhere: Where = {
    'reviewProcess.comission': { in: commissionIDs },
  }
  const applicationResult = commissionIDs.length
    ? await payload.find({
        collection: 'applications',
        depth: 2,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        sort: 'reviewProcess.interviewDate',
        where: applicationWhere,
      })
    : { docs: [] }
  const config = (await payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const params = await searchParams
  const selectedID = commissions.some((commission) => commission.id === params.commission)
    ? (params.commission ?? '')
    : commissions[0]?.id || ''

  return (
    <CommissionInterviewWorkspace
      applications={(applicationResult.docs as Application[]).map(serializeApplication)}
      commissions={commissions.map(serializeCommission)}
      defaultInterviewDate={normalizeDate(config.recruitment?.defaultInterviewDate)}
      initialCommissionId={selectedID}
      isReadOnly={board && !useCoordinatorWorkspace}
      schedulingDeadline={normalizeDate(config.recruitment?.interviewSchedulingDeadline)}
      user={serializeUser(user)}
    />
  )
}

function serializeCommission(commission: Comission): InterviewWorkspaceCommission {
  return {
    coordinators: commission.coordinators.map(serializeCommissionUser),
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
  }
}

function serializeApplication(application: Application): InterviewWorkspaceApplication {
  const review = application.reviewProcess ?? {}
  const submission =
    typeof application.formSubmission === 'string' ? null : application.formSubmission
  const answers = getSubmissionAnswers(submission)
  return {
    commissionId: getRelationshipID(review.comission),
    email: application.email,
    formAnswers: answers,
    id: application.id,
    instagram: normalizeInstagramUsername(findAnswer(answers, ['insta', 'instagram'])),
    interviewAttendance: review.interviewAttendance ?? null,
    interviewDate: normalizeDate(review.interviewDate),
    interviewNotes: (review.interviewNotes ?? []).map((note) => ({
      author: typeof note.author === 'string' ? null : serializeUser(note.author),
      createdAt: note.createdAt,
      id: note.id ?? `${getRelationshipID(note.author)}-${note.createdAt}`,
      note: note.note,
    })),
    name: application.name,
    notes: review.notes ?? '',
    phone: findAnswer(answers, ['phone', 'telefon', 'tel']),
    status: review.status ?? 'submitted',
  }
}

function serializeUser(user: User): InterviewWorkspaceUser {
  return { email: user.email, id: user.id, name: user.name || user.email }
}

function serializeCommissionUser(value: string | User): InterviewWorkspaceUser {
  if (typeof value === 'string') return { email: '', id: value, name: 'Coordonator' }
  return serializeUser(value)
}

function findAnswer(answers: Array<{ field: string; value: string }>, names: string[]) {
  return (
    answers.find((answer) => names.some((name) => answer.field.toLowerCase().includes(name)))
      ?.value ?? ''
  )
}

function getSubmissionAnswers(submission: FormSubmission | null) {
  const labels = getSubmissionFieldLabels(submission)

  return (submission?.submissionData ?? []).map((item) => ({
    field: item.field,
    label: labels.get(item.field) || item.field,
    value: item.value,
  }))
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

function getRelationshipID(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string')
    return value.id
  return ''
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
