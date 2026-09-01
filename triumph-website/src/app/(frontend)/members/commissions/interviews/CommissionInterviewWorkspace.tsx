'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Plus,
  Save,
  Settings2,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import { GooglePlaceAutocomplete } from '@/components/GooglePlaceAutocomplete'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import type { GooglePlaceLocation } from '@/utilities/googlePlace'

export type InterviewWorkspaceUser = { email: string; id: string; name: string }

export type InterviewWorkspaceInterval = {
  breaks: Array<{ endTime: string | null; startTime: string | null }>
  endDateTime: string | null
  interviewDuration: number | null
  location: GooglePlaceLocation | null
  pauseBetween: number | null
  startDateTime: string | null
}

export type InterviewWorkspaceCommission = {
  coordinators: InterviewWorkspaceUser[]
  id: string
  interviewIntervals: InterviewWorkspaceInterval[]
  label: string
}

export type InterviewWorkspaceApplication = {
  commissionId: string
  email: string
  formAnswers: Array<{ field: string; label: string; value: string }>
  id: string
  instagram: string
  interviewAttendance: 'scheduled' | 'late' | 'absent' | 'completed' | null
  interviewDate: string | null
  interviewNotes: Array<{
    author: InterviewWorkspaceUser | null
    createdAt: string
    id: string
    note: string
  }>
  name: string
  notes: string
  phone: string
  status:
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
}

type ApplicationPatch = Partial<
  Pick<InterviewWorkspaceApplication, 'interviewAttendance' | 'interviewDate' | 'status'>
> & {
  id: string
  interviewNotes?: Array<
    | { author: InterviewWorkspaceUser | null; createdAt: string; id: string; note: string }
    | { authorId: string; createdAt: string; id: string; note: string }
  >
}

type ActionResult = {
  application?: ApplicationPatch
  commission?: Partial<InterviewWorkspaceCommission> & { id: string }
  message?: string
}

type Notice = { kind: 'error' | 'success'; message: string }

