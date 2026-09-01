import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { HTMLAttributes, ReactNode } from 'react'

import payloadConfig from '@payload-config'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Gauge,
  QrCode,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import { getPayload } from 'payload'

import MarkOfExcellence from '@/components/ui/MarkOfExcellence'
import type { Meeting, User } from '@/payload-types'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import { cn } from '@/utilities/ui'

import { getTodayMeeting } from './actions'
import ClockComponent from './clockComponent'
import PageClient from './page.client'
import Scanner from './scanner'

const roleLabels: Record<User['role'], string> = {
  active: 'Membru Activ',
  aspirer: 'Membru Aspirant',
  'hr-director': 'HR Director',
  passive: 'Membru Pasiv',
  'past-president': 'Past President',
  president: 'Președinte',
  'pr-director': 'PR Director',
  secretary: 'Secretar',
  treasurer: 'Trezorier',
  'vice-president': 'Vice Președinte',
}

async function Page() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const me = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })

  if (!me.user) {
    redirect('/members/login')
  }

  if (!me.permissions.canAccessAdmin) {
    redirect('/members')
  }

  const operator = me.user as User

  const [meeting, activeMembers] = await Promise.all([
    getTodayMeeting(true, true),
    payload.count({
      collection: 'users',
      where: {
        role: {
          equals: 'active',
        },
      },
    }),
  ])

  const checkedInCount = meeting?.attendance?.totalDocs ?? 0
  const motivatedCount = meeting?.absenceMotivations?.totalDocs ?? 0
  const expectedCount = Math.max(activeMembers.totalDocs - motivatedCount, 0)
  const attendanceRate = getAttendanceRate(checkedInCount, expectedCount)

  return (
    <div className="halftone-background min-h-screen bg-background text-foreground">
      <PageClient />

      <CheckInHero meeting={meeting} operator={operator} />

      <main className="container grid gap-4 py-8 lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Scanner
          expectedCount={expectedCount}
          hasMeeting={Boolean(meeting)}
          initialCheckedInCount={checkedInCount}
          user={{
            email: operator.email,
            id: operator.id,
            name: operator.name,
          }}
        />

        <aside className="grid content-start gap-4">
          <MeetingOverview
            attendanceRate={attendanceRate}
            checkedInCount={checkedInCount}
            expectedCount={expectedCount}
            meeting={meeting}
            motivatedCount={motivatedCount}
          />
          {/* <OperatorPanel operator={operator} /> */}
          {/* <QuickActionsPanel /> */}
        </aside>
      </main>
    </div>
  )
}

