'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  LockKeyhole,
  Mail,
  MailCheck,
  Plus,
  Search,
  Send,
  Settings2,
  UserCheck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { GooglePlaceAutocomplete } from '@/components/GooglePlaceAutocomplete'
import {
  getRecruitmentWorkflowState,
  recruitmentSteps,
  type RecruitmentStepKey,
  type WorkflowApplicationStatus,
} from '@/utilities/recruitmentWorkflow'
import type { GooglePlaceLocation } from '@/utilities/googlePlace'
import { useHeaderTheme } from '@/providers/HeaderTheme'

export type ManagedUser = {
  email: string
  id: string
  name: string
  role?: string | null
}

export type ManagedUpload = {
  field: string
  filename: string
  id: string
  label: string
  mimeType: string | null
  previewURL: string | null
  url: string | null
}

export type ManagedInterviewNote = {
  author: ManagedUser | null
  createdAt: string
  id: string
  note: string
}

export type ManagedInterval = {
  breaks: Array<{ endTime: string | null; startTime: string | null }>
  endDateTime: string | null
  interviewDuration: number | null
  location: GooglePlaceLocation | null
  pauseBetween: number | null
  startDateTime: string | null
}

export type ManagedCommission = {
  commissionNumber: number
  coordinators: ManagedUser[]
  id: string
  interviewIntervals: ManagedInterval[]
  label: string
  recruitmentReviews: Array<{ confirmedAt: string; coordinatorId: string }>
}

export type ManagedApplicationStatus = WorkflowApplicationStatus

export type ManagedApplication = {
  aspirerUserId: string
  commissionId: string
  createdAt: string
  email: string
  finalMailSentAt: string | null
  formAnswers: Array<{ field: string; label: string; value: string }>
  formUploads: ManagedUpload[]
  id: string
  instagram: string
  interviewAttendance: 'scheduled' | 'late' | 'absent' | 'completed' | null
  interviewDate: string | null
  interviewMailSentAt: string | null
  interviewNotes: ManagedInterviewNote[]
  knownCoordinatorIds: string[]
  name: string
  notes: string
  phone: string
  reviewedCoordinatorIds: string[]
  status: ManagedApplicationStatus
}

export type ManagedRecruitmentConfig = {
  defaultInterviewDate: string | null
  interviewSchedulingDeadline: string | null
  recruitmentEndDate: string | null
  recruitmentStartDate: string | null
}

type Notice = { kind: 'error' | 'success'; message: string }

type ApplicationPatch = Partial<
  Pick<
    ManagedApplication,
    | 'aspirerUserId'
    | 'commissionId'
    | 'finalMailSentAt'
    | 'interviewAttendance'
    | 'interviewDate'
    | 'interviewMailSentAt'
    | 'knownCoordinatorIds'
    | 'notes'
    | 'reviewedCoordinatorIds'
    | 'status'
  >
> & {
  id: string
  interviewNotes?: Array<
    ManagedInterviewNote | { authorId: string; createdAt: string; id: string; note: string }
  >
}

type MailBatchResult = {
  failed: number
  sent: number
  skipped: number
  warnings: string[]
}

type ActionResult = {
  application?: ApplicationPatch
  bulkReview?: {
    applications: ApplicationPatch[]
    failed: number
    skipped: number
    updated: number
  }
  commission?: Partial<ManagedCommission> & { id: string }
  mailBatch?: MailBatchResult
  message?: string
  recruitmentConfig?: ManagedRecruitmentConfig
}

const reviewedStatuses = new Set<ManagedApplicationStatus>([
  'coordonator-review',
  'submission-waitlisted',
  'submission-rejected',
  'interview',
  'interview-withdrawn',
  'interviewed',
  'absent',
  'interview-passed',
  'interview-rejected',
])

const statusLabels: Record<ManagedApplicationStatus, string> = {
  absent: 'Absent',
  'coordonator-review': 'Acceptat',
  interview: 'Acceptat la interview',
  'interview-passed': 'Acceptat ca aspirant',
  'interview-rejected': 'Respins dupa interview',
  'interview-withdrawn': 'Retras',
  interviewed: 'Interview finalizat',
  submitted: '',
  'submission-rejected': 'Refuzat',
  'submission-waitlisted': 'Lista de asteptare',
}