export default function CommissionInterviewWorkspace(props: {
  applications: InterviewWorkspaceApplication[]
  commissions: InterviewWorkspaceCommission[]
  defaultInterviewDate: string | null
  initialCommissionId: string
  isReadOnly: boolean
  schedulingDeadline: string | null
  user: InterviewWorkspaceUser
}) {
  const router = useRouter()
  const { setHeaderTheme } = useHeaderTheme()
  const [applications, setApplications] = useState(props.applications)
  const [commissions, setCommissions] = useState(props.commissions)
  const [selectedCommissionID, setSelectedCommissionID] = useState(props.initialCommissionId)
  const [selectedApplicationID, setSelectedApplicationID] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => setHeaderTheme('light'), [setHeaderTheme])
  useEffect(() => setApplications(props.applications), [props.applications])
  useEffect(() => setCommissions(props.commissions), [props.commissions])

  const commission = commissions.find((item) => item.id === selectedCommissionID) ?? commissions[0]
  const candidates = useMemo(
    () => applications.filter((application) => application.commissionId === commission?.id),
    [applications, commission],
  )
  const activeCandidates = candidates.filter((application) =>
    ['interview', 'interviewed', 'absent'].includes(application.status),
  )
  const unresolved = activeCandidates.filter((application) => application.status === 'interview')
  const scheduled = [...activeCandidates]
    .filter((application) => application.interviewDate)
    .sort((left, right) => (left.interviewDate || '').localeCompare(right.interviewDate || ''))
  const scheduledUnresolved = scheduled.filter((application) => application.status === 'interview')
  const unscheduled = unresolved.filter((application) => !application.interviewDate)
  const allResolved = activeCandidates.length > 0 && unresolved.length === 0
  const selectedApplication =
    candidates.find((application) => application.id === selectedApplicationID) ??
    scheduledUnresolved[0] ??
    unscheduled[0] ??
    scheduled[0] ??
    activeCandidates[0] ??
    null

  function updateApplication(patch: ApplicationPatch) {
    setApplications((current) =>
      current.map((application) => {
        if (application.id !== patch.id) return application
        return {
          ...application,
          ...patch,
          interviewNotes: patch.interviewNotes
            ? patch.interviewNotes.map((note) =>
                'authorId' in note
                  ? { ...note, author: note.authorId === props.user.id ? props.user : null }
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
      const response = await fetch('/members/commissions/applications', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as ActionResult
      if (!response.ok) throw new Error(result.message || 'Actiunea nu a putut fi salvata.')
      if (result.application) updateApplication(result.application)
      if (result.commission) {
        setCommissions((current) =>
          current.map((item) =>
            item.id === result.commission?.id ? { ...item, ...result.commission } : item,
          ),
        )
      }
      setNotice({ kind: 'success', message: 'Modificarile au fost salvate.' })
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

  if (!commission) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] px-4 py-28 text-[#152039]">
        <div className="mx-auto max-w-xl rounded-lg border border-[#dfe5ec] bg-white p-6 text-center">
          <h1 className="text-xl font-bold">Nu ai comisii disponibile</h1>
          <Link
            className="mt-4 inline-flex text-sm font-bold text-[#007fb3] hover:underline"
            href="/members/commissions"
          >
            Inapoi la panoul comisiilor
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] pb-10 pt-20 text-[#152039] sm:pt-24">
      <header className="bg-[#141e34] px-4 py-7 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/65 hover:text-white"
            href="/members/commissions"
          >
            <ArrowLeft className="size-4" /> Panou comisii
          </Link>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#56c9f5]">
                Ziua de interview
              </p>
              <h1 className="mt-2 text-3xl font-bold">{commission.label}</h1>
              <p className="mt-2 text-sm text-white/65">
                {scheduledUnresolved.length} programati · {unscheduled.length} fara programare ·{' '}
                {unresolved.length} de rezolvat
              </p>
            </div>
            <label className="grid w-full gap-2 text-xs font-black uppercase tracking-[0.1em] text-white/55 lg:w-72">
              Comisie
              <select
                className="h-11 rounded-md border border-white/15 bg-white/[0.08] px-3 text-sm font-semibold text-white outline-none"
                onChange={(event) => {
                  setSelectedCommissionID(event.target.value)
                  setSelectedApplicationID(null)
                }}
                value={commission.id}
              >
                {commissions.map((item) => (
                  <option className="bg-white text-[#152039]" key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-lg border border-[#dfe5ec] bg-white shadow-[0_8px_30px_rgba(22,34,57,0.04)] xl:sticky xl:top-24">
          <div className="border-b border-[#edf0f4] p-4">
            <CurrentTime />
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
              Programul zilei
            </p>
          </div>
          <ScheduleList
            applications={scheduled}
            onSelect={setSelectedApplicationID}
            selectedID={selectedApplication?.id ?? ''}
          />
          <div className="border-t border-[#edf0f4] p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
              Rezolvare fara programare
            </p>
            <div className="mt-3 grid gap-2">
              {unscheduled.map((application) => (
                <button
                  className={`rounded-md border px-3 py-2 text-left text-sm font-bold ${selectedApplication?.id === application.id ? 'border-[#00a2e0] bg-[#eef9ff]' : 'border-[#e4e8ef] hover:border-[#00a2e0]'}`}
                  key={application.id}
                  onClick={() => setSelectedApplicationID(application.id)}
                  type="button"
                >
                  {application.name}
                </button>
              ))}
              {unscheduled.length === 0 && <p className="text-sm text-[#748094]">Nimeni</p>}
            </div>
          </div>
        </aside>
        <section className="min-w-0">
          {notice && <Notice notice={notice} />}
          {selectedApplication ? (
            <CandidateWorkspace
              application={selectedApplication}
              busyKey={busyKey}
              deadline={props.schedulingDeadline}
              isReadOnly={props.isReadOnly}
              onAction={runAction}
              onOpenDetails={() => setDetailsOpen(true)}
            />
          ) : (
            <EmptyInterviewState />
          )}
          {allResolved && (
            <FinalDecisionPanel
              applications={activeCandidates.filter((application) =>
                ['interviewed', 'absent'].includes(application.status),
              )}
              busyKey={busyKey}
              isReadOnly={props.isReadOnly}
              onAction={runAction}
            />
          )}
          {!props.isReadOnly && (
            <ScheduleSettings
              busyKey={busyKey}
              commission={commission}
              defaultInterviewDate={props.defaultInterviewDate}
              onAction={runAction}
            />
          )}
        </section>
      </div>
      <InterviewDetailsDrawer
        application={detailsOpen ? selectedApplication : null}
        onClose={() => setDetailsOpen(false)}
      />
    </main>
  )
}

function CurrentTime() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const intervalID = window.setInterval(update, 30_000)
    return () => window.clearInterval(intervalID)
  }, [])

  return (
    <p className="mb-1 text-sm font-bold text-[#152039]">
      Acum{' '}
      <span className="tabular-nums text-[#007fb3]">
        {now ? formatTime(now.toISOString()) : '--:--'}
      </span>
    </p>
  )
}

function ScheduleList(props: {
  applications: InterviewWorkspaceApplication[]
  onSelect: (id: string) => void
  selectedID: string
}) {
  const groups = new Map<string, InterviewWorkspaceApplication[]>()
  props.applications.forEach((application) => {
    const key = application.interviewDate?.slice(0, 10) || ''
    groups.set(key, [...(groups.get(key) || []), application])
  })
  return (
    <div className="max-h-[54vh] overflow-y-auto p-2">
      {[...groups.entries()].map(([date, applications]) => (
        <div className="mb-3" key={date}>
          <p className="px-2 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#748094]">
            {formatDate(date)}
          </p>
          {applications.map((application) => (
            <button
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${props.selectedID === application.id ? 'bg-[#141e34] text-white' : 'hover:bg-[#f4f6f8]'}`}
              key={application.id}
              onClick={() => props.onSelect(application.id)}
              type="button"
            >
              <span className="w-11 shrink-0 text-xs font-black">
                {formatTime(application.interviewDate)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{application.name}</span>
              <ScheduleStatusBadge application={application} />
            </button>
          ))}
        </div>
      ))}
      {props.applications.length === 0 && (
        <p className="p-4 text-sm text-[#748094]">Nu exista candidati programati.</p>
      )}
    </div>
  )
}

function ScheduleStatusBadge({ application }: { application: InterviewWorkspaceApplication }) {
  const status =
    application.status === 'absent' || application.interviewAttendance === 'absent'
      ? { className: 'border-red-200 bg-red-50 text-red-700', label: 'Absent' }
      : application.status === 'interviewed' || application.interviewAttendance === 'completed'
        ? { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Finalizat' }
        : application.interviewAttendance === 'late'
          ? { className: 'border-amber-200 bg-amber-50 text-amber-800', label: 'Intarziat' }
          : { className: 'border-[#dfe5ec] bg-white text-[#526071]', label: 'Programat' }

  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] ${status.className}`}
    >
      {status.label}
    </span>
  )
}

function CandidateWorkspace(props: {
  application: InterviewWorkspaceApplication
  busyKey: string | null
  deadline: string | null
  isReadOnly: boolean
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
  onOpenDetails: () => void
}) {
  const { application } = props
  const [note, setNote] = useState('')
  const canAttend = !props.isReadOnly && application.status === 'interview'
  const canWriteNotes = !props.isReadOnly
  const canMarkUnscheduledAbsent = !application.interviewDate && isDeadlinePassed(props.deadline)
  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
      <div className="flex flex-col gap-4 border-b border-[#edf0f4] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">
            Candidat curent
          </p>
          <h2 className="mt-1 text-2xl font-bold">{application.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#526071]">
            <span>{application.email}</span>
            {application.phone && <span>· {application.phone}</span>}
            {application.instagram && <span>· {application.instagram}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cdd5df] bg-white px-3 text-xs font-bold text-[#344054] hover:border-[#00a2e0] hover:text-[#007fb3]"
            onClick={props.onOpenDetails}
            type="button"
          >
            <FileText className="size-4" />
            Detalii
          </button>
          <div className="rounded-md bg-[#f8fafc] px-3 py-2 text-right">
            <p className="text-xs font-bold text-[#748094]">Programare</p>
            <p className="mt-1 text-sm font-bold">
              {application.interviewDate
                ? formatDateTime(application.interviewDate)
                : 'Neprogramat'}
            </p>
          </div>
        </div>
      </div>
      <div className="pt-5">
        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]">Prezenta</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {canAttend && (
            <>
              <AttendanceButton
                busy={props.busyKey === `late-${application.id}`}
                label="Marcheaza intarziat"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'set-interview-attendance',
                      applicationId: application.id,
                      attendance: 'late',
                    },
                    `late-${application.id}`,
                  )
                }
                tone="warning"
              />
              <AttendanceButton
                busy={props.busyKey === `completed-${application.id}`}
                label="Interview finalizat"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'set-interview-attendance',
                      applicationId: application.id,
                      attendance: 'completed',
                    },
                    `completed-${application.id}`,
                  )
                }
                tone="success"
              />
              <AttendanceButton
                busy={props.busyKey === `absent-${application.id}`}
                disabled={!application.interviewDate && !canMarkUnscheduledAbsent}
                label="Marcheaza absent"
                onClick={() =>
                  void props.onAction(
                    {
                      action: 'set-interview-attendance',
                      applicationId: application.id,
                      attendance: 'absent',
                    },
                    `absent-${application.id}`,
                  )
                }
                tone="danger"
              />
            </>
          )}
          {!canAttend && (
            <p className="rounded-md bg-[#f8fafc] p-3 text-sm font-semibold text-[#526071]">
              {props.isReadOnly
                ? 'Boardul poate consulta acest workspace, fara sa modifice datele.'
                : `Status: ${application.status === 'interviewed' ? 'Interview finalizat' : application.status === 'absent' ? 'Absent' : application.status}`}
            </p>
          )}
        </div>
      </div>
      {application.notes && (
        <div className="mt-5 border-t border-[#edf0f4] pt-5">
          <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]">
            Note etape precedente
          </h3>
          <p className="mt-3 whitespace-pre-wrap rounded-md bg-[#f8fafc] px-3 py-2.5 text-sm text-[#526071]">
            {application.notes}
          </p>
        </div>
      )}
      <div className="mt-5 border-t border-[#edf0f4] pt-5">
        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#748094]">
          Note interview
        </h3>
        <div className="mt-3 grid gap-2">
          {application.interviewNotes.map((item) => (
            <div className="rounded-md bg-[#f8fafc] px-3 py-2.5" key={item.id}>
              <p className="text-sm font-bold">{item.author?.name || 'Membru board'}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#526071]">{item.note}</p>
              <p className="mt-1 text-xs text-[#8a94a6]">{formatDateTime(item.createdAt)}</p>
            </div>
          ))}
        </div>
        {canWriteNotes && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <textarea
              className="min-h-24 rounded-md border border-[#dfe5ec] p-3 text-sm outline-none focus:border-[#00a2e0]"
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Adauga nota de interview"
              value={note}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-[#cdd5df] px-3 text-xs font-bold disabled:opacity-55"
              disabled={!note.trim() || props.busyKey === `note-${application.id}`}
              onClick={async () => {
                const content = note.trim()
                if (!content) return
                await props.onAction(
                  { action: 'add-note', applicationId: application.id, note: content },
                  `note-${application.id}`,
                )
                setNote('')
              }}
              type="button"
            >
              <Save className="size-4" /> Salveaza nota
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function InterviewDetailsDrawer(props: {
  application: InterviewWorkspaceApplication | null
  onClose: () => void
}) {
  if (!props.application) return null

  const { application } = props
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
              Detalii candidat
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
          <section className="rounded-md bg-[#f8fafc] p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#748094]">Contact</p>
            <div className="mt-3 grid gap-2 text-sm font-medium text-[#344054]">
              <p>{application.email}</p>
              {application.phone && <p>{application.phone}</p>}
              {application.instagram && <p>@{application.instagram}</p>}
            </div>
          </section>
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
                <div className="px-3 py-6 text-center text-sm text-[#748094]">
                  Nu exista raspunsuri disponibile.
                </div>
              )}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  )
}

function FinalDecisionPanel(props: {
  applications: InterviewWorkspaceApplication[]
  busyKey: string | null
  isReadOnly: boolean
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  return (
    <section className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <h2 className="font-bold text-emerald-900">Toate interview-urile sunt rezolvate</h2>
          <p className="mt-1 text-sm text-emerald-800">
            {props.isReadOnly
              ? 'Rezultatele pot fi consultate aici.'
              : 'Poti decide acum pentru fiecare candidat. Candidatii absenti necesita o respingere explicita.'}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {props.applications.map((application) => (
          <div
            className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            key={application.id}
          >
            <div>
              <p className="text-sm font-bold">{application.name}</p>
              <p className="mt-1 text-xs text-[#748094]">
                {application.status === 'absent' ? 'Absent' : 'Interview finalizat'}
              </p>
            </div>
            {!props.isReadOnly && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-55"
                  disabled={props.busyKey === `pass-${application.id}`}
                  onClick={() =>
                    void props.onAction(
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
                  <UserCheck className="size-4" /> Accepta
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-55"
                  disabled={props.busyKey === `reject-${application.id}`}
                  onClick={() =>
                    void props.onAction(
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
                  <UserX className="size-4" /> Respinge
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ScheduleSettings(props: {
  busyKey: string | null
  commission: InterviewWorkspaceCommission
  defaultInterviewDate: string | null
  onAction: (body: Record<string, unknown>, key: string) => Promise<ActionResult>
}) {
  const [open, setOpen] = useState(false)
  const [intervals, setIntervals] = useState(props.commission.interviewIntervals)
  useEffect(
    () => setIntervals(props.commission.interviewIntervals),
    [props.commission.interviewIntervals],
  )
  function update(index: number, changes: Partial<InterviewWorkspaceInterval>) {
    setIntervals((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    )
  }
  return (
    <section className="mt-5 rounded-lg border border-[#dfe5ec] bg-white p-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="block text-sm font-bold">Program comisie</span>
          <span className="mt-1 block text-xs text-[#748094]">
            Editeaza intervalele, locatia si pauzele pentru {props.commission.label}.
          </span>
        </span>
        <Settings2 className="size-5 text-[#007fb3]" />
      </button>
      {open && (
        <div className="mt-4 border-t border-[#edf0f4] pt-4">
          <div className="grid gap-3">
            {intervals.map((interval, index) => (
              <div
                className="rounded-md border border-[#e4e8ef] bg-[#f8fafc] p-3"
                key={`${index}-${interval.startDateTime || 'new'}`}
              >
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_5.5rem_5.5rem_minmax(15rem,1.4fr)]">
                  <DateTimeField
                    label="Incepe"
                    onChange={(value) => update(index, { startDateTime: value })}
                    value={interval.startDateTime}
                  />
                  <DateTimeField
                    label="Se termina"
                    onChange={(value) => update(index, { endDateTime: value })}
                    value={interval.endDateTime}
                  />
                  <NumberField
                    label="Durata"
                    onChange={(value) => update(index, { interviewDuration: value })}
                    value={interval.interviewDuration}
                  />
                  <NumberField
                    label="Pauza"
                    onChange={(value) => update(index, { pauseBetween: value })}
                    value={interval.pauseBetween}
                  />
                  <PlaceLocationField
                    label="Locatie"
                    onChange={(value) => update(index, { location: value })}
                    value={interval.location}
                  />
                </div>
                <div className="mt-3 border-t border-[#e4e8ef] pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#748094]">Pauze</p>
                    <button
                      className="text-xs font-bold text-[#007fb3] hover:underline"
                      onClick={() =>
                        update(index, {
                          breaks: [...interval.breaks, { startTime: null, endTime: null }],
                        })
                      }
                      type="button"
                    >
                      Adauga pauza
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {interval.breaks.map((item, breakIndex) => (
                      <div
                        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                        key={breakIndex}
                      >
                        <TimeField
                          label="De la"
                          onChange={(value) =>
                            updateBreak(setIntervals, index, breakIndex, { startTime: value })
                          }
                          value={item.startTime}
                        />
                        <TimeField
                          label="Pana la"
                          onChange={(value) =>
                            updateBreak(setIntervals, index, breakIndex, { endTime: value })
                          }
                          value={item.endTime}
                        />
                        <button
                          aria-label="Sterge pauza"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-red-200 text-red-600 sm:mt-5"
                          onClick={() =>
                            update(index, {
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
                  </div>
                </div>
                <button
                  className="mt-3 text-xs font-bold text-red-600 hover:underline"
                  onClick={() =>
                    setIntervals((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  type="button"
                >
                  Sterge interval
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cdd5df] px-3 text-xs font-bold"
              onClick={() =>
                setIntervals((current) => [...current, createInterval(props.defaultInterviewDate)])
              }
              type="button"
            >
              <Plus className="size-4" /> Adauga interval
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#141e34] px-3 text-xs font-bold text-white disabled:opacity-55"
              disabled={props.busyKey === `schedule-${props.commission.id}`}
              onClick={() =>
                void props.onAction(
                  {
                    action: 'update-commission-schedule',
                    commissionId: props.commission.id,
                    interviewIntervals: intervals,
                  },
                  `schedule-${props.commission.id}`,
                )
              }
              type="button"
            >
              <Save className="size-4" />{' '}
              {props.busyKey === `schedule-${props.commission.id}`
                ? 'Se salveaza...'
                : 'Salveaza programul'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function AttendanceButton(props: {
  busy: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  tone: 'danger' | 'success' | 'warning'
}) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  }
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 ${styles[props.tone]}`}
      disabled={props.busy || props.disabled}
      onClick={props.onClick}
      type="button"
    >
      {props.busy ? 'Se salveaza...' : props.label}
    </button>
  )
}
function EmptyInterviewState() {
  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-8 text-center">
      <CalendarClock className="mx-auto size-8 text-[#748094]" />
      <h2 className="mt-3 text-lg font-bold">Nu exista candidati pentru aceasta comisie</h2>
      <p className="mt-1 text-sm text-[#748094]">
        Candidatii asignati vor aparea aici dupa trimiterea la interview.
      </p>
    </section>
  )
}
function Notice({ notice }: { notice: Notice }) {
  return (
    <div
      className={`mb-5 flex gap-2 rounded-md border px-4 py-3 text-sm font-semibold ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      {notice.kind === 'success' ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <XCircle className="size-4 shrink-0" />
      )}
      {notice.message}
    </div>
  )
}
function DateTimeField(props: {
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm"
        onChange={(event) =>
          props.onChange(event.target.value ? new Date(event.target.value).toISOString() : null)
        }
        type="datetime-local"
        value={toDateTimeInput(props.value)}
      />
    </label>
  )
}
function NumberField(props: {
  label: string
  onChange: (value: number | null) => void
  value: number | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm"
        min={0}
        onChange={(event) => props.onChange(event.target.value ? Number(event.target.value) : null)}
        type="number"
        value={props.value ?? ''}
      />
    </label>
  )
}
function PlaceLocationField(props: {
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
function TimeField(props: {
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#526071]">
      {props.label}
      <input
        className="h-9 rounded-md border border-[#dfe5ec] px-2 text-sm"
        onChange={(event) =>
          props.onChange(event.target.value ? `1970-01-01T${event.target.value}:00.000Z` : null)
        }
        type="time"
        value={toTimeInput(props.value)}
      />
    </label>
  )
}
function updateBreak(
  setIntervals: Dispatch<SetStateAction<InterviewWorkspaceInterval[]>>,
  intervalIndex: number,
  breakIndex: number,
  changes: Partial<InterviewWorkspaceInterval['breaks'][number]>,
) {
  setIntervals((current) =>
    current.map((interval, currentIndex) =>
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
function createInterval(defaultDate: string | null): InterviewWorkspaceInterval {
  const date = defaultDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  return {
    breaks: [],
    endDateTime: new Date(`${date}T17:00`).toISOString(),
    interviewDuration: 20,
    location: null,
    pauseBetween: 5,
    startDateTime: new Date(`${date}T09:00`).toISOString(),
  }
}
function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
function toTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function isDeadlinePassed(value: string | null) {
  return Boolean(value && new Date(value) < new Date())
}
function formatDate(value: string | null | undefined) {
  if (!value) return 'Fara data'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Fara data'
    : new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', weekday: 'long' }).format(
        date,
      )
}
function formatTime(value: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  return new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' }).format(date)
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
