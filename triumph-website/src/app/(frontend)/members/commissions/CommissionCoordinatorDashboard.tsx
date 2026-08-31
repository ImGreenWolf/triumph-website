'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  ListChecks,
  MailCheck,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { CompactCommissionOverview } from '@/app/(frontend)/members/_components/CompactCommissionOverview'
import { useHeaderTheme } from '@/providers/HeaderTheme'

export type ManagedUser = {
  email: string
  id: string
  name: string
  role?: string | null
}

export type ManagedCommission = {
  aspirers: ManagedUser[]
  commissionNumber: number
  coordinators: ManagedUser[]
  id: string
  label: string
  mandateLabel: string
  recruitmentReviews: {
    confirmedAt: string
    coordinatorId: string
  }[]
}

export type ManagedApplicationStatus =
  | 'submitted'
  | 'coordonator-review'
  | 'submission-waitlisted'
  | 'submission-rejected'
  | 'interview'
  | 'interview-withdrawn'
  | 'interviewed'
  | 'absent'
  | 'interview-passed'
  | 'interview-rejected'

export type ManagedApplication = {
  aspirerUserId?: string
  commissionId: string
  createdAt: string
  email: string
  formAnswers: {
    field: string
    label: string
    value: string
  }[]
  finalMailSentAt: string | null
  id: string
  interviewDate: string | null
  interviewAttendance: 'scheduled' | 'late' | 'absent' | 'completed' | null
  interviewMailSentAt: string | null
  interviewNotes: ManagedInterviewNote[]
  knownCoordinatorIds: string[]
  name: string
  notes: string
  reviewedCoordinatorIds: string[]
  status: ManagedApplicationStatus
}

export type ManagedInterviewNote = {
  author: ManagedUser | null
  createdAt: string
  id: string
  note: string
}

export type ManagedRecruitmentPoolApplicant = {
  id: string
  instagram: string
  knownCoordinatorIds: string[]
  name: string
  phone: string
  reviewedCoordinatorIds: string[]
}

type WorkspaceView = 'overview' | 'known-applicants' | 'assigned-candidates' | 'team'

type Notice = {
  kind: 'error' | 'success'
  message: string
}

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

type ApplicationPatch = Partial<
  Pick<
    ManagedApplication,
    | 'aspirerUserId'
    | 'commissionId'
    | 'finalMailSentAt'
    | 'interviewDate'
    | 'interviewMailSentAt'
    | 'knownCoordinatorIds'
    | 'notes'
    | 'reviewedCoordinatorIds'
    | 'status'
  >
> & {
  id: string
  interviewNotes?: ManagedInterviewNote[]
}

type ServerApplicationPatch = Omit<ApplicationPatch, 'interviewNotes'> & {
  interviewNotes?: Array<
    ManagedInterviewNote | { authorId: string; createdAt: string; id: string; note: string }
  >
}

const statusLabels: Record<ManagedApplicationStatus, string> = {
  absent: 'Absent',
  'coordonator-review': 'Review coordonatori',
  interview: 'Interview',
  interviewed: 'Interview finalizat',
  'interview-passed': 'Aspirant acceptat',
  'interview-rejected': 'Respins dupa interview',
  'submission-rejected': 'Formular respins',
  'submission-waitlisted': 'Lista de asteptare',
  submitted: 'Neverificat',
  'interview-withdrawn': 'Retras',
}

const completedRecruitmentStatuses = new Set<ManagedApplicationStatus>([
  'interview-passed',
  'interview-rejected',
  'submission-rejected',
  'interview-withdrawn',
])

const panelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
} satisfies Variants