export default function HRRecruitmentWizard(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
  config: ManagedRecruitmentConfig
  user: ManagedUser
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setHeaderTheme } = useHeaderTheme()
  const [applications, setApplications] = useState(props.applications)
  const [commissions, setCommissions] = useState(props.commissions)
  const [config, setConfig] = useState(props.config)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [detailID, setDetailID] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => setHeaderTheme('light'), [setHeaderTheme])
  useEffect(() => setApplications(props.applications), [props.applications])
  useEffect(() => setCommissions(props.commissions), [props.commissions])
  useEffect(() => setConfig(props.config), [props.config])

  const workflow = useMemo(
    () =>
      getRecruitmentWorkflowState({
        applications,
        commissions,
        config,
      }),
    [applications, commissions, config],
  )
  const selectedStep = normalizeStep(searchParams.get('step'))
  const maximumStepIndex = getMaximumOpenStepIndex(workflow.currentStep)
  const requestedStepIndex = recruitmentSteps.findIndex((step) => step.key === selectedStep)
  const activeStep = requestedStepIndex <= maximumStepIndex ? selectedStep : workflow.currentStep
  const detailApplication = applications.find((application) => application.id === detailID) ?? null
  const visibleApplications = useMemo(
    () => filterApplications(applications, commissions, query),
    [applications, commissions, query],
  )

  function selectStep(step: RecruitmentStepKey) {
    const index = recruitmentSteps.findIndex((item) => item.key === step)
    if (index > maximumStepIndex) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('step', step)
    router.replace(`/members/recruitment?${params.toString()}`, { scroll: false })
  }

  function patchApplication(patch: ApplicationPatch) {
    setApplications((current) =>
      current.map((application) => {
        if (application.id !== patch.id) return application
        return {
          ...application,
          ...patch,
          interviewNotes: patch.interviewNotes
            ? patch.interviewNotes.map((note) =>
                'authorId' in note
                  ? {
                      ...note,
                      author: note.authorId === props.user.id ? props.user : null,
                    }
                  : note,
              )
            : application.interviewNotes,
        }
      }),
    )
  }

  async function runAction(body: Record<string, unknown>, key: string) {
    setBusyKey(key)
    setNotice(null)
    try {
      const response = await fetch('/members/recruitment/applications', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as ActionResult
      if (!response.ok) throw new Error(result.message || 'Actiunea nu a putut fi salvata.')

      if (result.application) patchApplication(result.application)
      result.bulkReview?.applications.forEach(patchApplication)
      if (result.commission) {
        setCommissions((current) =>
          current.map((commission) =>
            commission.id === result.commission?.id
              ? { ...commission, ...result.commission }
              : commission,
          ),
        )
      }
      if (result.recruitmentConfig) setConfig(result.recruitmentConfig)

      setNotice({ kind: 'success', message: getActionMessage(result) })
      router.refresh()
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Actiunea nu a putut fi salvata.'
      setNotice({ kind: 'error', message })
      throw error
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] pb-12 pt-20 text-[#152039] sm:pt-24">
      <header className="border-b border-white/10 bg-[#141e34] px-4 py-7 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition hover:text-white"
                href="/members"
              >
                <ArrowLeft className="size-4" />
                Membri
              </Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#56c9f5]">
                HR recruitment
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Fluxul de selectie</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Fiecare etapa se deschide dupa ce toate conditiile din etapa anterioara sunt
                indeplinite.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeaderStat label="Formulare" value={String(workflow.metrics.submitted)} />
              <HeaderStat label="Asignati" value={String(workflow.metrics.assigned)} />
              <HeaderStat label="Programati" value={String(workflow.metrics.scheduled)} />
              <HeaderStat label="Decizii finale" value={String(workflow.metrics.finalPending)} />
            </div>
          </div>
          <div className="mt-6 grid gap-2 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
            <DeadlineValue
              label="Inscrieri"
              value={formatDateRange(config.recruitmentStartDate, config.recruitmentEndDate)}
            />
            <DeadlineValue
              label="Programari pana la"
              value={formatDate(config.interviewSchedulingDeadline)}
            />
            <DeadlineValue
              label="Etapa curenta"
              value={`Pasul ${recruitmentSteps.find((step) => step.key === workflow.currentStep)?.number || 1}`}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <WizardSidebar
          activeStep={activeStep}
          maximumStepIndex={maximumStepIndex}
          onSelect={selectStep}
          workflow={workflow}
        />

        <section className="min-w-0">
          {notice && <NoticeBanner notice={notice} />}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#748094]">
                Pasul {recruitmentSteps.find((step) => step.key === activeStep)?.number}
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {recruitmentSteps.find((step) => step.key === activeStep)?.label}
              </h2>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#748094]" />
              <input
                className="h-10 w-full rounded-lg border border-[#dfe5ec] bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#00a2e0]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cauta candidat sau comisie"
                type="search"
                value={query}
              />
            </div>
          </div>

          {activeStep === 'forms' && (
            <ApplicationReviewStep
              applications={visibleApplications}
              busyKey={busyKey}
              config={config}
              onAction={runAction}
              onOpen={setDetailID}
            />
          )}
          {activeStep === 'coordinator-review' && (
            <CoordinatorReviewStep applications={visibleApplications} commissions={commissions} />
          )}
          {activeStep === 'assignment' && (
            <AssignmentAndScheduleStep
              applications={visibleApplications}
              busyKey={busyKey}
              commissions={commissions}
              config={config}
              onAction={runAction}
              onOpen={setDetailID}
            />
          )}
          {activeStep === 'invitations' && (
            <InvitationStep
              applications={visibleApplications}
              busyKey={busyKey}
              deadline={config.interviewSchedulingDeadline}
              onAction={runAction}
            />
          )}
          {activeStep === 'interviews' && (
            <InterviewStep applications={visibleApplications} commissions={commissions} />
          )}
          {activeStep === 'results' && (
            <ResultStep applications={visibleApplications} busyKey={busyKey} onAction={runAction} />
          )}

          <StepFooter
            activeStep={activeStep}
            maximumStepIndex={maximumStepIndex}
            onSelect={selectStep}
            workflow={workflow}
          />
        </section>
      </div>

      <ApplicationDrawer
        application={detailApplication}
        busyKey={busyKey}
        onAction={runAction}
        onClose={() => setDetailID(null)}
      />
    </main>
  )
}

function WizardSidebar(props: {
  activeStep: RecruitmentStepKey
  maximumStepIndex: number
  onSelect: (step: RecruitmentStepKey) => void
  workflow: ReturnType<typeof getRecruitmentWorkflowState>
}) {
  return (
    <aside className="h-fit rounded-lg border border-[#dfe5ec] bg-white p-2 shadow-[0_8px_30px_rgba(22,34,57,0.04)] lg:sticky lg:top-24">
      <p className="px-3 pb-2 pt-3 text-xs font-black uppercase tracking-[0.12em] text-[#748094]">
        Etape recruitment
      </p>
      <nav className="grid gap-1">
        {recruitmentSteps.map((step, index) => {
          const gate = props.workflow.gates[step.key]
          const locked = index > props.maximumStepIndex
          const active = props.activeStep === step.key
          return (
            <button
              className={`flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                active
                  ? 'bg-[#141e34] text-white'
                  : locked
                    ? 'cursor-not-allowed text-[#9aa4b2]'
                    : 'text-[#344054] hover:bg-[#f4f6f8]'
              }`}
              disabled={locked}
              key={step.key}
              onClick={() => props.onSelect(step.key)}
              type="button"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  gate.complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : active
                      ? 'bg-[#00a2e0] text-white'
                      : 'bg-[#edf0f4] text-[#526071]'
                }`}
              >
                {gate.complete ? (
                  <Check className="size-4" />
                ) : locked ? (
                  <LockKeyhole className="size-3.5" />
                ) : (
                  step.number
                )}
              </span>
              <span className="min-w-0 flex-1 break-words">
                <span className="block break-words text-sm font-bold leading-tight">
                  {step.label}
                </span>
                {!gate.complete && !locked && gate.blockers[0] && (
                  <span
                    className={`mt-0.5 block break-words text-xs leading-4 ${active ? 'text-white/60' : 'text-[#748094]'}`}
                  >
                    {gate.blockers[0]}
                  </span>
                )}
              </span>
              {!locked && <ChevronRight className="size-4 opacity-55" />}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function ApplicationReviewStep(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  config: ManagedRecruitmentConfig
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
  onOpen: (id: string) => void
}) {
  const ordered = [...props.applications].sort((left, right) => {
    const reviewedDifference =
      Number(reviewedStatuses.has(left.status)) - Number(reviewedStatuses.has(right.status))
    return reviewedDifference || right.createdAt.localeCompare(left.createdAt)
  })
  const pending = ordered.filter((application) => application.status === 'submitted').length

  return (
    <div className="grid gap-5">
      <DeadlineEditor busyKey={props.busyKey} config={props.config} onAction={props.onAction} />
      <Panel>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-lg font-bold">Aplicatii</h3>
            <p className="mt-1 text-sm text-[#748094]">
              {pending} formulare au nevoie de o decizie.
            </p>
          </div>
          <span className="text-sm font-semibold text-[#526071]">{ordered.length} total</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-[#edf0f4] text-[11px] font-black uppercase tracking-[0.1em] text-[#748094]">
              <tr>
                <th className="px-3 py-3">Aplicant</th>
                <th className="px-3 py-3">Trimis</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Detalii</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {ordered.map((application) => (
                <tr key={application.id}>
                  <td className="px-3 py-3.5">
                    <p className="font-bold">{application.name}</p>
                    <p className="mt-0.5 text-xs text-[#748094]">{application.email}</p>
                  </td>
                  <td className="px-3 py-3.5 text-[#526071]">
                    {formatDate(application.createdAt)}
                  </td>
                  <td className="px-3 py-3.5">
                    {application.status !== 'submitted' && (
                      <StatusBadge status={application.status} />
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dfe5ec] px-3 text-xs font-bold transition hover:border-[#00a2e0] hover:text-[#007fb3]"
                      onClick={() => props.onOpen(application.id)}
                      type="button"
                    >
                      <FileText className="size-4" />
                      Vezi detalii
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ordered.length === 0 && <EmptyState text="Nu exista aplicatii pentru filtrul curent." />}
        </div>
      </Panel>
    </div>
  )
}

function CoordinatorReviewStep(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
}) {
  const pool = props.applications.filter(
    (application) => application.status === 'coordonator-review',
  )
  const coordinators = props.commissions.flatMap((commission) =>
    commission.coordinators.map((coordinator) => ({ commission, coordinator })),
  )

  return (
    <div className="grid gap-5">
      <InfoPanel
        icon={UserCheck}
        text="Coordonatorii primesc pool-ul acceptat in Panou Comisii. Fiecare candidat necesita o optiune explicita inainte ca un coordonator sa poata confirma."
        title="Verificare independenta"
      />
      <Panel>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-lg font-bold">Confirmari coordonatori</h3>
            <p className="mt-1 text-sm text-[#748094]">
              Pool curent: {pool.length} candidati acceptati.
            </p>
          </div>
          <Link
            className="text-sm font-bold text-[#007fb3] hover:underline"
            href="/members/commissions"
          >
            Deschide panoul comisiilor
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {coordinators.map(({ commission, coordinator }) => {
            const confirmed = commission.recruitmentReviews.some(
              (review) => review.coordinatorId === coordinator.id,
            )
            const checked = pool.filter((application) =>
              application.reviewedCoordinatorIds.includes(coordinator.id),
            ).length
            const known = pool.filter((application) =>
              application.knownCoordinatorIds.includes(coordinator.id),
            ).length
            return (
              <div
                className="rounded-md border border-[#e4e8ef] bg-[#f8fafc] p-3"
                key={`${commission.id}-${coordinator.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{coordinator.name}</p>
                    <p className="mt-0.5 text-xs text-[#748094]">{commission.label}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] truncate font-black uppercase ${confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {confirmed ? 'Confirmat' : 'In lucru'}
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-xs font-semibold text-[#526071]">
                  <span>
                    {checked}/{pool.length} verificati
                  </span>
                  <span>{known} cunoscuti</span>
                </div>
              </div>
            )
          })}
          {coordinators.length === 0 && <EmptyState text="Nu sunt configurati coordonatori." />}
        </div>
      </Panel>
      <Panel>
        <h3 className="text-lg font-bold">Marcaje cunoscut / conflict</h3>
        <div className="mt-4 divide-y divide-[#edf0f4]">
          {pool.map((application) => {
            const known = coordinators.filter(({ coordinator }) =>
              application.knownCoordinatorIds.includes(coordinator.id),
            )
            return (
              <div
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={application.id}
              >
                <div>
                  <p className="text-sm font-bold">{application.name}</p>
                  <p className="mt-0.5 text-xs text-[#748094]">
                    {application.phone || 'Fara telefon'} ·{' '}
                    {application.instagram || 'Fara Instagram'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {known.length ? (
                    known.map(({ commission, coordinator }) => (
                      <span
                        className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                        key={coordinator.id}
                      >
                        {commission.label}: {coordinator.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-semibold text-[#748094]">Fara marcaje</span>
                  )}
                </div>
              </div>
            )
          })}
          {pool.length === 0 && (
            <EmptyState text="Nu exista candidati in review-ul coordonatorilor." />
          )}
        </div>
      </Panel>
    </div>
  )
}

function AssignmentAndScheduleStep(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  commissions: ManagedCommission[]
  config: ManagedRecruitmentConfig
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
  onOpen: (id: string) => void
}) {
  const pool = props.applications.filter(
    (application) => application.status === 'coordonator-review',
  )
  return (
    <div className="grid gap-5">
      <Panel>
        <div>
          <h3 className="text-lg font-bold">Asignare candidati</h3>
          <p className="mt-1 text-sm text-[#748094]">
            O comisie este disponibila doar dupa confirmarea tuturor coordonatorilor si fara
            conflict declarat.
          </p>
        </div>
        <div className="mt-5 grid gap-4">
          {pool.map((application) => (
            <AssignmentRow
              application={application}
              busyKey={props.busyKey}
              commissions={props.commissions}
              key={application.id}
              onAction={props.onAction}
              onOpen={props.onOpen}
            />
          ))}
          {pool.length === 0 && (
            <EmptyState text="Toti candidatii acceptati au fost asignati sau nu exista inca pool-ul de review." />
          )}
        </div>
      </Panel>
      <ScheduleSetup
        busyKey={props.busyKey}
        commissions={props.commissions}
        defaultInterviewDate={props.config.defaultInterviewDate}
        onAction={props.onAction}
      />
    </div>
  )
}

function AssignmentRow(props: {
  application: ManagedApplication
  busyKey: string | null
  commissions: ManagedCommission[]
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
  onOpen: (id: string) => void
}) {
  return (
    <article className="rounded-md border border-[#e4e8ef] bg-[#f8fafc] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-base font-bold">{props.application.name}</p>
          <p className="mt-1 text-sm text-[#748094]">
            {props.application.phone || 'Fara telefon'} ·{' '}
            {props.application.instagram || 'Fara Instagram'}
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-[#dfe5ec] bg-white px-3 text-xs font-bold hover:border-[#00a2e0]"
          onClick={() => props.onOpen(props.application.id)}
          type="button"
        >
          <FileText className="size-4" /> Detalii
        </button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {props.commissions.map((commission) => {
          const eligibility = getCommissionEligibility(props.application, commission)
          const key = `assign-${props.application.id}-${commission.id}`
          return (
            <div
              className={`rounded-md border p-3 ${eligibility.eligible ? 'border-emerald-200 bg-white' : 'border-[#e4e8ef] bg-white/60'}`}
              key={commission.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{commission.label}</span>
                {eligibility.eligible ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-600" />
                )}
              </div>
              <p
                className={`mt-2 min-h-8 text-xs leading-4 ${eligibility.eligible ? 'text-emerald-700' : 'text-[#748094]'}`}
              >
                {eligibility.eligible ? 'Eligibila pentru asignare.' : eligibility.reason}
              </p>
              <button
                className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-[#141e34] px-2 text-xs font-bold text-white transition hover:bg-[#243454] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!eligibility.eligible || props.busyKey === key}
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'assign-candidate',
                      applicationId: props.application.id,
                      commissionId: commission.id,
                    },
                    key,
                  )
                }
                type="button"
              >
                {props.busyKey === key ? 'Se salveaza...' : 'Trimite in comisie'}
              </button>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function ScheduleSetup(props: {
  busyKey: string | null
  commissions: ManagedCommission[]
  defaultInterviewDate: string | null
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  return (
    <Panel>
      <div>
        <h3 className="text-lg font-bold">Program interview-uri pe comisii</h3>
        <p className="mt-1 text-sm text-[#748094]">
          Data implicita precompleteaza doar intervalele noi. Pauzele elimina orice slot care se
          intersecteaza cu ele.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {props.commissions.map((commission) => (
          <CommissionScheduleEditor
            busy={props.busyKey === `schedule-${commission.id}`}
            commission={commission}
            defaultInterviewDate={props.defaultInterviewDate}
            key={commission.id}
            onSave={(intervals) =>
              props.onAction(
                {
                  action: 'update-commission-schedule',
                  commissionId: commission.id,
                  interviewIntervals: intervals,
                },
                `schedule-${commission.id}`,
              )
            }
          />
        ))}
      </div>
    </Panel>
  )
}

function CommissionScheduleEditor(props: {
  busy: boolean
  commission: ManagedCommission
  defaultInterviewDate: string | null
  onSave: (intervals: ManagedInterval[]) => Promise<ActionResult>
}) {
  const [intervals, setIntervals] = useState(props.commission.interviewIntervals)
  useEffect(
    () => setIntervals(props.commission.interviewIntervals),
    [props.commission.interviewIntervals],
  )

  function updateInterval(index: number, changes: Partial<ManagedInterval>) {
    setIntervals((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    )
  }
  function addInterval() {
    setIntervals((current) => [...current, createInterval(props.defaultInterviewDate)])
  }

  return (
    <article className="rounded-md border border-[#e4e8ef] bg-[#f8fafc] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold">{props.commission.label}</p>
          <p className="mt-1 text-xs text-[#748094]">
            {intervals.length} {intervals.length === 1 ? 'interval' : 'intervale'} configurate
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cdd5df] bg-white px-3 text-xs font-bold"
            onClick={addInterval}
            type="button"
          >
            <Plus className="size-4" /> Adauga zi
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#141e34] px-3 text-xs font-bold text-white disabled:opacity-55"
            disabled={props.busy}
            onClick={() => void props.onSave(intervals)}
            type="button"
          >
            <Settings2 className="size-4" /> {props.busy ? 'Se salveaza...' : 'Salveaza'}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {intervals.map((interval, index) => (
          <div
            className="rounded-md border border-[#dfe5ec] bg-white p-3"
            key={`${index}-${interval.startDateTime || 'new'}`}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_5.5rem_5.5rem_minmax(15rem,1.4fr)]">
              <DateTimeInput
                label="Incepe"
                onChange={(value) => updateInterval(index, { startDateTime: value })}
                value={interval.startDateTime}
              />
              <DateTimeInput
                label="Se termina"
                onChange={(value) => updateInterval(index, { endDateTime: value })}
                value={interval.endDateTime}
              />
              <NumberInput
                label="Durata (min)"
                min={1}
                onChange={(value) => updateInterval(index, { interviewDuration: value })}
                value={interval.interviewDuration}
              />
              <NumberInput
                label="Pauza (min)"
                min={0}
                onChange={(value) => updateInterval(index, { pauseBetween: value })}
                value={interval.pauseBetween}
              />
              <PlaceLocationInput
                label="Locatie"
                onChange={(value) => updateInterval(index, { location: value })}
                value={interval.location}
              />
            </div>
            <div className="mt-3 border-t border-[#edf0f4] pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
                  Pauze
                </p>
                <button
                  className="text-xs font-bold text-[#007fb3] hover:underline"
                  onClick={() =>
                    updateInterval(index, {
                      breaks: [...interval.breaks, { endTime: null, startTime: null }],
                    })
                  }
                  type="button"
                >
                  Adauga pauza
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                {interval.breaks.map((breakItem, breakIndex) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
                    key={breakIndex}
                  >
                    <TimeInput
                      label="De la"
                      onChange={(value) =>
                        updateIntervalBreak(intervals, setIntervals, index, breakIndex, {
                          startTime: value,
                        })
                      }
                      value={breakItem.startTime}
                    />
                    <TimeInput
                      label="Pana la"
                      onChange={(value) =>
                        updateIntervalBreak(intervals, setIntervals, index, breakIndex, {
                          endTime: value,
                        })
                      }
                      value={breakItem.endTime}
                    />
                    <button
                      aria-label="Sterge pauza"
                      className="mt-5 inline-flex size-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        updateInterval(index, {
                          breaks: interval.breaks.filter(
                            (_, itemIndex) => itemIndex !== breakIndex,
                          ),
                        })
                      }
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                {interval.breaks.length === 0 && (
                  <p className="text-xs text-[#748094]">Nu sunt pauze configurate.</p>
                )}
              </div>
            </div>
            <button
              className="mt-3 text-xs font-bold text-red-600 hover:underline"
              onClick={() =>
                setIntervals((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              type="button"
            >
              Sterge ziua
            </button>
          </div>
        ))}
        {intervals.length === 0 && (
          <p className="py-3 text-sm text-[#748094]">
            Adauga cel putin un interval pentru a putea trimite invitatii.
          </p>
        )}
      </div>
    </article>
  )
}

function InvitationStep(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  deadline: string | null
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  const interviews = props.applications.filter((application) => application.status === 'interview')
  const unsent = interviews.filter((application) => !application.interviewMailSentAt)
  return (
    <div className="grid gap-5">
      <InfoPanel
        icon={Mail}
        text="Emailurile se trimit o singura data pentru candidatii eligibili care nu au deja un email de invitatie. Candidatii aleg apoi ziua si caramida de timp din pagina publica de programare."
        title="Invitatii si booking"
      />
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Invitatii la interview</h3>
            <p className="mt-1 text-sm text-[#748094]">
              {unsent.length} netrimise · deadline: {formatDate(props.deadline)}
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#00a2e0] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
            disabled={unsent.length === 0 || props.busyKey === 'send-interview-mails'}
            onClick={() =>
              void props.onAction({ action: 'send-interview-mails' }, 'send-interview-mails')
            }
            type="button"
          >
            <Send className="size-4" />{' '}
            {props.busyKey === 'send-interview-mails' ? 'Se trimit...' : 'Trimite emailurile'}
          </button>
        </div>
        <CandidateMailTable applications={interviews} kind="interview" />
      </Panel>
    </div>
  )
}

function InterviewStep(props: {
  applications: ManagedApplication[]
  commissions: ManagedCommission[]
}) {
  const active = props.applications.filter((application) =>
    ['interview', 'interviewed', 'absent'].includes(application.status),
  )
  const scheduled = active.filter((application) => application.interviewDate).length
  const unresolved = active.filter((application) => application.status === 'interview').length
  return (
    <div className="grid gap-5">
      <InfoPanel
        icon={CalendarClock}
        text="In ziua interview-urilor, coordonatorii lucreaza din workspace-ul comisiei: vad programul, completeaza note si marcheaza prezenta. Deciziile finale apar doar dupa ce toate interview-urile comisiei sunt rezolvate."
        title="Ziua de interview"
      />
      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <SmallMetric label="Programati" value={String(scheduled)} />
          <SmallMetric label="De rezolvat" value={String(unresolved)} />
          <SmallMetric label="Fara programare" value={String(active.length - scheduled)} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.commissions.map((commission) => {
            const count = active.filter(
              (application) => application.commissionId === commission.id,
            ).length
            return (
              <Link
                className="flex items-center justify-between rounded-md border border-[#e4e8ef] bg-[#f8fafc] p-3 transition hover:border-[#00a2e0]"
                href={`/members/commissions/interviews?commission=${commission.id}`}
                key={commission.id}
              >
                <span>
                  <span className="block text-sm font-bold">{commission.label}</span>
                  <span className="mt-1 block text-xs text-[#748094]">
                    {count} candidati activi
                  </span>
                </span>
                <ChevronRight className="size-4 text-[#007fb3]" />
              </Link>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function ResultStep(props: {
  applications: ManagedApplication[]
  busyKey: string | null
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  const final = props.applications.filter((application) =>
    ['interview-passed', 'interview-rejected'].includes(application.status),
  )
  const unsent = final.filter((application) => !application.finalMailSentAt)
  return (
    <div className="grid gap-5">
      <InfoPanel
        icon={MailCheck}
        text="Batch-ul trimite doar rezultatele finale care nu au mai fost trimise. Pentru acceptati sunt create sau reutilizate conturile de aspirant si legatura cu comisia, fara email de resetare a parolei."
        title="Rezultate si emailuri"
      />
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Emailuri finale</h3>
            <p className="mt-1 text-sm text-[#748094]">{unsent.length} rezultate netrimise.</p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#00a2e0] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
            disabled={unsent.length === 0 || props.busyKey === 'send-final-mails'}
            onClick={() => void props.onAction({ action: 'send-final-mails' }, 'send-final-mails')}
            type="button"
          >
            <Send className="size-4" />{' '}
            {props.busyKey === 'send-final-mails' ? 'Se trimit...' : 'Trimite emailurile finale'}
          </button>
        </div>
        <CandidateMailTable applications={final} kind="final" />
      </Panel>
    </div>
  )
}

function CandidateMailTable(props: {
  applications: ManagedApplication[]
  kind: 'final' | 'interview'
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-y border-[#edf0f4] text-[11px] font-black uppercase tracking-[0.1em] text-[#748094]">
          <tr>
            <th className="px-3 py-3">Candidat</th>
            <th className="px-3 py-3">Programare / rezultat</th>
            <th className="px-3 py-3">Email</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf0f4]">
          {props.applications.map((application) => {
            const sentAt =
              props.kind === 'interview'
                ? application.interviewMailSentAt
                : application.finalMailSentAt
            return (
              <tr key={application.id}>
                <td className="px-3 py-3">
                  <p className="font-bold">{application.name}</p>
                  <p className="text-xs text-[#748094]">{application.email}</p>
                </td>
                <td className="px-3 py-3">
                  {props.kind === 'interview' ? (
                    application.interviewDate ? (
                      formatDateTime(application.interviewDate)
                    ) : (
                      'Neprogramat'
                    )
                  ) : (
                    <StatusBadge status={application.status} />
                  )}
                </td>
                <td className="px-3 py-3">
                  {sentAt ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="size-4" /> Trimis {formatDate(sentAt)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-700">Netimis</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {props.applications.length === 0 && (
        <EmptyState text="Nu exista candidati in aceasta etapa." />
      )}
    </div>
  )
}

function DeadlineEditor(props: {
  busyKey: string | null
  config: ManagedRecruitmentConfig
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  const [values, setValues] = useState(() => getDeadlineInputs(props.config))
  useEffect(() => setValues(getDeadlineInputs(props.config)), [props.config])
  return (
    <Panel>
      <div className="flex items-center gap-2">
        <Clock3 className="size-5 text-[#007fb3]" />
        <div>
          <h3 className="text-lg font-bold">Calendarul recruitmentului</h3>
          <p className="mt-1 text-sm text-[#748094]">
            Datele de inscriere sunt interpretate in fusul Europe/Bucharest; data finala inchide
            formularul la sfarsitul zilei.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DateInput
          label="Inceput inscrieri"
          onChange={(value) =>
            setValues((current) => ({ ...current, recruitmentStartDate: value }))
          }
          value={values.recruitmentStartDate}
        />
        <DateInput
          label="Final inscrieri"
          onChange={(value) => setValues((current) => ({ ...current, recruitmentEndDate: value }))}
          value={values.recruitmentEndDate}
        />
        <DateInput
          label="Data implicita interview"
          onChange={(value) =>
            setValues((current) => ({ ...current, defaultInterviewDate: value }))
          }
          value={values.defaultInterviewDate}
        />
        <DateInput
          label="Deadline programare"
          onChange={(value) =>
            setValues((current) => ({ ...current, interviewSchedulingDeadline: value }))
          }
          value={values.interviewSchedulingDeadline}
        />
      </div>
      <button
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#141e34] px-3 text-xs font-bold text-white disabled:opacity-55"
        disabled={props.busyKey === 'update-recruitment-config'}
        onClick={() =>
          void props.onAction(
            { action: 'update-recruitment-config', ...values },
            'update-recruitment-config',
          )
        }
        type="button"
      >
        <Check className="size-4" />{' '}
        {props.busyKey === 'update-recruitment-config' ? 'Se salveaza...' : 'Salveaza calendarul'}
      </button>
    </Panel>
  )
}

function ApplicationDrawer(props: {
  application: ManagedApplication | null
  busyKey: string | null
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  useEffect(() => setNotes(props.application?.notes ?? ''), [props.application])
  if (!props.application) return null
  const application = props.application
  const canReview = ['submitted', 'submission-waitlisted'].includes(application.status)
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141e34]/35"
      onMouseDown={props.onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e4e8ef] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
              Aplicatie
            </p>
            <h2 className="mt-1 text-xl font-bold">{application.name}</h2>
            <p className="mt-1 text-sm text-[#748094]">{application.email}</p>
          </div>
          <button
            aria-label="Inchide"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#dfe5ec] hover:bg-[#f8fafc]"
            onClick={props.onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-5 p-5">
          <section>
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]">
              Raspunsuri formular
            </h3>
            <dl className="mt-3 divide-y divide-[#edf0f4] rounded-md border border-[#e4e8ef]">
              {application.formAnswers.map((answer) => (
                <div
                  className="grid gap-1 px-3 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)]"
                  key={answer.field}
                >
                  <dt className="text-xs font-bold text-[#748094]">{answer.label}</dt>
                  <dd className="break-words text-sm font-medium">{answer.value || '—'}</dd>
                </div>
              ))}
              {application.formAnswers.length === 0 && (
                <EmptyState text="Nu exista raspunsuri serializate." />
              )}
            </dl>
          </section>
          <section>
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]">
              Documente incarcate
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {application.formUploads.map((upload) => (
                <UploadPreview key={upload.id} upload={upload} />
              ))}
              {application.formUploads.length === 0 && (
                <p className="text-sm text-[#748094]">Nu exista documente incarcate.</p>
              )}
            </div>
          </section>
          <section>
            <label
              className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]"
              htmlFor="review-notes"
            >
              Note interne
            </label>
            <textarea
              className="mt-3 min-h-28 w-full rounded-md border border-[#dfe5ec] p-3 text-sm outline-none focus:border-[#00a2e0]"
              id="review-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observatii pentru etapele urmatoare"
              value={notes}
            />
          </section>
          {canReview ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <ReviewButton
                busy={props.busyKey === `review-${application.id}-submission-rejected`}
                label="Refuza"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'review-submission',
                      applicationId: application.id,
                      notes,
                      status: 'submission-rejected',
                    },
                    `review-${application.id}-submission-rejected`,
                  )
                }
                tone="danger"
              />
              <ReviewButton
                busy={props.busyKey === `review-${application.id}-submission-waitlisted`}
                label="Lista de asteptare"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'review-submission',
                      applicationId: application.id,
                      notes,
                      status: 'submission-waitlisted',
                    },
                    `review-${application.id}-submission-waitlisted`,
                  )
                }
                tone="neutral"
              />
              <ReviewButton
                busy={props.busyKey === `review-${application.id}-coordonator-review`}
                label="Accepta"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'review-submission',
                      applicationId: application.id,
                      notes,
                      status: 'coordonator-review',
                    },
                    `review-${application.id}-coordonator-review`,
                  )
                }
                tone="success"
              />
            </div>
          ) : (
            <div className="rounded-md bg-[#f8fafc] px-3 py-3 text-sm font-medium text-[#526071]">
              Decizia formularului: <StatusBadge status={application.status} />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function UploadPreview({ upload }: { upload: ManagedUpload }) {
  const canPreviewImage = Boolean(upload.previewURL && upload.mimeType?.startsWith('image/'))
  const canPreviewPDF = Boolean(upload.previewURL && upload.mimeType === 'application/pdf')
  return (
    <article className="overflow-hidden rounded-md border border-[#e4e8ef] bg-[#f8fafc]">
      <div className="flex aspect-[16/9] items-center justify-center bg-white">
        {canPreviewImage ? (
          <img
            alt={upload.filename}
            className="size-full object-cover"
            src={upload.previewURL || ''}
          />
        ) : canPreviewPDF ? (
          <iframe className="size-full" src={upload.previewURL || ''} title={upload.filename} />
        ) : (
          <FileText className="size-8 text-[#748094]" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{upload.filename}</p>
          <p className="mt-0.5 text-xs text-[#748094]">{upload.label}</p>
        </div>
        {upload.url && (
          <a
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#dfe5ec] bg-white text-[#007fb3] hover:bg-[#f4f6f8]"
            download
            href={upload.url}
            title="Descarca documentul"
          >
            <Download className="size-4" />
          </a>
        )}
      </div>
    </article>
  )
}

function StepFooter(props: {
  activeStep: RecruitmentStepKey
  maximumStepIndex: number
  onSelect: (step: RecruitmentStepKey) => void
  workflow: ReturnType<typeof getRecruitmentWorkflowState>
}) {
  const currentIndex = recruitmentSteps.findIndex((step) => step.key === props.activeStep)
  const next = recruitmentSteps[currentIndex + 1]
  const previous = recruitmentSteps[currentIndex - 1]
  const nextUnlocked = next && currentIndex + 1 <= props.maximumStepIndex
  const blockers = props.workflow.gates[props.activeStep].blockers
  return (
    <footer className="mt-5 flex flex-col gap-3 rounded-md border border-[#dfe5ec] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {blockers.length > 0 ? (
          <p className="text-sm text-[#748094]">Pentru pasul urmator: {blockers[0]}</p>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">Etapa este completa.</p>
        )}
      </div>
      <div className="flex gap-2">
        {previous && (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dfe5ec] px-3 text-xs font-bold"
            onClick={() => props.onSelect(previous.key)}
            type="button"
          >
            <ArrowLeft className="size-4" /> Inapoi
          </button>
        )}
        {next && (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#141e34] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!nextUnlocked}
            onClick={() => nextUnlocked && props.onSelect(next.key)}
            type="button"
          >
            Continua <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </footer>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
      {children}
    </section>
  )
}
function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/50">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}
function DeadlineValue({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-white/65">
      <span className="font-bold text-white">{label}:</span> {value}
    </p>
  )
}
function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f8fafc] p-3">
      <p className="text-xs font-bold text-[#748094]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
function InfoPanel(props: { icon: LucideIcon; text: string; title: string }) {
  const Icon = props.icon
  return (
    <div className="flex gap-3 rounded-md border border-[#cdeafd] bg-[#eef9ff] p-4 text-[#174b6b]">
      <Icon className="mt-0.5 size-5 shrink-0 text-[#007fb3]" />
      <div>
        <h3 className="font-bold">{props.title}</h3>
        <p className="mt-1 text-sm leading-6">{props.text}</p>
      </div>
    </div>
  )
}
function EmptyState({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm font-medium text-[#748094]">{text}</div>
}
function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <div
      className={`mb-5 flex items-start gap-2 rounded-md border px-4 py-3 text-sm font-semibold ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      {notice.kind === 'success' ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{notice.message}</span>
    </div>
  )
}
function StatusBadge({ status }: { status: ManagedApplicationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em] ${status === 'submission-rejected' || status === 'interview-rejected' || status === 'interview-withdrawn' ? 'bg-red-50 text-red-700' : status === 'submission-waitlisted' || status === 'absent' ? 'bg-amber-100 text-amber-800' : status === 'interview-passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-800'}`}
    >
      {statusLabels[status]}
    </span>
  )
}
function ReviewButton(props: {
  busy: boolean
  label: string
  onClick: () => void
  tone: 'danger' | 'neutral' | 'success'
}) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    neutral: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  }
  return (
    <button
      className={`h-10 rounded-md border px-3 text-xs font-bold disabled:opacity-55 ${styles[props.tone]}`}
      disabled={props.busy}
      onClick={props.onClick}
      type="button"
    >
      {props.busy ? 'Se salveaza...' : props.label}
    </button>
  )
}
function DateInput(props: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] bg-white px-2 text-sm font-semibold text-[#152039] outline-none focus:border-[#00a2e0]"
        onChange={(event) => props.onChange(event.target.value)}
        type="date"
        value={props.value}
      />
    </label>
  )
}
function DateTimeInput(props: {
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm font-semibold outline-none focus:border-[#00a2e0]"
        onChange={(event) =>
          props.onChange(event.target.value ? new Date(event.target.value).toISOString() : null)
        }
        type="datetime-local"
        value={toDateTimeInput(props.value)}
      />
    </label>
  )
}
function TimeInput(props: {
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm font-semibold outline-none focus:border-[#00a2e0]"
        onChange={(event) =>
          props.onChange(event.target.value ? toTimeDate(event.target.value) : null)
        }
        type="time"
        value={toTimeInput(props.value)}
      />
    </label>
  )
}
function NumberInput(props: {
  label: string
  min: number
  onChange: (value: number | null) => void
  value: number | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm font-semibold outline-none focus:border-[#00a2e0]"
        min={props.min}
        onChange={(event) =>
          props.onChange(event.target.value === '' ? null : Number(event.target.value))
        }
        type="number"
        value={props.value ?? ''}
      />
    </label>
  )
}
function PlaceLocationInput(props: {
  label: string
  onChange: (value: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <GooglePlaceAutocomplete onChange={props.onChange} value={props.value} />
    </label>
  )
}

function getCommissionEligibility(application: ManagedApplication, commission: ManagedCommission) {
  const coordinatorIDs = commission.coordinators.map((item) => item.id)
  if (coordinatorIDs.length === 0)
    return { eligible: false, reason: 'Nu are coordonatori configurati.' }
  const confirmed = new Set(commission.recruitmentReviews.map((item) => item.coordinatorId))
  const pending = coordinatorIDs.filter((id) => !confirmed.has(id))
  if (pending.length) return { eligible: false, reason: `${pending.length} confirmari lipsa.` }
  const known = coordinatorIDs.filter((id) => application.knownCoordinatorIds.includes(id))
  if (known.length)
    return { eligible: false, reason: `${known.length} coordonator(i) cunosc candidatul.` }
  return { eligible: true, reason: '' }
}
function createInterval(defaultDate: string | null): ManagedInterval {
  const day = toDateInput(defaultDate) || toDateInput(new Date().toISOString())
  return {
    breaks: [],
    endDateTime: new Date(`${day}T17:00`).toISOString(),
    interviewDuration: 20,
    location: null,
    pauseBetween: 5,
    startDateTime: new Date(`${day}T09:00`).toISOString(),
  }
}
function updateIntervalBreak(
  intervals: ManagedInterval[],
  setIntervals: Dispatch<SetStateAction<ManagedInterval[]>>,
  intervalIndex: number,
  breakIndex: number,
  changes: Partial<ManagedInterval['breaks'][number]>,
) {
  setIntervals(
    intervals.map((interval, currentIndex) =>
      currentIndex === intervalIndex
        ? {
            ...interval,
            breaks: interval.breaks.map((item, currentBreakIndex) =>
              currentBreakIndex === breakIndex ? { ...item, ...changes } : item,
            ),
          }
        : interval,
    ),
  )
}
function getMaximumOpenStepIndex(currentStep: RecruitmentStepKey) {
  return Math.max(
    0,
    recruitmentSteps.findIndex((step) => step.key === currentStep),
  )
}
function normalizeStep(value: string | null): RecruitmentStepKey {
  return recruitmentSteps.some((step) => step.key === value)
    ? (value as RecruitmentStepKey)
    : 'forms'
}
function filterApplications(
  applications: ManagedApplication[],
  commissions: ManagedCommission[],
  query: string,
) {
  const value = query.trim().toLocaleLowerCase('ro')
  if (!value) return applications
  return applications.filter((application) => {
    const commission = commissions.find((item) => item.id === application.commissionId)
    return [
      application.name,
      application.email,
      application.phone,
      application.instagram,
      commission?.label || '',
    ].some((item) => item.toLocaleLowerCase('ro').includes(value))
  })
}
function getActionMessage(result: ActionResult) {
  if (result.mailBatch)
    return `${result.mailBatch.sent} trimise, ${result.mailBatch.skipped} sarite, ${result.mailBatch.failed} esuate.${result.mailBatch.warnings.length ? ` ${result.mailBatch.warnings[0]}` : ''}`
  if (result.bulkReview) return `${result.bulkReview.updated} formulare actualizate.`
  return 'Modificarile au fost salvate.'
}
function getDeadlineInputs(config: ManagedRecruitmentConfig) {
  return {
    defaultInterviewDate: toDateInput(config.defaultInterviewDate),
    interviewSchedulingDeadline: toDateInput(config.interviewSchedulingDeadline),
    recruitmentEndDate: toDateInput(config.recruitmentEndDate),
    recruitmentStartDate: toDateInput(config.recruitmentStartDate),
  }
}
function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : ''
}
function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}
function toTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function toTimeDate(value: string) {
  return `1970-01-01T${value}:00.000Z`
}
function formatDate(value: string | null | undefined) {
  if (!value) return 'Neconfigurat'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Neconfigurat'
    : new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      )
}
function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Neprogramat'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Neprogramat'
    : new Intl.DateTimeFormat('ro-RO', {
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
      }).format(date)
}
function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Neconfigurat'
  return `${formatDate(start)} - ${formatDate(end)}`
}
