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
  FileText,
  LayoutDashboard,
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
  | 'submission-rejected'
  | 'interview'
  | 'interviewed'
  | 'absent'
  | 'interview-passed'
  | 'interview-rejected'

export type ManagedInterviewNote = {
  author: ManagedUser | null
  createdAt: string
  id: string
  note: string
}

export type ManagedApplication = {
  aspirerUserId?: string
  commissionId: string
  createdAt: string
  email: string
  finalMailSentAt: string | null
  formAnswers: {
    field: string
    value: string
  }[]
  id: string
  interviewDate: string | null
  interviewMailSentAt: string | null
  interviewNotes: ManagedInterviewNote[]
  knownCoordinatorIds: string[]
  name: string
  notes: string
  reviewedCoordinatorIds: string[]
  status: ManagedApplicationStatus
}

type Tab = 'overview' | 'forms' | 'coordinator-review' | 'assignment' | 'interviews' | 'results'

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

type BulkReviewResult = {
  applications: ServerApplicationPatch[]
  failed: number
  skipped: number
  updated: number
  warnings: string[]
}

type ActionResult = {
  application?: ServerApplicationPatch
  applications?: ServerApplicationPatch[]
  bulkReview?: BulkReviewResult
  mailBatch?: MailBatchResult
  message?: string
}

type ActionBody = Record<string, unknown>

const tabs: Array<{ icon: LucideIcon; label: string; value: Tab }> = [
  { icon: LayoutDashboard, label: 'Overview', value: 'overview' },
  { icon: ClipboardCheck, label: 'Forms', value: 'forms' },
  { icon: Users, label: 'Coordinator Review', value: 'coordinator-review' },
  { icon: BriefcaseBusiness, label: 'Assignment', value: 'assignment' },
  { icon: FileText, label: 'Interviews', value: 'interviews' },
  { icon: MailCheck, label: 'Results & Mails', value: 'results' },
]

const statusLabels: Record<ManagedApplicationStatus, string> = {
  absent: 'Absent',
  'coordonator-review': 'Review coordonatori',
  interview: 'Interview',
  interviewed: 'Interview finalizat',
  'interview-passed': 'Aspirant acceptat',
  'interview-rejected': 'Respins dupa interview',
  'submission-rejected': 'Formular respins',
  submitted: 'Neverificat',
}

const panelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
} satisfies Variants