export default function CommissionCoordinatorDashboard(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  isBoard: boolean
  recruitmentPool: ManagedRecruitmentPoolApplicant[]
  user: ManagedUser
}) {
  const {
    applications: initialApplications,
    commissions: initialCommissions,
    isBoard,
    recruitmentPool: initialRecruitmentPool,
    user,
  } = props
  const router = useRouter()
  const { setHeaderTheme } = useHeaderTheme()
  const prefersReducedMotion = useReducedMotion()
  const [applications, setApplications] = useState(initialApplications)
  const [commissions, setCommissions] = useState(initialCommissions)
  const [recruitmentPool, setRecruitmentPool] = useState(initialRecruitmentPool)
  const [selectedCommissionId, setSelectedCommissionId] = useState(
    () => initialCommissions[0]?.id ?? '',
  )
  const [view, setView] = useState<WorkspaceView>('overview')
  const [query, setQuery] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null)

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    setApplications(initialApplications)
    setCommissions(initialCommissions)
    setRecruitmentPool(initialRecruitmentPool)
  }, [initialApplications, initialCommissions, initialRecruitmentPool])

  const selectedCommission =
    commissions.find((commission) => commission.id === selectedCommissionId) ?? commissions[0]
  const selectedCommissionHasUserReview = Boolean(
    selectedCommission?.recruitmentReviews.some((review) => review.coordinatorId === user.id),
  )
  const userCoordinatesSelectedCommission = Boolean(
    selectedCommission?.coordinators.some((coordinator) => coordinator.id === user.id),
  )
  const selectedApplications = useMemo(
    () =>
      selectedCommission
        ? applications.filter((application) => application.commissionId === selectedCommission.id)
        : [],
    [applications, selectedCommission],
  )
  const detailApplication =
    applications.find((application) => application.id === detailApplicationId) ?? null

  function applyApplicationPatch(patch: ServerApplicationPatch) {
    const normalizedPatch = normalizeApplicationPatch(patch, user)

    setApplications((current) =>
      current.map((application) =>
        application.id === normalizedPatch.id
          ? { ...application, ...normalizedPatch }
          : application,
      ),
    )
    setRecruitmentPool((current) =>
      current
        .map((applicant) =>
          applicant.id === normalizedPatch.id && normalizedPatch.knownCoordinatorIds
            ? { ...applicant, knownCoordinatorIds: normalizedPatch.knownCoordinatorIds }
            : applicant,
        )
        .map((applicant) =>
          applicant.id === normalizedPatch.id && normalizedPatch.reviewedCoordinatorIds
            ? { ...applicant, reviewedCoordinatorIds: normalizedPatch.reviewedCoordinatorIds }
            : applicant,
        )
        .filter(
          (applicant) =>
            applicant.id !== patch.id ||
            !normalizedPatch.status ||
            normalizedPatch.status === 'coordonator-review',
        ),
    )
  }

  function applyCommissionReview(
    commissionId: string,
    reviews: ManagedCommission['recruitmentReviews'],
  ) {
    setCommissions((current) =>
      current.map((commission) =>
        commission.id === commissionId
          ? { ...commission, recruitmentReviews: reviews }
          : commission,
      ),
    )
  }

  async function runAction<T extends Record<string, unknown>>(body: T, busyLabel: string) {
    setBusyKey(busyLabel)
    setNotice(null)

    try {
      const response = await fetch('/members/commissions/applications', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as {
        application?: ServerApplicationPatch
        commission?: {
          id: string
          recruitmentReviews: ManagedCommission['recruitmentReviews']
        }
        message?: string
        mailBatch?: MailBatchResult
        setupEmailSent?: boolean
      }

      if (!response.ok) {
        throw new Error(result.message || 'Actiunea nu a putut fi salvata.')
      }

      if (result.application) applyApplicationPatch(result.application)
      if (result.commission) {
        applyCommissionReview(result.commission.id, result.commission.recruitmentReviews)
      }

      setNotice({
        kind: 'success',
        message: result.mailBatch
          ? formatMailBatchNotice(result.mailBatch)
          : result.setupEmailSent === false
            ? 'Salvat, dar emailul de setare parola nu a putut fi trimis.'
            : 'Modificarile au fost salvate.',
      })
      router.refresh()
      return result
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Actiunea nu a putut fi salvata.',
      })
      throw error
    } finally {
      setBusyKey(null)
    }
  }

  if (!selectedCommission) {
    return <EmptyState userName={user.name} />
  }

  const pendingKnownReview =
    !isBoard && userCoordinatesSelectedCommission && !selectedCommissionHasUserReview
  const reviewRemaining = recruitmentPool.filter(
    (applicant) => !applicant.reviewedCoordinatorIds.includes(user.id),
  ).length
  const activeCandidates = selectedApplications.filter((application) =>
    ['interview', 'interviewed', 'absent'].includes(application.status),
  )
  const scheduledCandidates = activeCandidates.filter((application) => application.interviewDate)
  const unresolvedCandidates = activeCandidates.filter(
    (application) => application.status === 'interview',
  )
  const pendingDecisions = activeCandidates.filter((application) =>
    ['interviewed', 'absent'].includes(application.status),
  )

  return (
    <div
      className="min-h-screen bg-[#f4f6f8] pt-20 text-[#152039] sm:pt-24"
      data-reduce-motion={prefersReducedMotion ? 'true' : undefined}
    >
      <header className="border-b border-[#dfe5ec] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] hover:text-[#007fb3]"
              href="/members"
            >
              <ArrowLeft className="size-4" />
              Dashboard membri
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded border border-[#bde8f8] bg-[#eefaff] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#007fb3]">
                {isBoard ? 'Vizualizare board' : 'Spatiu coordonator'}
              </span>
              {isBoard && (
                <span className="text-xs font-semibold text-[#748094]">Doar vizualizare</span>
              )}
            </div>
            <h1 className="mt-2 truncate text-2xl font-bold sm:text-3xl">
              {selectedCommission.label}
            </h1>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <select
              aria-label="Selecteaza comisia"
              className="h-10 min-w-0 rounded-md border border-[#d9e0e8] bg-white px-3 text-sm font-bold outline-none focus:border-[#00a2e0] sm:w-56"
              onChange={(event) => {
                setSelectedCommissionId(event.target.value)
                setView('overview')
                setQuery('')
              }}
              value={selectedCommission.id}
            >
              {commissions.map((commission) => (
                <option key={commission.id} value={commission.id}>
                  {commission.label}
                </option>
              ))}
            </select>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#141e34] px-3 text-sm font-bold text-white hover:bg-[#223254]"
              href={`/members/commissions/interviews?commission=${selectedCommission.id}`}
            >
              <Clock3 className="size-4" />
              Workspace interview
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
        <CoordinatorSidebar
          isBoard={isBoard}
          onChange={setView}
          pendingDecisions={pendingDecisions.length}
          pendingKnownReview={pendingKnownReview ? reviewRemaining : 0}
          unresolvedCandidates={unresolvedCandidates.length}
          value={view}
        />
        <motion.section
          animate="visible"
          initial={prefersReducedMotion ? false : 'hidden'}
          variants={panelVariants}
        >
          {notice && <NoticeCard notice={notice} />}
          {view === 'overview' && (
            <CoordinatorOverview
              assignedCandidates={selectedApplications.length}
              commission={selectedCommission}
              onOpenAssigned={() => setView('assigned-candidates')}
              onOpenKnownApplicants={() => setView('known-applicants')}
              pendingDecisions={pendingDecisions.length}
              pendingKnownReview={pendingKnownReview ? reviewRemaining : 0}
              readOnly={isBoard}
              scheduledCandidates={scheduledCandidates.length}
              unresolvedCandidates={unresolvedCandidates.length}
            />
          )}
          {view === 'known-applicants' && (
            <KnownApplicantsTask
              busyKey={busyKey}
              canManage={!isBoard && userCoordinatesSelectedCommission}
              commission={selectedCommission}
              hasConfirmedReview={selectedCommissionHasUserReview}
              onAction={runAction}
              query={query}
              recruitmentPool={recruitmentPool}
              setQuery={setQuery}
              user={user}
            />
          )}
          {view === 'assigned-candidates' && (
            <AssignedCandidateList
              applications={selectedApplications}
              canManage={!isBoard && userCoordinatesSelectedCommission}
              busyKey={busyKey}
              commission={selectedCommission}
              onAction={runAction}
              onOpenDetails={setDetailApplicationId}
              query={query}
              setQuery={setQuery}
            />
          )}
          {view === 'team' && <CommissionDetails commission={selectedCommission} />}
        </motion.section>
      </main>

      <ApplicationDetailDrawer
        application={detailApplication}
        onClose={() => setDetailApplicationId(null)}
      />
    </div>
  )
}