function CheckInHero(props: { meeting?: Meeting; operator: User }) {
  const { meeting, operator } = props

  return (
    <section className="halftone-background relative overflow-hidden border-b border-white/10 bg-[#0f172c] px-4 pb-8 pt-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00a2e0]/70 to-transparent" />

      <div className="container">
        <Link
          className="mb-8 inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          href="/members"
        >
          <ArrowLeft className="size-4" />
          Dashboard membri
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/80 backdrop-blur">
              <MarkOfExcellence className="size-3" currentAccent="blue" />
              Interact București Triumph
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Check-in Membri
              </h1>
              <StatusPill tone={meeting ? 'success' : 'warning'}>
                {meeting ? 'Scanner activ' : 'Fără ședință'}
              </StatusPill>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Check-in de prezență pentru ședințele clubului. | {operator.name || operator.email}.
            </p>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-white/55">Ora scannerului</p>
                <ClockComponent className="mt-1 block text-3xl font-semibold text-white" />
              </div>
              <div className="flex size-11 items-center justify-center rounded-md bg-[#00a2e0]/20 text-[#00a2e0]">
                <Clock className="size-5" />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/65">
              {meeting
                ? `Ședința din ${formatMeetingDate(meeting.meetingDate)}`
                : 'Nu există o ședință programată pentru astăzi.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MeetingOverview(props: {
  attendanceRate: number
  checkedInCount: number
  expectedCount: number
  meeting?: Meeting
  motivatedCount: number
}) {
  const { attendanceRate, checkedInCount, expectedCount, meeting, motivatedCount } = props

  return (
    <Panel>
      <PanelHeader
        description={
          meeting
            ? `${formatMeetingDate(meeting.meetingDate)} la ${formatMeetingTime(meeting.meetingDate)}`
            : 'Statusul se actualizează când există o ședință în ziua curentă.'
        }
        icon={<CalendarDays className="size-5" />}
        title="Ședința de azi"
      />

      {meeting ? (
        <div className="mt-6 grid gap-4">
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold">{attendanceRate}%</p>
                <p className="text-sm text-muted-foreground">prezență estimată</p>
              </div>
              <StatusPill tone={attendanceRate >= 70 ? 'success' : 'warning'}>
                {checkedInCount}/{expectedCount}
              </StatusPill>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#00a2e0]"
                style={{ width: `${Math.min(attendanceRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              icon={<UserCheck className="size-4" />}
              label="Prezenți"
              value={checkedInCount}
            />
            <MetricCard
              icon={<UsersRound className="size-4" />}
              label="Așteptați"
              value={expectedCount}
            />
            <MetricCard
              icon={<UsersRound className="size-4" />}
              label="Rata"
              value={`${Math.round((checkedInCount / expectedCount) * 100)}%`}
            />
            {/* <MetricCard
              icon={<CheckCircle2 className="size-4" />}
              label="Motivați"
              tone="warning"
              value={motivatedCount}
            /> */}
          </div>
        </div>
      ) : (
        <EmptyState label="Nu există întâlnire programată astăzi." />
      )}
    </Panel>
  )
}

function OperatorPanel(props: { operator: User }) {
  const { operator } = props

  return (
    <Panel>
      <PanelHeader
        description={roleLabels[operator.role]}
        icon={<ShieldCheck className="size-5" />}
        title="Operator"
      />

      <div className="mt-6 rounded-md border border-border bg-sidebar/60 p-4">
        <p className="truncate text-lg font-semibold">{operator.name || operator.email}</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{operator.email}</p>
      </div>
    </Panel>
  )
}

function QuickActionsPanel() {
  return (
    <Panel>
      <PanelHeader
        description="Accese administrative pentru prezență și ședințe."
        icon={<ClipboardCheck className="size-5" />}
        title="Control rapid"
      />

      <div className="mt-6 grid gap-2">
        <QuickAction href="/admin/collections/attendance" icon={<QrCode className="size-4" />}>
          Prezență
        </QuickAction>
        <QuickAction href="/admin/collections/meetings" icon={<CalendarDays className="size-4" />}>
          Ședințe
        </QuickAction>
        <QuickAction href="/admin" icon={<Gauge className="size-4" />}>
          Admin
        </QuickAction>
      </div>
    </Panel>
  )
}

function QuickAction(props: { children: ReactNode; href: string; icon: ReactNode }) {
  const { children, href, icon } = props

  return (
    <Link
      className="inline-flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-sidebar/60 px-3 py-2 text-sm font-semibold transition hover:border-[#00a2e0]/50 hover:bg-[#00a2e0]/10"
      href={href}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="text-[#00a2e0]">{icon}</span>
        <span className="truncate">{children}</span>
      </span>
      <ArrowLeft className="size-4 rotate-180 text-muted-foreground" />
    </Link>
  )
}

function Panel(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props

  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5',
        className,
      )}
      {...rest}
    />
  )
}

function PanelHeader(props: { description?: string; icon: ReactNode; title: string }) {
  const { description, icon, title } = props

  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#00a2e0]/15 text-[#00a2e0]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

function MetricCard(props: {
  icon: ReactNode
  label: string
  tone?: 'default' | 'warning'
  value: number | string
}) {
  const { icon, label, tone = 'default', value } = props

  return (
    <div className="rounded-md border border-border bg-sidebar/60 p-3 flex flex-wrap gap-2">
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-md bg-[#00a2e0]/15 text-[#00a2e0]',
          tone === 'warning' && 'bg-[#f7a81b]/15 text-[#f7a81b]',
        )}
      >
        {icon}
      </span>
      <p className="inline text-2xl mx-2 font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground w-full">{label}</p>
    </div>
  )
}

function StatusPill(props: { children: ReactNode; tone: 'success' | 'warning' }) {
  const { children, tone } = props

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold',
        tone === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
        tone === 'warning' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#f7a81b]',
      )}
    >
      {children}
    </span>
  )
}

function EmptyState(props: { label: string }) {
  return (
    <div className="mt-6 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
      {props.label}
    </div>
  )
}

function getAttendanceRate(checkedInCount: number, expectedCount: number) {
  if (expectedCount <= 0) return 0

  return Math.round((checkedInCount / expectedCount) * 100)
}

function formatMeetingDate(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', {
    dateStyle: 'full',
  })
}

function formatMeetingTime(date: string) {
  return new Date(date).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default Page