export default function HRRecruitmentDashboard(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  user: ManagedUser
}) {
  const { applications: initialApplications, commissions, user } = props
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { setHeaderTheme } = useHeaderTheme()
  const [applications, setApplications] = useState(initialApplications)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [query, setQuery] = useState('')
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    setApplications(initialApplications)
  }, [initialApplications])

  const filteredApplications = useMemo(
    () => filterApplications(applications, commissions, query),
    [applications, commissions, query],
  )
  const detailApplication =
    applications.find((application) => application.id === detailApplicationId) ?? null
  const metrics = useMemo(
    () => calculateMetrics(applications, commissions),
    [applications, commissions],
  )
  const tabCounts = useMemo(() => calculateTabCounts(applications), [applications])

  function applyApplicationPatch(patch: ServerApplicationPatch) {
    const normalizedPatch = normalizeApplicationPatch(patch, user)

    setApplications((current) =>
      current.map((application) =>
        application.id === normalizedPatch.id
          ? { ...application, ...normalizedPatch }
          : application,
      ),
    )
  }

  async function runAction<T extends ActionBody>(body: T, busyLabel: string) {
    setBusyKey(busyLabel)
    setNotice(null)

    try {
      const response = await fetch('/members/recruitment/applications', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as ActionResult

      if (!response.ok) {
        throw new Error(result.message || 'Actiunea nu a putut fi salvata.')
      }

      if (result.application) applyApplicationPatch(result.application)
      if (result.applications) result.applications.forEach(applyApplicationPatch)
      if (result.bulkReview) {
        result.bulkReview.applications.forEach(applyApplicationPatch)
        setSelectedFormIds((current) =>
          current.filter(
            (id) => !result.bulkReview?.applications.some((application) => application.id === id),
          ),
        )
      }

      setNotice({
        kind: 'success',
        message: formatActionNotice(result),
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

  return (
    <div
      className="pm-dashboard min-h-screen bg-[#f4f6f8] text-[#152039]"
      data-reduce-motion={prefersReducedMotion ? 'true' : undefined}
    >
      <section className="halftone-background relative overflow-hidden bg-[#141e34] px-4 pb-6 pt-24 text-white sm:px-6 sm:pb-8 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-[#00a2e0] to-transparent" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:mb-7 sm:flex-row sm:items-center sm:gap-4">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium opacity-65 transition hover:opacity-100"
              href="/members"
            >
              <ArrowLeft className="size-4" />
              Dashboard membri
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-xs opacity-70 sm:text-sm">
              <span>Conectat ca {user.name}</span>
              <Link
                className="font-semibold text-[#56c9f5] hover:text-white"
                href="/members/commissions"
              >
                Vezi comisii
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#00a2e0] bg-[#00a2e0]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#56c9f5]">
                  HR Command Center
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/65">
                  Recruitment
                </span>
              </div>
              <h1 className="max-w-4xl break-words text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Recruitment pentru toate comisiile
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-70">
                <span className="inline-flex items-center gap-2">
                  <BriefcaseBusiness className="size-4 text-[#56c9f5]" />
                  {commissions.length} comisii active
                </span>
                <span className="inline-flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-[#56c9f5]" />
                  {metrics.actionNeeded} actiuni deschise
                </span>
              </div>
            </div>

            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
              <input
                className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.08] pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/45 focus:border-[#00a2e0]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cauta candidat, email sau comisie"
                type="search"
                value={query}
              />
            </div>
          </div>

          <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:mt-8 sm:px-0">
            {tabs.map((item) => {
              const Icon = item.icon
              const count = tabCounts[item.value] ?? 0
              return (
                <button
                  className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition sm:h-12 sm:px-4 ${
                    tab === item.value ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                  }`}
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {item.label}
                  {count > 0 && item.value !== 'overview' && (
                    <span className="min-w-5 rounded-full bg-[#f7a81b] px-1.5 py-0.5 text-center text-[10px] font-bold text-[#101a31]">
                      {count}
                    </span>
                  )}
                  {tab === item.value && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#00a2e0]" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </section>

      <motion.main
        animate="visible"
        className="mx-auto max-w-[1440px] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9"
        initial={prefersReducedMotion ? false : 'hidden'}
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: {
            opacity: 1,
            transition: {
              delayChildren: 0.04,
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
              staggerChildren: 0.075,
            },
            y: 0,
          },
        }}
      >
        {notice && <NoticeCard notice={notice} />}

        {tab === 'overview' && (
          <Overview applications={applications} commissions={commissions} metrics={metrics} />
        )}
        {tab === 'forms' && (
          <FormsTab
            applications={filteredApplications}
            busyKey={busyKey}
            onAction={runAction}
            onSelectApplication={setDetailApplicationId}
            selectedFormIds={selectedFormIds}
            setSelectedFormIds={setSelectedFormIds}
          />
        )}
        {tab === 'coordinator-review' && (
          <CoordinatorReviewTab
            applications={filteredApplications}
            commissions={commissions}
            onSelectApplication={setDetailApplicationId}
          />
        )}
        {tab === 'assignment' && (
          <AssignmentTab
            applications={filteredApplications}
            busyKey={busyKey}
            commissions={commissions}
            onAction={runAction}
            onSelectApplication={setDetailApplicationId}
          />
        )}
        {tab === 'interviews' && (
          <InterviewsTab
            applications={filteredApplications}
            busyKey={busyKey}
            commissions={commissions}
            onAction={runAction}
            onSelectApplication={setDetailApplicationId}
          />
        )}
        {tab === 'results' && (
          <ResultsTab
            applications={filteredApplications}
            busyKey={busyKey}
            commissions={commissions}
            onAction={runAction}
            onSelectApplication={setDetailApplicationId}
          />
        )}
      </motion.main>

      <ApplicationDetailDrawer
        application={detailApplication}
        commissions={commissions}
        onClose={() => setDetailApplicationId(null)}
      />
    </div>
  )
}

function Overview(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  metrics: ReturnType<typeof calculateMetrics>
}) {
  const { applications, commissions, metrics } = props
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
          detail={`${metrics.submitted} formulare noi`}
          icon={ClipboardCheck}
          label="Actiuni HR"
          value={String(metrics.actionNeeded)}
        />
        <MetricCard
          accent="green"
          detail={`${metrics.scheduledInterviews} programati`}
          icon={UserCheck}
          label="Interview"
          value={String(metrics.interviewPool)}
        />
        <MetricCard
          accent="violet"
          detail={`${metrics.finalPending} mailuri finale netrimise`}
          icon={Sparkles}
          label="Acceptati final"
          value={String(metrics.accepted)}
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
          <PanelHeader description="Ultimele aplicatii importate din formular." title="Recent" />
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

function FormsTab(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onSelectApplication: (applicationId: string) => void
  selectedFormIds: string[]
  setSelectedFormIds: (ids: string[]) => void
}) {
  const {
    applications,
    busyKey,
    onAction,
    onSelectApplication,
    selectedFormIds,
    setSelectedFormIds,
  } = props
  const submitted = applications.filter((application) => application.status === 'submitted')
  const allSelected =
    submitted.length > 0 && submitted.every((item) => selectedFormIds.includes(item.id))

  function toggleApplication(id: string) {
    setSelectedFormIds(
      selectedFormIds.includes(id)
        ? selectedFormIds.filter((item) => item !== id)
        : [...selectedFormIds, id],
    )
  }

  function toggleAll() {
    setSelectedFormIds(allSelected ? [] : submitted.map((application) => application.id))
  }

  async function bulkReview(status: 'coordonator-review' | 'submission-rejected') {
    await onAction(
      {
        action: 'bulk-review-submissions',
        applicationIds: selectedFormIds,
        status,
      },
      `bulk-${status}`,
    )
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        description="Primul filtru pentru raspunsurile din formular. Selecteaza candidati pentru actiuni bulk sau lucreaza individual."
        title="Review formulare"
      />
      <Panel>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold">{submitted.length} formulare in asteptare</p>
            <p className="mt-1 text-xs text-[#748094]">{selectedFormIds.length} selectate</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f8fafc]"
              onClick={toggleAll}
              type="button"
            >
              <CheckCircle2 className="size-3.5" />
              {allSelected ? 'Deselecteaza' : 'Selecteaza tot'}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={selectedFormIds.length === 0 || busyKey === 'bulk-coordonator-review'}
              onClick={() => void bulkReview('coordonator-review')}
              type="button"
            >
              <Check className="size-3.5" />
              Trecere bulk
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
              disabled={selectedFormIds.length === 0 || busyKey === 'bulk-submission-rejected'}
              onClick={() => void bulkReview('submission-rejected')}
              type="button"
            >
              <XCircle className="size-3.5" />
              Respingere bulk
            </button>
          </div>
        </div>

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
                    Respinge
                  </button>
                </>
              }
              application={application}
              checked={selectedFormIds.includes(application.id)}
              commissions={[]}
              key={application.id}
              onOpenDetails={() => onSelectApplication(application.id)}
              onToggleChecked={() => toggleApplication(application.id)}
            />
          ))}
          {submitted.length === 0 && <InlineEmpty text="Nu exista formulare in asteptare." />}
        </div>
      </Panel>
    </div>
  )
}

function CoordinatorReviewTab(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, commissions, onSelectApplication } = props
  const candidates = applications.filter(
    (application) => application.status === 'coordonator-review',
  )

  return (
    <div className="grid gap-5">
      <SectionHeader
        description="Urmareste cine a finalizat verificarea si ce coordonatori au marcat conflicte."
        title="Coordinator Review"
      />
      <CoordinatorReviewStatus commissions={commissions} />
      <Panel>
        <PanelHeader
          description="Candidatii asteapta asignarea dupa ce fiecare comisie are review-ul complet."
          title="Candidati in verificare"
        />
        <div className="mt-5 grid gap-3">
          {candidates.map((application) => (
            <ApplicationCard
              application={application}
              commissions={commissions}
              key={application.id}
              onOpenDetails={() => onSelectApplication(application.id)}
            />
          ))}
          {candidates.length === 0 && <InlineEmpty text="Nu exista candidati in review." />}
        </div>
      </Panel>
    </div>
  )
}

function AssignmentTab(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, busyKey, commissions, onAction, onSelectApplication } = props
  const candidates = applications.filter(
    (application) => application.status === 'coordonator-review',
  )

  return (
    <div className="grid gap-5">
      <SectionHeader
        description="Alege comisia doar cand toti coordonatorii ei au terminat verificarea si niciunul nu cunoaste candidatul."
        title="Assignment"
      />
      <Panel>
        <PanelHeader
          description="Matricea arata transparent de ce o comisie este eligibila sau blocata."
          title="Matrice eligibilitate"
        />
        <div className="mt-5 grid gap-4">
          {candidates.map((application) => (
            <AssignmentCard
              application={application}
              busyKey={busyKey}
              commissions={commissions}
              key={application.id}
              onAction={onAction}
              onOpenDetails={() => onSelectApplication(application.id)}
            />
          ))}
          {candidates.length === 0 && <InlineEmpty text="Nu exista candidati de asignat." />}
        </div>
      </Panel>
    </div>
  )
}

function AssignmentCard(props: {
  application: ManagedApplication
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onOpenDetails: () => void
}) {
  const { application, busyKey, commissions, onAction, onOpenDetails } = props

  return (
    <article className="rounded-xl border border-[#e4e8ef] bg-white p-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={application.name} />
            <div className="min-w-0">
              <p className="break-words text-sm font-bold">{application.name}</p>
              <p className="mt-0.5 break-words text-xs text-[#6b7688]">{application.email}</p>
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-[#748094]">
            Cunoscut de{' '}
            {getKnownCoordinators(application, commissions)
              .map((item) => item.name)
              .join(', ') || 'nimeni'}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f8fafc]"
          onClick={onOpenDetails}
          type="button"
        >
          <FileText className="size-3.5" />
          Detalii
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {commissions.map((commission) => {
          const eligibility = getCommissionEligibility(application, commission)
          return (
            <div
              className={`rounded-xl border p-3 ${
                eligibility.eligible
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-[#e4e8ef] bg-[#f8fafc]'
              }`}
              key={commission.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{commission.label}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#748094]">
                    {commission.mandateLabel}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    eligibility.eligible ? 'bg-white text-emerald-700' : 'bg-white text-amber-700'
                  }`}
                >
                  {eligibility.eligible ? 'Eligibila' : 'Blocata'}
                </span>
              </div>
              <p className="mt-3 min-h-9 text-xs font-semibold text-[#536071]">
                {eligibility.reasons.join(' ')}
              </p>
              <button
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00a2e0] px-3 text-xs font-bold text-white transition hover:bg-[#008fc7] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!eligibility.eligible || busyKey === `assign-${application.id}`}
                onClick={() =>
                  void onAction(
                    {
                      action: 'assign-candidate',
                      applicationId: application.id,
                      commissionId: commission.id,
                    },
                    `assign-${application.id}`,
                  )
                }
                type="button"
              >
                <Check className="size-3.5" />
                Trimite aici
              </button>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function InterviewsTab(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, busyKey, commissions, onAction, onSelectApplication } = props
  const candidates = applications.filter((application) =>
    ['interview', 'interviewed', 'absent'].includes(application.status),
  )

  return (
    <div className="grid gap-5">
      <SectionHeader
        description="Monitorizeaza programarile, mailurile si notitele din timpul interview-urilor."
        title="Interviews"
      />
      <Panel>
        <div className="grid gap-3">
          {candidates.map((application) => (
            <InterviewCard
              application={application}
              busyKey={busyKey}
              commissions={commissions}
              key={application.id}
              onAction={onAction}
              onOpenDetails={() => onSelectApplication(application.id)}
            />
          ))}
          {candidates.length === 0 && (
            <InlineEmpty text="Nu exista candidati in etapa de interview." />
          )}
        </div>
      </Panel>
    </div>
  )
}

function InterviewCard(props: {
  application: ManagedApplication
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onOpenDetails: () => void
}) {
  const { application, busyKey, commissions, onAction, onOpenDetails } = props
  const [note, setNote] = useState('')

  return (
    <ApplicationCard
      actions={
        <>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 text-xs font-bold text-violet-700 ring-1 ring-violet-100 transition hover:bg-violet-100 disabled:opacity-60"
            disabled={busyKey === `interviewed-${application.id}`}
            onClick={() =>
              void onAction(
                {
                  action: 'final-decision',
                  applicationId: application.id,
                  status: 'interviewed',
                },
                `interviewed-${application.id}`,
              )
            }
            type="button"
          >
            <CheckCircle2 className="size-3.5" />
            Interview facut
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
            disabled={busyKey === `absent-${application.id}`}
            onClick={() =>
              void onAction(
                {
                  action: 'final-decision',
                  applicationId: application.id,
                  status: 'absent',
                },
                `absent-${application.id}`,
              )
            }
            type="button"
          >
            <XCircle className="size-3.5" />
            Absent
          </button>
        </>
      }
      application={application}
      commissions={commissions}
      footer={
        <NoteComposer
          application={application}
          busyKey={busyKey}
          note={note}
          onAction={onAction}
          setNote={setNote}
        />
      }
      onOpenDetails={onOpenDetails}
    />
  )
}

function ResultsTab(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  onSelectApplication: (applicationId: string) => void
}) {
  const { applications, busyKey, commissions, onAction, onSelectApplication } = props
  const candidates = applications.filter((application) =>
    ['interview', 'interviewed', 'absent', 'interview-passed', 'interview-rejected'].includes(
      application.status,
    ),
  )

  return (
    <div className="grid gap-5">
      <SectionHeader
        description="Seteaza rezultatele finale si trimite manual batch-urile de email cand runda este gata."
        title="Results & Mails"
      />
      <MailBatchActions applications={applications} busyKey={busyKey} onAction={onAction} />
      <Panel>
        <PanelHeader
          description="Candidatii acceptati/respinsi primesc email doar dupa apasarea butonului de batch final."
          title="Decizii finale"
        />
        <div className="mt-5 grid gap-3">
          {candidates.map((application) => (
            <ApplicationCard
              actions={
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
                    Accepta
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
              }
              application={application}
              commissions={commissions}
              key={application.id}
              onOpenDetails={() => onSelectApplication(application.id)}
            />
          ))}
          {candidates.length === 0 && (
            <InlineEmpty text="Nu exista candidati pentru decizii finale." />
          )}
        </div>
      </Panel>
    </div>
  )
}

function MailBatchActions(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
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
          description="Batch-urile trimit doar catre candidatii eligibili care nu au primit deja emailul rundei."
          title="Emailuri globale"
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

function NoteComposer(props: {
  application: ManagedApplication
  busyKey: string | null
  note: string
  onAction: <T extends ActionBody>(body: T, busyLabel: string) => Promise<ActionResult>
  setNote: (note: string) => void
}) {
  const { application, busyKey, note, onAction, setNote } = props

  return (
    <div className="mt-4 grid gap-3 border-t border-[#edf0f4] pt-4">
      <div className="space-y-2">
        {application.interviewNotes.slice(0, 3).map((interviewNote) => (
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
  )
}

function CoordinatorReviewStatus({ commissions }: { commissions: ManagedCommission[] }) {
  return (
    <Panel>
      <PanelHeader
        description="Statusul confirmarii pentru fiecare coordonator din fiecare comisie."
        title="Status coordonatori"
      />
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {commissions.map((commission) => {
          const completedIDs = new Set(
            commission.recruitmentReviews.map((review) => review.coordinatorId),
          )
          const completed = commission.coordinators.filter((coordinator) =>
            completedIDs.has(coordinator.id),
          )

          return (
            <div
              className="rounded-xl border border-[#e4e8ef] bg-[#f8fafc] p-3"
              key={commission.id}
            >
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
    </Panel>
  )
}

function ApplicationCard(props: {
  actions?: ReactNode
  application: ManagedApplication
  checked?: boolean
  commissions: ManagedCommission[]
  footer?: ReactNode
  onOpenDetails?: () => void
  onToggleChecked?: () => void
}) {
  const { actions, application, checked, commissions, footer, onOpenDetails, onToggleChecked } =
    props
  const commission = getApplicationCommission(application, commissions)
  const knownCoordinators = getKnownCoordinators(application, commissions)

  return (
    <article className="rounded-xl border border-[#e4e8ef] bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {onToggleChecked && (
              <input
                checked={Boolean(checked)}
                className="size-4 rounded border-[#d9dfe7]"
                onChange={onToggleChecked}
                type="checkbox"
              />
            )}
            <Avatar name={application.name} />
            <div className="min-w-0">
              <p className="break-words text-sm font-bold">{application.name}</p>
              <p className="mt-0.5 break-words text-xs text-[#6b7688]">{application.email}</p>
            </div>
            <StatusBadge status={application.status} />
            <MailStatusBadges application={application} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#748094]">
            <span className="rounded-md bg-[#f7f9fc] px-2 py-1">
              {commission?.label || 'Comisie neasignata'}
            </span>
            <span className="rounded-md bg-[#f7f9fc] px-2 py-1">
              {application.interviewDate ? formatDate(application.interviewDate) : 'Neprogramat'}
            </span>
            <span className="rounded-md bg-[#f7f9fc] px-2 py-1">
              Cunoscut de {knownCoordinators.length || 0}
            </span>
          </div>
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
  commissions: ManagedCommission[]
  onClose: () => void
}) {
  const { application, commissions, onClose } = props
  if (!application) return null

  const commission = getApplicationCommission(application, commissions)
  const knownCoordinators = getKnownCoordinators(application, commissions)

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
            <MailStatusBadges application={application} />
            <span className="rounded-full bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-bold text-[#536071]">
              {commission?.label || 'Comisie neasignata'}
            </span>
            <span className="rounded-full bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-bold text-[#536071]">
              {application.interviewDate ? formatDate(application.interviewDate) : 'Neprogramat'}
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
                    {answer.field}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#344054]">
                    {answer.value || '-'}
                  </dd>
                </div>
              ))}
              {application.formAnswers.length === 0 && (
                <div className="rounded-lg border border-[#edf0f4] bg-[#fafbfc] p-3 text-sm text-[#748094]">
                  Nu exista raspunsuri salvate.
                </div>
              )}
            </dl>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#748094]">
              Marcaje coordonatori
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {knownCoordinators.map((coordinator) => (
                <span
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
                  key={coordinator.id}
                >
                  {coordinator.name}
                </span>
              ))}
              {knownCoordinators.length === 0 && (
                <span className="text-sm font-semibold text-[#748094]">
                  Nimeni nu l-a marcat cunoscut.
                </span>
              )}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#748094]">
              Note interview
            </h3>
            <div className="mt-3 grid gap-3">
              {application.interviewNotes.map((note) => (
                <div className="rounded-lg border border-[#edf0f4] bg-[#fafbfc] p-3" key={note.id}>
                  <p className="text-sm font-bold">{note.author?.name || 'Membru board'}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#536071]">{note.note}</p>
                  <p className="mt-1 text-xs text-[#8a94a6]">{formatDate(note.createdAt)}</p>
                </div>
              ))}
              {application.interviewNotes.length === 0 && (
                <div className="rounded-lg border border-[#edf0f4] bg-[#fafbfc] p-3 text-sm text-[#748094]">
                  Nu exista note.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

function SectionHeader(props: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{props.title}</h2>
      <p className="mt-1 text-sm text-[#748094]">{props.description}</p>
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

function calculateMetrics(applications: ManagedApplication[], commissions: ManagedCommission[]) {
  const submitted = applications.filter((application) => application.status === 'submitted').length
  const assignmentPending = applications.filter(
    (application) => application.status === 'coordonator-review',
  ).length
  const interviewPending = applications.filter(
    (application) => application.status === 'interview' && !application.interviewMailSentAt,
  ).length
  const finalPending = applications.filter(
    (application) =>
      ['interview-passed', 'interview-rejected'].includes(application.status) &&
      !application.finalMailSentAt,
  ).length

  return {
    accepted: applications.filter((application) => application.status === 'interview-passed')
      .length,
    actionNeeded: submitted + assignmentPending + interviewPending + finalPending,
    assignmentPending,
    commissions: commissions.length,
    finalPending,
    interviewPool: applications.filter((application) =>
      ['interview', 'interviewed', 'absent'].includes(application.status),
    ).length,
    scheduledInterviews: applications.filter((application) => Boolean(application.interviewDate))
      .length,
    submitted,
  }
}

function calculateTabCounts(applications: ManagedApplication[]): Record<Tab, number> {
  return {
    assignment: applications.filter((application) => application.status === 'coordonator-review')
      .length,
    'coordinator-review': applications.filter(
      (application) => application.status === 'coordonator-review',
    ).length,
    forms: applications.filter((application) => application.status === 'submitted').length,
    interviews: applications.filter((application) =>
      ['interview', 'interviewed', 'absent'].includes(application.status),
    ).length,
    overview: 0,
    results: applications.filter((application) =>
      ['interview', 'interviewed', 'absent', 'interview-passed', 'interview-rejected'].includes(
        application.status,
      ),
    ).length,
  }
}

function getCommissionEligibility(application: ManagedApplication, commission: ManagedCommission) {
  const completedCoordinatorIDs = new Set(
    commission.recruitmentReviews.map((review) => review.coordinatorId),
  )
  const pending = commission.coordinators.filter(
    (coordinator) => !completedCoordinatorIDs.has(coordinator.id),
  )
  const conflicts = commission.coordinators.filter((coordinator) =>
    application.knownCoordinatorIds.includes(coordinator.id),
  )
  const reasons: string[] = []

  if (commission.coordinators.length === 0) reasons.push('Comisia nu are coordonatori.')
  if (pending.length > 0) {
    reasons.push(
      `Review nefinalizat: ${pending.map((coordinator) => coordinator.name).join(', ')}.`,
    )
  }
  if (conflicts.length > 0) {
    reasons.push(`Conflict: ${conflicts.map((coordinator) => coordinator.name).join(', ')}.`)
  }

  return {
    eligible: commission.coordinators.length > 0 && pending.length === 0 && conflicts.length === 0,
    reasons:
      reasons.length > 0 ? reasons : ['Toti coordonatorii au confirmat si nu exista conflict.'],
  }
}

function filterApplications(
  applications: ManagedApplication[],
  commissions: ManagedCommission[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ro')
  if (!normalizedQuery) return applications

  return applications.filter((application) => {
    const commission = getApplicationCommission(application, commissions)
    return [
      application.name,
      application.email,
      application.status,
      statusLabels[application.status],
      commission?.label ?? '',
      commission?.mandateLabel ?? '',
    ].some((value) => value.toLocaleLowerCase('ro').includes(normalizedQuery))
  })
}

function getApplicationCommission(
  application: ManagedApplication,
  commissions: ManagedCommission[],
) {
  return commissions.find((commission) => commission.id === application.commissionId) ?? null
}

function getKnownCoordinators(application: ManagedApplication, commissions: ManagedCommission[]) {
  return commissions
    .flatMap((commission) => commission.coordinators)
    .filter(
      (coordinator, index, all) => all.findIndex((item) => item.id === coordinator.id) === index,
    )
    .filter((coordinator) => application.knownCoordinatorIds.includes(coordinator.id))
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

function formatActionNotice(result: ActionResult) {
  if (result.bulkReview) {
    const parts = [`${result.bulkReview.updated} actualizati`]
    if (result.bulkReview.skipped) parts.push(`${result.bulkReview.skipped} sariti`)
    if (result.bulkReview.failed) parts.push(`${result.bulkReview.failed} esuati`)
    if (result.bulkReview.warnings.length)
      parts.push(`${result.bulkReview.warnings.length} avertismente`)
    return `Actiune bulk finalizata: ${parts.join(', ')}.`
  }

  if (result.mailBatch) {
    const parts = [`${result.mailBatch.sent} trimise`, `${result.mailBatch.skipped} sarite`]
    if (result.mailBatch.failed) parts.push(`${result.mailBatch.failed} esuate`)
    if (result.mailBatch.warnings.length)
      parts.push(`${result.mailBatch.warnings.length} avertismente`)
    return `Batch email finalizat: ${parts.join(', ')}.`
  }

  return 'Modificarile au fost salvate.'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data invalida'

  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function percentageOf(value: number, total: number) {
  if (!total || !Number.isFinite(value) || !Number.isFinite(total)) return 0
  return Math.round((value / total) * 100)
}