function CoordinatorSidebar(props: {
  isBoard: boolean
  onChange: (view: WorkspaceView) => void
  pendingDecisions: number
  pendingKnownReview: number
  unresolvedCandidates: number
  value: WorkspaceView
}) {
  const items: Array<{
    badge?: number
    icon: LucideIcon
    label: string
    value: WorkspaceView
  }> = [
    { icon: LayoutDashboard, label: 'Overview', value: 'overview' },
    {
      badge: props.pendingKnownReview,
      icon: ListChecks,
      label: 'Verificare cunoscuti',
      value: 'known-applicants',
    },
    {
      badge: props.pendingDecisions || props.unresolvedCandidates,
      icon: UserCheck,
      label: 'Candidati asignati',
      value: 'assigned-candidates',
    },
    { icon: Users, label: 'Echipa', value: 'team' },
  ]

  return (
    <aside className="h-fit rounded-lg border border-[#dfe5ec] bg-white p-2 shadow-[0_8px_30px_rgba(22,34,57,0.04)] lg:sticky lg:top-24">
      <p className="px-3 pb-2 pt-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#748094]">
        {props.isBoard ? 'Vizualizare comisie' : 'Spatiu de lucru'}
      </p>
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.value === props.value
          return (
            <button
              className={
                'flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ' +
                (active
                  ? 'bg-[#141e34] text-white'
                  : 'text-[#526071] hover:bg-[#f4f6f8] hover:text-[#152039]')
              }
              key={item.value}
              onClick={() => props.onChange(item.value)}
              type="button"
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 break-words">{item.label}</span>
              {item.badge ? (
                <span
                  className={
                    'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-black ' +
                    (active ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-800')
                  }
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function CoordinatorOverview(props: {
  assignedCandidates: number
  commission: ManagedCommission
  onOpenAssigned: () => void
  onOpenKnownApplicants: () => void
  pendingDecisions: number
  pendingKnownReview: number
  readOnly: boolean
  scheduledCandidates: number
  unresolvedCandidates: number
}) {
  const nextTask =
    props.pendingKnownReview > 0
      ? {
          action: props.onOpenKnownApplicants,
          description: props.pendingKnownReview + ' aplicanti necesita o optiune.',
          label: 'Continua verificarea',
          title: 'Verifica aplicantii cunoscuti',
        }
      : props.pendingDecisions > 0
        ? {
            action: props.onOpenAssigned,
            description: props.pendingDecisions + ' candidati asteapta decizia finala.',
            label: props.readOnly ? 'Consulta candidatii' : 'Vezi candidatii',
            title: props.readOnly ? 'Decizii in asteptare' : 'Finalizeaza deciziile',
          }
        : props.unresolvedCandidates > 0
          ? {
              action: props.onOpenAssigned,
              description: props.unresolvedCandidates + ' interview-uri sunt inca deschise.',
              label: 'Vezi candidatii',
              title: 'Urmareste interview-urile',
            }
          : {
              action: props.onOpenAssigned,
              description: 'Consulta statusul candidatilor asignati comisiei.',
              label: 'Deschide lista',
              title: 'Candidati asignati',
            }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <PanelHeader
            description="O privire rapida asupra oamenilor si a progresului acestei comisii."
            title="Comisia ta"
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <PeopleSummary label="Coordonatori" people={props.commission.coordinators} />
            <PeopleSummary label="Aspiranti" people={props.commission.aspirers} />
          </div>
        </Panel>
        <Panel className="border-[#bae6f7] bg-[#eefaff]">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#007fb3]">
            Urmatorul pas
          </p>
          <h2 className="mt-2 text-lg font-bold">{nextTask.title}</h2>
          <p className="mt-2 text-sm text-[#526071]">{nextTask.description}</p>
          <button
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#007fb3] px-3 text-sm font-bold text-white hover:bg-[#006b96]"
            onClick={nextTask.action}
            type="button"
          >
            {nextTask.label}
            <ArrowLeft className="size-4 rotate-180" />
          </button>
        </Panel>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressItem label="Asignati" value={String(props.assignedCandidates)} />
        <ProgressItem label="Programati" value={String(props.scheduledCandidates)} />
        <ProgressItem label="Nerezolvati" tone="amber" value={String(props.unresolvedCandidates)} />
        <ProgressItem label="Decizii ramase" tone="blue" value={String(props.pendingDecisions)} />
      </section>
    </div>
  )
}

function PeopleSummary(props: { label: string; people: ManagedUser[] }) {
  const visible = props.people.slice(0, 4)
  const remaining = props.people.length - visible.length
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">{props.label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map((person) => (
          <span
            className="inline-flex max-w-full items-center gap-2 rounded-md bg-[#f4f6f8] px-2 py-1.5 text-xs font-bold text-[#344054]"
            key={person.id}
            title={person.email}
          >
            <Avatar name={person.name} />
            <span className="max-w-32 truncate">{person.name}</span>
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center rounded-md bg-[#f4f6f8] px-2 py-1.5 text-xs font-bold text-[#526071]">
            +{remaining}
          </span>
        )}
        {props.people.length === 0 && <span className="text-sm text-[#748094]">Nimeni inca</span>}
      </div>
    </div>
  )
}

function ProgressItem(props: { label: string; tone?: 'amber' | 'blue'; value: string }) {
  const tone =
    props.tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : props.tone === 'blue'
        ? 'border-[#bde8f8] bg-[#eefaff] text-[#007fb3]'
        : 'border-[#dfe5ec] bg-white text-[#152039]'
  return (
    <div className={'rounded-md border px-3 py-3 ' + tone}>
      <p className="text-[11px] font-black uppercase tracking-[0.08em] opacity-70">{props.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{props.value}</p>
    </div>
  )
}

function KnownApplicantsTask(props: {
  busyKey: string | null
  canManage: boolean
  commission: ManagedCommission
  hasConfirmedReview: boolean
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  query: string
  recruitmentPool: ManagedRecruitmentPoolApplicant[]
  setQuery: (query: string) => void
  user: ManagedUser
}) {
  const normalizedQuery = props.query.trim().toLocaleLowerCase('ro')
  const applicants = props.recruitmentPool.filter((applicant) =>
    [applicant.name, applicant.phone, applicant.instagram].some((value) =>
      value.toLocaleLowerCase('ro').includes(normalizedQuery),
    ),
  )
  const remaining = props.recruitmentPool.filter(
    (applicant) => !applicant.reviewedCoordinatorIds.includes(props.user.id),
  ).length

  if (!props.canManage) {
    return (
      <Panel>
        <PanelHeader
          description="Boardul poate consulta stadiul acestei verificari, fara sa modifice marcajele."
          title="Verificare aplicanti cunoscuti"
        />
        <div className="mt-5 rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-4 text-sm text-[#526071]">
          {props.commission.recruitmentReviews.length}/{props.commission.coordinators.length}{' '}
          coordonatori au confirmat verificarea pentru aceasta comisie.
        </div>
      </Panel>
    )
  }

  if (props.hasConfirmedReview) {
    return (
      <Panel>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-bold">Verificarea este confirmata</h2>
            <p className="mt-1 text-sm text-[#526071]">
              HR va folosi marcajele tale pentru asignarea candidatilor. Lista comuna nu mai este
              disponibila.
            </p>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
            Etapa coordonatori
          </p>
          <h2 className="mt-1 text-2xl font-bold">Verificare aplicanti cunoscuti</h2>
          <p className="mt-1 text-sm text-[#526071]">
            Marcheaza fiecare aplicant inainte de a confirma verificarea.
          </p>
        </div>
        <SearchField query={props.query} setQuery={props.setQuery} />
      </div>
      <Panel className="overflow-hidden p-0" stagger={false}>
        <div className="flex flex-col gap-3 border-b border-[#e5e9ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold">
            {props.recruitmentPool.length - remaining}/{props.recruitmentPool.length} verificati
          </p>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
            disabled={remaining > 0 || props.busyKey === 'confirm-' + props.commission.id}
            onClick={() =>
              void props.onAction(
                { action: 'confirm-review', commissionId: props.commission.id },
                'confirm-' + props.commission.id,
              )
            }
            type="button"
          >
            <CheckCircle2 className="size-4" />
            {remaining > 0 ? remaining + ' ramasi' : 'Confirma verificarea'}
          </button>
        </div>
        <ApplicantPoolList
          applicants={applicants}
          busyKey={props.busyKey}
          onAction={props.onAction}
          user={props.user}
        />
      </Panel>
    </div>
  )
}

function AssignedCandidateList(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  canManage: boolean
  commission: ManagedCommission
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onOpenDetails: (applicationID: string) => void
  query: string
  setQuery: (query: string) => void
}) {
  const normalizedQuery = props.query.trim().toLocaleLowerCase('ro')
  const applications = [...props.applications]
    .filter((application) =>
      [application.name, application.email, statusLabels[application.status]].some((value) =>
        value.toLocaleLowerCase('ro').includes(normalizedQuery),
      ),
    )
    .sort((left, right) => Number(isCompletedCandidate(left)) - Number(isCompletedCandidate(right)))

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
            Recruitment
          </p>
          <h2 className="mt-1 text-2xl font-bold">Candidati asignati</h2>
          <p className="mt-1 text-sm text-[#526071]">
            {props.canManage
              ? 'Urmarire si decizii pentru candidatii repartizati de HR.'
              : 'Statusul candidatilor repartizati acestei comisii.'}
          </p>
        </div>
        <SearchField query={props.query} setQuery={props.setQuery} />
      </div>
      <Panel className="overflow-hidden p-0" stagger={false}>
        <div className="divide-y divide-[#edf0f4]">
          {applications.map((application) => (
            <DenseCandidateRow
              application={application}
              busyKey={props.busyKey}
              canManage={props.canManage}
              commissionID={props.commission.id}
              key={application.id}
              onAction={props.onAction}
              onOpenDetails={props.onOpenDetails}
            />
          ))}
          {applications.length === 0 && (
            <InlineEmpty text="Nu exista candidati asignati acestei comisii." />
          )}
        </div>
      </Panel>
    </div>
  )
}

function DenseCandidateRow(props: {
  application: ManagedApplication
  busyKey: string | null
  canManage: boolean
  commissionID: string
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onOpenDetails: (applicationID: string) => void
}) {
  const { application } = props
  const canDecide = props.canManage && ['interviewed', 'absent'].includes(application.status)
  return (
    <article className="grid gap-3 px-4 py-3.5 xl:grid-cols-[minmax(13rem,1fr)_minmax(12rem,0.75fr)_auto] xl:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={application.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{application.name}</p>
          <p className="mt-0.5 truncate text-xs text-[#748094]">{application.email}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        <span className="rounded-md bg-[#f4f6f8] px-2 py-1 text-xs font-bold text-[#526071]">
          {candidateInterviewState(application)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9e0e8] px-3 text-xs font-bold text-[#344054] hover:bg-[#f8fafc]"
          onClick={() => props.onOpenDetails(application.id)}
          type="button"
        >
          <FileText className="size-3.5" />
          Detalii
        </button>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9e0e8] px-3 text-xs font-bold text-[#344054] hover:bg-[#f8fafc]"
          href={'/members/commissions/interviews?commission=' + props.commissionID}
        >
          <Clock3 className="size-3.5" />
          Interview-uri
        </Link>
        {canDecide && (
          <>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-55"
              disabled={props.busyKey === 'pass-' + application.id}
              onClick={() =>
                void props.onAction(
                  {
                    action: 'final-decision',
                    applicationId: application.id,
                    status: 'interview-passed',
                  },
                  'pass-' + application.id,
                )
              }
              type="button"
            >
              <UserCheck className="size-3.5" />
              Accepta
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-55"
              disabled={props.busyKey === 'reject-' + application.id}
              onClick={() =>
                void props.onAction(
                  {
                    action: 'final-decision',
                    applicationId: application.id,
                    status: 'interview-rejected',
                  },
                  'reject-' + application.id,
                )
              }
              type="button"
            >
              <XCircle className="size-3.5" />
              Respinge
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function SearchField(props: { query: string; setQuery: (query: string) => void }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a94a6]" />
      <input
        className="h-10 w-full rounded-md border border-[#dce2ea] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#00a2e0]"
        onChange={(event) => props.setQuery(event.target.value)}
        placeholder="Cauta candidat"
        type="search"
        value={props.query}
      />
    </div>
  )
}

function isCompletedCandidate(application: ManagedApplication) {
  return ['interview-passed', 'interview-rejected', 'interview-withdrawn'].includes(
    application.status,
  )
}

function candidateInterviewState(application: ManagedApplication) {
  if (application.status === 'absent' || application.interviewAttendance === 'absent')
    return 'Absent'
  if (application.status === 'interviewed' || application.interviewAttendance === 'completed')
    return 'Finalizat'
  if (application.interviewAttendance === 'late') return 'Intarziat'
  if (application.interviewDate) return formatDate(application.interviewDate)
  return 'Neprogramat'
}

function Overview(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  metrics: ReturnType<typeof calculateMetrics>
  selectedApplications: ManagedApplication[]
}) {
  const { applications, commissions, metrics, selectedApplications } = props
  const recent = [...applications]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6)

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="blue"
          detail={`${commissions.length} comisii active`}
          icon={BriefcaseBusiness}
          label="Comisii"
          value={String(commissions.length)}
        />
        <MetricCard
          accent="amber"
          detail={`${metrics.pendingCoordinatorReview} asteapta coordonatorii`}
          icon={ClipboardCheck}
          label="In recruitment"
          value={String(metrics.inRecruitment)}
        />
        <MetricCard
          accent="green"
          detail={`${metrics.acceptedAspirers} acceptati`}
          icon={UserCheck}
          label="Candidati asignati"
          value={String(metrics.assigned)}
        />
        <MetricCard
          accent="violet"
          detail={`${metrics.pendingFinalDecision} decizii ramase`}
          icon={Sparkles}
          label="Comisia selectata"
          value={String(selectedApplications.length)}
        />
      </section>

      <CompactCommissionOverview applications={applications} commissions={commissions} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <Panel>
          <PanelHeader
            description="Statusul candidatilor pe intreg procesul de recruitment."
            title="Pipeline recruitment"
          />
          <div className="mt-6 space-y-4">
            {Object.entries(statusLabels).map(([status, label]) => {
              const count = applications.filter(
                (application) => application.status === status,
              ).length
              const percentage = percentageOf(count, Math.max(applications.length, 1))
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold">{label}</span>
                    <span className="font-semibold text-[#748094]">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e6ebf1]">
                    <div
                      className="h-full rounded-full bg-[#00a2e0]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            description="Ultimele aplicatii importate din formular."
            title="Aplicatii recente"
          />
          <div className="mt-5 divide-y divide-[#edf0f4]">
            {recent.map((application) => (
              <div className="flex items-center gap-3 py-3.5" key={application.id}>
                <Avatar name={application.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{application.name}</p>
                  <p className="mt-0.5 truncate text-xs opacity-55">{application.email}</p>
                </div>
                <StatusBadge status={application.status} />
              </div>
            ))}
            {recent.length === 0 && <InlineEmpty text="Nu exista aplicatii inca." />}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Recruitment(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commission: ManagedCommission
  commissions: ManagedCommission[]
  hasConfirmedReview: boolean
  isBoard: boolean
  isHR: boolean
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onSelectApplication: (applicationId: string) => void
  query: string
  recruitmentPool: ManagedRecruitmentPoolApplicant[]
  selectedApplications: ManagedApplication[]
  setQuery: (query: string) => void
  user: ManagedUser
  userCoordinatesCommission: boolean
}) {
  const {
    applications,
    busyKey,
    commission,
    commissions,
    hasConfirmedReview,
    isBoard,
    isHR,
    onAction,
    onSelectApplication,
    query,
    recruitmentPool,
    selectedApplications,
    setQuery,
    user,
    userCoordinatesCommission,
  } = props
  const normalizedQuery = query.trim().toLocaleLowerCase('ro')
  const filteredPool = recruitmentPool.filter((applicant) =>
    [applicant.name, applicant.phone, applicant.instagram].some((value) =>
      value.toLocaleLowerCase('ro').includes(normalizedQuery),
    ),
  )
  const filteredApplications = selectedApplications.filter((application) =>
    [application.name, application.email, application.status].some((value) =>
      value.toLocaleLowerCase('ro').includes(normalizedQuery),
    ),
  )
  const activeAssignedApplications = filteredApplications.filter(
    (application) => !completedRecruitmentStatuses.has(application.status),
  )
  const filteredAllApplications = applications.filter((application) =>
    [application.name, application.email, application.status].some((value) =>
      value.toLocaleLowerCase('ro').includes(normalizedQuery),
    ),
  )
  const shouldShowCoordinatorPool = !isBoard && userCoordinatesCommission && !hasConfirmedReview
  const uncheckedApplicants = recruitmentPool.filter(
    (applicant) => !applicant.reviewedCoordinatorIds.includes(user.id),
  ).length
  const canConfirmCoordinatorReview = uncheckedApplicants === 0

  if (shouldShowCoordinatorPool) {
    return (
      <div className="grid gap-5">
        <RecruitmentHeader
          description="Marcheaza aplicantii pe care ii cunosti. Dupa confirmare, lista dispare si vei vedea doar candidatii asignati de HR."
          query={query}
          setQuery={setQuery}
          title="Verificare aplicanti cunoscuti"
        />
        <Panel className="overflow-hidden p-0" stagger={false}>
          <div className="border-b border-[#e5e9ef] p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold">{filteredPool.length} aplicanti in lista</p>
                <p className="mt-1 text-xs text-[#748094]">
                  HR va folosi aceste marcaje cand face asignarea pe comisii.
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyKey === `confirm-${commission.id}` || !canConfirmCoordinatorReview}
                onClick={() =>
                  void onAction(
                    {
                      action: 'confirm-review',
                      commissionId: commission.id,
                    },
                    `confirm-${commission.id}`,
                  )
                }
                type="button"
              >
                <CheckCircle2 className="size-4" />
                {busyKey === `confirm-${commission.id}`
                  ? 'Se confirma...'
                  : canConfirmCoordinatorReview
                    ? 'Am terminat verificarea'
                    : `${uncheckedApplicants} ramasi`}
              </button>
            </div>
          </div>
          <ApplicantPoolList
            applicants={filteredPool}
            busyKey={busyKey}
            onAction={onAction}
            user={user}
          />
        </Panel>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <RecruitmentHeader
        description={
          isHR
            ? 'Review, marcaje de la coordonatori, asignare comisie si programare interview.'
            : 'Candidatii asignati acestei comisii de HR.'
        }
        query={query}
        setQuery={setQuery}
        title="Recruitment"
      />

      {isBoard && (
        <BoardMailBatchActions applications={applications} busyKey={busyKey} onAction={onAction} />
      )}

      {isBoard && (
        <BoardReviewQueue
          applications={filteredAllApplications}
          busyKey={busyKey}
          onAction={onAction}
          onSelectApplication={onSelectApplication}
        />
      )}

      {isHR && (
        <HRAssignmentQueue
          applications={filteredAllApplications}
          busyKey={busyKey}
          commissions={commissions}
          onAction={onAction}
          onSelectApplication={onSelectApplication}
        />
      )}

      <AssignedApplications
        applications={activeAssignedApplications}
        busyKey={busyKey}
        commission={commission}
        onAction={onAction}
        onSelectApplication={onSelectApplication}
        user={user}
      />
    </div>
  )
}

function RecruitmentHeader(props: {
  description: string
  query: string
  setQuery: (query: string) => void
  title: string
}) {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{props.title}</h2>
        <p className="mt-1 text-sm text-[#748094]">{props.description}</p>
      </div>
      <div className="relative w-full lg:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a94a6]" />
        <input
          className="h-11 w-full rounded-lg border border-[#dce2ea] bg-white pl-10 pr-3 text-sm text-[#152039] outline-none transition placeholder:text-[#a4abba] focus:border-[#00a2e0] focus:ring-2 focus:ring-[#00a2e0]/10"
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="Cauta candidat"
          type="search"
          value={props.query}
        />
      </div>
    </div>
  )
}

function ApplicantPoolList(props: {
  applicants: ManagedRecruitmentPoolApplicant[]
  busyKey: string | null
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  user: ManagedUser
}) {
  const { applicants, busyKey, onAction, user } = props

  return (
    <div className="grid gap-2 p-2 sm:gap-3 sm:p-3">
      {applicants.map((applicant) => {
        const known = applicant.knownCoordinatorIds.includes(user.id)
        const reviewed = applicant.reviewedCoordinatorIds.includes(user.id)
        const notKnown = reviewed && !known
        const knownBusyLabel = `known-${applicant.id}`
        const unknownBusyLabel = `unknown-${applicant.id}`
        return (
          <article
            className="grid gap-3 rounded-xl border border-[#e4e8ef] bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4"
            key={applicant.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={applicant.name} />
              <div className="min-w-0">
                <p className="break-words text-sm font-bold">{applicant.name}</p>
                <p className="mt-0.5 break-words text-xs text-[#6b7688]">
                  {applicant.phone || 'Telefon indisponibil'} ·{' '}
                  {applicant.instagram || 'Instagram indisponibil'}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  known
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                    : 'border border-[#d9dfe7] bg-white text-[#344054] hover:bg-[#f8fafc]'
                }`}
                disabled={busyKey === knownBusyLabel}
                onClick={() =>
                  void onAction(
                    {
                      action: 'toggle-known',
                      applicationId: applicant.id,
                      known: true,
                    },
                    knownBusyLabel,
                  )
                }
                type="button"
              >
                <Check className="size-4" />
                Il cunosc
              </button>
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  notKnown
                    ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                    : 'border border-[#d9dfe7] bg-white text-[#344054] hover:bg-[#f8fafc]'
                }`}
                disabled={busyKey === unknownBusyLabel}
                onClick={() =>
                  void onAction(
                    {
                      action: 'toggle-known',
                      applicationId: applicant.id,
                      known: false,
                    },
                    unknownBusyLabel,
                  )
                }
                type="button"
              >
                <X className="size-4" />
                Nu il cunosc
              </button>
            </div>
          </article>
        )
      })}
      {applicants.length === 0 && <InlineEmpty text="Nu exista aplicanti in aceasta etapa." />}
    </div>
  )
}

function BoardMailBatchActions(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
}) {
  const { applications, busyKey, onAction } = props
  const interviewPending = applications.filter(
    (application) => application.status === 'interview' && !application.interviewMailSentAt,
  ).length
  const finalPending = applications.filter(
    (application) =>
      ['interview-passed', 'interview-rejected'].includes(application.status) &&
      !application.finalMailSentAt,
  ).length

  return (
    <Panel>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <PanelHeader
          description="Trimite batch-uri manuale pentru candidatii eligibili care nu au primit deja emailul respectiv."
          title="Emailuri recruitment"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00a2e0] px-4 text-sm font-bold text-white transition hover:bg-[#008fc7] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyKey === 'send-interview-mails' || interviewPending === 0}
            onClick={() =>
              void onAction({ action: 'send-interview-mails' }, 'send-interview-mails')
            }
            type="button"
          >
            <Send className="size-4" />
            Interview mails ({interviewPending})
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyKey === 'send-final-mails' || finalPending === 0}
            onClick={() => void onAction({ action: 'send-final-mails' }, 'send-final-mails')}
            type="button"
          >
            <MailCheck className="size-4" />
            Final mails ({finalPending})
          </button>
        </div>
      </div>
    </Panel>
  )
}

function BoardReviewQueue(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, busyKey, onAction, onSelectApplication } = props
  const submitted = applications.filter((application) => application.status === 'submitted')

  if (submitted.length === 0) return null

  return (
    <Panel>
      <PanelHeader
        description="Primul filtru pe raspunsurile din formular."
        title="Review formulare"
      />
      <div className="mt-5 grid gap-3">
        {submitted.map((application) => (
          <ApplicationCard
            actions={
              <>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={busyKey === `review-pass-${application.id}`}
                  onClick={() =>
                    void onAction(
                      {
                        action: 'review-submission',
                        applicationId: application.id,
                        status: 'coordonator-review',
                      },
                      `review-pass-${application.id}`,
                    )
                  }
                  type="button"
                >
                  <Check className="size-3.5" />
                  Trece mai departe
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
                  disabled={busyKey === `review-reject-${application.id}`}
                  onClick={() =>
                    void onAction(
                      {
                        action: 'review-submission',
                        applicationId: application.id,
                        status: 'submission-rejected',
                      },
                      `review-reject-${application.id}`,
                    )
                  }
                  type="button"
                >
                  <XCircle className="size-3.5" />
                  Respinge formular
                </button>
              </>
            }
            application={application}
            key={application.id}
            onOpenDetails={() => onSelectApplication(application.id)}
          />
        ))}
      </div>
    </Panel>
  )
}

function HRAssignmentQueue(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, busyKey, commissions, onAction, onSelectApplication } = props
  const queue = applications.filter((application) => application.status === 'coordonator-review')

  if (queue.length === 0) return null

  return (
    <Panel>
      <PanelHeader
        description="Asignarea este controlata de HR dupa marcajele coordonatorilor."
        title="Asignare candidati"
      />
      <CoordinatorReviewStatus commissions={commissions} />
      <div className="mt-5 grid gap-3">
        {queue.map((application) => (
          <HRAssignmentRow
            application={application}
            busy={busyKey === `assign-${application.id}`}
            commissions={commissions}
            key={application.id}
            onOpenDetails={() => onSelectApplication(application.id)}
            onSave={(commissionId) =>
              onAction(
                {
                  action: 'assign-candidate',
                  applicationId: application.id,
                  commissionId,
                },
                `assign-${application.id}`,
              )
            }
          />
        ))}
      </div>
    </Panel>
  )
}

function CoordinatorReviewStatus({ commissions }: { commissions: ManagedCommission[] }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {commissions.map((commission) => {
        const completedIDs = new Set(
          commission.recruitmentReviews.map((review) => review.coordinatorId),
        )
        const completed = commission.coordinators.filter((coordinator) =>
          completedIDs.has(coordinator.id),
        )

        return (
          <div className="rounded-xl border border-[#e4e8ef] bg-[#f8fafc] p-3" key={commission.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{commission.label}</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#536071] ring-1 ring-[#e4e8ef]">
                {completed.length}/{commission.coordinators.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {commission.coordinators.map((coordinator) => {
                const review = commission.recruitmentReviews.find(
                  (item) => item.coordinatorId === coordinator.id,
                )

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"
                    key={coordinator.id}
                  >
                    <span className="min-w-0 truncate font-semibold">{coordinator.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                        review ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {review ? 'Confirmat' : 'In asteptare'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function canAssignApplicantToCommission(
  application: ManagedApplication,
  commission: ManagedCommission,
) {
  const completedCoordinatorIDs = new Set(
    commission.recruitmentReviews.map((review) => review.coordinatorId),
  )
  const knownCoordinatorIDs = new Set(application.knownCoordinatorIds)
  const coordinators = commission.coordinators

  return (
    coordinators.length > 0 &&
    coordinators.every((coordinator) => completedCoordinatorIDs.has(coordinator.id)) &&
    coordinators.every((coordinator) => !knownCoordinatorIDs.has(coordinator.id))
  )
}

function HRAssignmentRow(props: {
  application: ManagedApplication
  busy: boolean
  commissions: ManagedCommission[]
  onOpenDetails: () => void
  onSave: (commissionId: string) => Promise<unknown>
}) {
  const { application, busy, commissions, onOpenDetails, onSave } = props
  const eligibleCommissions = commissions.filter((commission) =>
    canAssignApplicantToCommission(application, commission),
  )
  const [commissionId, setCommissionId] = useState(
    application.commissionId || eligibleCommissions[0]?.id || '',
  )
  const knownCoordinators = commissions
    .flatMap((commission) => commission.coordinators)
    .filter(
      (coordinator, index, all) => all.findIndex((item) => item.id === coordinator.id) === index,
    )
    .filter((coordinator) => application.knownCoordinatorIds.includes(coordinator.id))

  return (
    <article className="rounded-xl border border-[#e4e8ef] bg-white p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Avatar name={application.name} />
            <div className="min-w-0">
              <p className="break-words text-sm font-bold">{application.name}</p>
              <p className="mt-0.5 break-words text-xs text-[#6b7688]">{application.email}</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#748094]">
            Cunoscut de:{' '}
            {knownCoordinators.map((coordinator) => coordinator.name).join(', ') || 'nimeni'}
          </p>
          {eligibleCommissions.length === 0 && (
            <p className="mt-2 text-xs font-bold text-red-600">
              Nicio comisie eligibila: coordonatorii trebuie sa finalizeze review-ul si sa nu
              cunoasca aplicantul.
            </p>
          )}
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#748094]">
            Comisie
          </span>
          <select
            className="h-11 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#00a2e0]"
            disabled={busy || eligibleCommissions.length === 0}
            onChange={(event) => setCommissionId(event.target.value)}
            value={commissionId}
          >
            {eligibleCommissions.map((commission) => (
              <option key={commission.id} value={commission.id}>
                {commission.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-4 text-sm font-bold text-[#344054] transition hover:bg-[#f8fafc]"
            onClick={onOpenDetails}
            type="button"
          >
            <FileText className="size-4" />
            Detalii
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00a2e0] px-4 text-sm font-bold text-white transition hover:bg-[#008fc7] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || !commissionId || eligibleCommissions.length === 0}
            onClick={() => void onSave(commissionId)}
            type="button"
          >
            <Check className="size-4" />
            Trimite la interview
          </button>
        </div>
      </div>
    </article>
  )
}

function AssignedApplications(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commission: ManagedCommission
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onSelectApplication: (applicationId: string) => void
  user: ManagedUser
}) {
  const { applications, busyKey, commission, onAction, onSelectApplication, user } = props

  return (
    <Panel className="overflow-hidden p-0" stagger={false}>
      <div className="border-b border-[#e5e9ef] p-4">
        <PanelHeader
          description="Lista candidatilor pe care HR i-a asignat comisiei selectate."
          title={`Candidatii din ${commission.label}`}
        />
      </div>
      <div className="grid gap-3 p-3">
        {applications.map((application) => (
          <AssignedApplicationCard
            application={application}
            busyKey={busyKey}
            key={application.id}
            onAction={onAction}
            onOpenDetails={() => onSelectApplication(application.id)}
            user={user}
          />
        ))}
        {applications.length === 0 && (
          <InlineEmpty text="Nu exista candidati asignati acestei comisii." />
        )}
      </div>
    </Panel>
  )
}

function AssignedApplicationCard(props: {
  application: ManagedApplication
  busyKey: string | null
  onAction: <T extends Record<string, unknown>>(body: T, busyLabel: string) => Promise<unknown>
  onOpenDetails: () => void
  user: ManagedUser
}) {
  const { application, busyKey, onAction, onOpenDetails } = props
  const [note, setNote] = useState('')
  const canDecide = ['interviewed', 'absent'].includes(application.status)

  return (
    <ApplicationCard
      actions={
        canDecide ? (
          <>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={busyKey === `pass-${application.id}`}
              onClick={() =>
                void onAction(
                  {
                    action: 'final-decision',
                    applicationId: application.id,
                    status: 'interview-passed',
                  },
                  `pass-${application.id}`,
                )
              }
              type="button"
            >
              <UserCheck className="size-3.5" />
              Accepta aspirant
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
              disabled={busyKey === `reject-${application.id}`}
              onClick={() =>
                void onAction(
                  {
                    action: 'final-decision',
                    applicationId: application.id,
                    status: 'interview-rejected',
                  },
                  `reject-${application.id}`,
                )
              }
              type="button"
            >
              <XCircle className="size-3.5" />
              Respinge
            </button>
          </>
        ) : (
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f8fafc]"
            href="/members/commissions/interviews"
          >
            <Clock3 className="size-3.5" />
            Deschide interview-uri
          </Link>
        )
      }
      application={application}
      footer={
        <div className="mt-4 grid gap-3 border-t border-[#edf0f4] pt-4">
          <div className="space-y-2">
            {application.interviewNotes.map((interviewNote) => (
              <div className="rounded-lg bg-[#f7f9fc] px-3 py-2 text-sm" key={interviewNote.id}>
                <p className="font-semibold">{interviewNote.author?.name || 'Membru board'}</p>
                <p className="mt-1 whitespace-pre-wrap text-[#536071]">{interviewNote.note}</p>
                <p className="mt-1 text-xs text-[#8a94a6]">{formatDate(interviewNote.createdAt)}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <textarea
              className="min-h-20 rounded-lg border border-[#dce2ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#00a2e0] focus:ring-2 focus:ring-[#00a2e0]/10"
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Adauga nota de interview"
              value={note}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border border-[#d9dfe7] bg-white px-4 text-xs font-bold text-[#344054] transition hover:bg-[#f8fafc] disabled:opacity-60"
              disabled={!note.trim() || busyKey === `note-${application.id}`}
              onClick={async () => {
                const noteText = note.trim()
                if (!noteText) return
                await onAction(
                  {
                    action: 'add-note',
                    applicationId: application.id,
                    note: noteText,
                  },
                  `note-${application.id}`,
                )
                setNote('')
              }}
              type="button"
            >
              <FileText className="size-3.5" />
              Salveaza nota
            </button>
          </div>
        </div>
      }
      onOpenDetails={onOpenDetails}
    />
  )
}

function ApplicationCard(props: {
  actions?: ReactNode
  application: ManagedApplication
  footer?: ReactNode
  onOpenDetails?: () => void
}) {
  const { actions, application, footer, onOpenDetails } = props

  return (
    <article className="rounded-xl border border-[#e4e8ef] bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={application.name} />
            <div className="min-w-0">
              <p className="break-words text-sm font-bold">{application.name}</p>
              <p className="mt-0.5 break-words text-xs text-[#6b7688]">{application.email}</p>
            </div>
            <StatusBadge status={application.status} />
            <MailStatusBadges application={application} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#748094]">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#f7f9fc] px-2 py-1">
              <Clock3 className="size-3.5" />
              {application.interviewDate
                ? formatDate(application.interviewDate)
                : 'Interview neprogramat'}
            </span>
            <span className="rounded-md bg-[#f7f9fc] px-2 py-1">
              {application.knownCoordinatorIds.length} marcaje coordonatori
            </span>
          </div>
          {application.formAnswers.length > 0 && (
            <details className="mt-4 rounded-lg border border-[#edf0f4] bg-[#fafbfc] p-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.08em] text-[#536071]">
                Raspunsuri formular
              </summary>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {application.formAnswers.map((answer) => (
                  <div className="min-w-0" key={`${application.id}-${answer.field}`}>
                    <dt className="break-words text-[11px] font-bold uppercase text-[#8a94a6]">
                      {answer.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-[#344054]">
                      {answer.value || '-'}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
        {(actions || onOpenDetails) && (
          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            {onOpenDetails && (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f8fafc]"
                onClick={onOpenDetails}
                type="button"
              >
                <FileText className="size-3.5" />
                Detalii
              </button>
            )}
            {actions}
          </div>
        )}
      </div>
      {footer}
    </article>
  )
}

function ApplicationDetailDrawer(props: {
  application: ManagedApplication | null
  onClose: () => void
}) {
  const { application, onClose } = props
  if (!application) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101a31]/35 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4">
      <button
        aria-label="Inchide detalii candidat"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-[#152039] shadow-2xl">
        <header className="border-b border-[#edf0f4] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={application.name} />
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold">{application.name}</h2>
                <p className="mt-0.5 break-words text-sm text-[#6b7688]">{application.email}</p>
              </div>
            </div>
            <button
              aria-label="Inchide"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#d9dfe7] text-[#536071] transition hover:bg-[#f8fafc]"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={application.status} />
            <span className="rounded-full bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-bold text-[#536071]">
              {application.knownCoordinatorIds.length} marcaje coordonatori
            </span>
            <span className="rounded-full bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-bold text-[#536071]">
              {application.interviewDate
                ? formatDate(application.interviewDate)
                : 'Interview neprogramat'}
            </span>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#748094]">
              Raspunsuri formular
            </h3>
            <dl className="mt-3 grid gap-3">
              {application.formAnswers.map((answer) => (
                <div
                  className="rounded-lg border border-[#edf0f4] bg-[#fafbfc] p-3"
                  key={answer.field}
                >
                  <dt className="break-words text-[11px] font-bold uppercase text-[#8a94a6]">
                    {answer.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#344054]">
                    {answer.value || '-'}
                  </dd>
                </div>
              ))}
              {application.formAnswers.length === 0 && <InlineEmpty text="Nu exista raspunsuri." />}
            </dl>
          </section>
          {application.notes && (
            <section className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#748094]">
                Note etape precedente
              </h3>
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#f7f9fc] px-3 py-2.5 text-sm text-[#536071]">
                {application.notes}
              </p>
            </section>
          )}
          <section className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#748094]">
              Note interview
            </h3>
            <div className="mt-3 grid gap-2">
              {application.interviewNotes.map((note) => (
                <div className="rounded-lg bg-[#f7f9fc] px-3 py-2 text-sm" key={note.id}>
                  <p className="font-semibold">{note.author?.name || 'Membru board'}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[#536071]">{note.note}</p>
                  <p className="mt-1 text-xs text-[#8a94a6]">{formatDate(note.createdAt)}</p>
                </div>
              ))}
              {application.interviewNotes.length === 0 && <InlineEmpty text="Nu exista note." />}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

function CommissionDetails({ commission }: { commission: ManagedCommission }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader description="Membrii care coordoneaza aceasta comisie." title="Coordonatori" />
        <div className="mt-5 divide-y divide-[#edf0f4]">
          {commission.coordinators.map((coordinator) => (
            <UserRow key={coordinator.id} user={coordinator} />
          ))}
          {commission.coordinators.length === 0 && <InlineEmpty text="Nu exista coordonatori." />}
        </div>
      </Panel>
      <Panel>
        <PanelHeader description="Aspirantii acceptati in aceasta comisie." title="Aspiranti" />
        <div className="mt-5 divide-y divide-[#edf0f4]">
          {commission.aspirers.map((aspirer) => (
            <UserRow key={aspirer.id} user={aspirer} />
          ))}
          {commission.aspirers.length === 0 && (
            <InlineEmpty text="Nu exista aspiranti acceptati." />
          )}
        </div>
      </Panel>
    </div>
  )
}

function UserRow({ user }: { user: ManagedUser }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{user.name}</p>
        <p className="mt-0.5 truncate text-xs opacity-55">{user.email}</p>
      </div>
      {user.role && <span className="text-xs font-semibold text-[#748094]">{user.role}</span>}
    </div>
  )
}

function EmptyState({ userName }: { userName: string }) {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101a31] px-5 pt-20 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#00a2e0]/15 text-[#56c9f5]">
          <BriefcaseBusiness className="size-7" />
        </div>
        <p className="mt-6 text-sm font-semibold text-white/55">Salut, {userName}</p>
        <h1 className="mt-2 text-3xl font-bold">Nu ai comisii asignate</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Cand esti adaugat ca coordonator la o comisie, aceasta va aparea automat aici.
        </p>
        <Link
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#101a31]"
          href="/members"
        >
          <ArrowLeft className="size-4" />
          Inapoi la dashboard
        </Link>
      </div>
    </div>
  )
}

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <div
      className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
        notice.kind === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {notice.kind === 'success' ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <XCircle className="size-4" />
      )}
      {notice.message}
    </div>
  )
}

function Panel(props: { children: ReactNode; className?: string; stagger?: boolean }) {
  const stagger = props.stagger !== false

  return (
    <motion.section
      className={`pm-dashboard-card rounded-2xl border border-[#dfe5ec] bg-white p-4 text-[#152039] shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-6 ${props.className ?? ''}`}
      initial={stagger ? undefined : false}
      variants={stagger ? panelVariants : undefined}
    >
      {props.children}
    </motion.section>
  )
}

function PanelHeader(props: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{props.title}</h2>
      <p className="mt-1 text-sm opacity-60">{props.description}</p>
    </div>
  )
}

function MetricCard(props: {
  accent: 'amber' | 'blue' | 'green' | 'violet'
  detail: string
  icon: LucideIcon
  label: string
  value: string
}) {
  const Icon = props.icon
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-[#00a2e0]/15 text-[#00a2e0]',
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <motion.article
      className="pm-dashboard-card rounded-2xl border border-[#dfe5ec] bg-white p-4 text-[#152039] shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5"
      variants={panelVariants}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-60">{props.label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{props.value}</p>
          <p className="mt-1.5 text-xs font-medium opacity-60">{props.detail}</p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors[props.accent]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </motion.article>
  )
}

function Avatar({ name }: { name?: string | null }) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('ro'))
    .join('')

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00a2e0]/15 text-xs font-bold text-[#00a2e0]">
      {initials || <UserRound className="size-4" />}
    </div>
  )
}

function StatusBadge({ status }: { status: ManagedApplicationStatus }) {
  const config = {
    absent: { className: 'bg-red-50 text-red-700 ring-red-100', label: 'Absent' },
    'coordonator-review': {
      className: 'bg-amber-50 text-amber-700 ring-amber-100',
      label: 'Coordonatori',
    },
    interview: { className: 'bg-blue-50 text-blue-700 ring-blue-100', label: 'Interview' },
    interviewed: { className: 'bg-violet-50 text-violet-700 ring-violet-100', label: 'Decizie' },
    'interview-passed': {
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      label: 'Acceptat',
    },
    'interview-rejected': { className: 'bg-red-50 text-red-700 ring-red-100', label: 'Respins' },
    'submission-rejected': {
      className: 'bg-slate-100 text-slate-500 ring-slate-200',
      label: 'Respins',
    },
    'submission-waitlisted': {
      className: 'bg-amber-50 text-amber-700 ring-amber-100',
      label: 'Asteptare',
    },
    'interview-withdrawn': {
      className: 'bg-slate-100 text-slate-500 ring-slate-200',
      label: 'Retras',
    },
    submitted: { className: 'bg-slate-100 text-slate-700 ring-slate-200', label: 'Nou' },
  }[status]

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function MailStatusBadges({ application }: { application: ManagedApplication }) {
  const badges: ReactNode[] = []

  if (application.status === 'interview' || application.interviewMailSentAt) {
    badges.push(
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
          application.interviewMailSentAt
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
        key="interview-mail"
      >
        {application.interviewMailSentAt ? 'Interview mail trimis' : 'Interview mail netrimis'}
      </span>,
    )
  }

  if (
    application.status === 'interview-passed' ||
    application.status === 'interview-rejected' ||
    application.finalMailSentAt
  ) {
    badges.push(
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
          application.finalMailSentAt
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
        key="final-mail"
      >
        {application.finalMailSentAt ? 'Final mail trimis' : 'Final mail netrimis'}
      </span>,
    )
  }

  return <>{badges}</>
}

function InlineEmpty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm font-medium opacity-60">{text}</div>
}

function calculateMetrics(
  applications: ManagedApplication[],
  commissions: ManagedCommission[],
  recruitmentPool: ManagedRecruitmentPoolApplicant[],
) {
  const assigned = applications.filter((application) => Boolean(application.commissionId)).length
  const pendingFinalDecision = applications.filter((application) =>
    ['interview', 'interviewed'].includes(application.status),
  ).length
  const pendingCoordinatorReview = recruitmentPool.length
  const submitted = applications.filter((application) => application.status === 'submitted').length

  return {
    acceptedAspirers: applications.filter(
      (application) => application.status === 'interview-passed',
    ).length,
    actionNeeded: submitted + pendingCoordinatorReview + pendingFinalDecision,
    assigned,
    inRecruitment: applications.filter(
      (application) => application.status !== 'submission-rejected',
    ).length,
    pendingCoordinatorReview,
    pendingFinalDecision,
    reviewsCompleted: commissions.reduce(
      (sum, commission) => sum + commission.recruitmentReviews.length,
      0,
    ),
  }
}

function normalizeApplicationPatch(
  patch: ServerApplicationPatch,
  user: ManagedUser,
): ApplicationPatch {
  if (!patch.interviewNotes) {
    const { interviewNotes: _interviewNotes, ...rest } = patch
    return rest
  }

  return {
    ...patch,
    interviewNotes: patch.interviewNotes.map((note) => {
      if ('author' in note) return note
      return {
        author: note.authorId === user.id ? user : null,
        createdAt: note.createdAt,
        id: note.id,
        note: note.note,
      }
    }),
  }
}

function formatMailBatchNotice(result: MailBatchResult) {
  const parts = [
    `${result.sent} trimise`,
    `${result.skipped} deja trimise`,
    `${result.failed} esuate`,
  ]
  if (result.warnings.length > 0) parts.push(`${result.warnings.length} avertizari`)
  return `Batch email finalizat: ${parts.join(', ')}.`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data invalida'

  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function percentageOf(value: number, total: number) {
  if (!total || !Number.isFinite(value) || !Number.isFinite(total)) return 0
  return Math.round((value / total) * 100)
}
