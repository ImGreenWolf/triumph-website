import Link from 'next/link'
import type { HTMLAttributes, ReactNode } from 'react'
import {
  ArrowRight,
  AtSign,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Inbox,
  Info,
  KeyRound,
  LogOut,
  Mail,
  Megaphone,
  SettingsIcon,
  ShieldCheck,
  UserCheck,
  UserCircle,
  Clock3,
} from 'lucide-react'
import MarkOfExcellence from '@/components/ui/MarkOfExcellence'
import type { MembersDashboard, User } from '@/payload-types'
import { formatRotaryYearLabel, getRotaryYearStart } from '@/utilities/rotaryYear'
import { cn } from '@/utilities/ui'
import TimelineDots from '../TimelineDots'
import MemberCodeActions from '../memberCode'

const DEFAULT_DUES_INFO_TEXT =
  'Cotizațiile sunt calculate începând cu luna primei ședințe din mandatul curent. Luna curentă este marcată printr-un chip gol și nu este considerată restantă. Restanțele păstrează regula existentă: primele 4 luni sunt evaluate la 21 lei, apoi la 41 lei.'
const roleLabels: Record<User['role'], string> = {
  aspirer: 'Membru Aspirant',
  active: 'Membru Activ',
  'vice-president': 'Vice Președinte',
  president: 'Președinte',
  'pr-director': 'PR Director',
  'hr-director': 'HR Director',
  secretary: 'Secretar',
  treasurer: 'Trezorier',
  'past-president': 'Past President',
  passive: 'Membru Pasiv',
}

export type DashboardShellProps = {
  member: Pick<User, 'id' | 'name' | 'email' | 'role' | 'clubMail'>
  dashboard: MembersDashboard
  capabilities: { projects: boolean; commissions: boolean; board: boolean }
  hasWebmail: boolean
  now: Date
  slots?: Partial<DashboardSlots>
}

export function DataPlaceholder({
  className,
  label = 'Se încarcă',
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block h-full w-16 max-w-full rounded bg-muted align-middle motion-safe:animate-pulse',
        className,
      )}
    />
  )
}
export const meetingLinkClassName =
  'inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50'
export function PendingMeetingLink() {
  return (
    <button type="button" disabled className={meetingLinkClassName}>
      Vezi întâlnirea
      <ArrowRight className="size-4" />
    </button>
  )
}
export function MeetingDescription({
  message,
  description,
}: {
  message: ReactNode
  description?: ReactNode
}) {
  return (
    <>
      <div className="h-12 overflow-hidden text-sm leading-6 text-muted-foreground">
        <div className="line-clamp-2">{message}</div>
      </div>
      <div className="mt-3 h-18 overflow-hidden text-sm leading-6 text-foreground/80">
        <div className="line-clamp-3">{description}</div>
      </div>
    </>
  )
}
export const dashboardFallbacks = {
  avatar: <UserCircle className="size-9 text-muted-foreground" />,
  attendanceValue: <DataPlaceholder className="w-[3ch]" />,
  attendanceBadge: <DataPlaceholder className="h-[26px] w-full" />,
  attendanceProgress: <span className="block h-2 bg-muted motion-safe:animate-pulse" />,
  attendancePresent: <DataPlaceholder />,
  attendanceMotivated: <DataPlaceholder />,
  attendanceAbsent: <DataPlaceholder />,
  attendanceTimeline: (
    <TimelineDots
      emptyLabel="Nu există ședințe trecute încă."
      items={[]}
      modalTitle="Istoric prezență"
      loading
    />
  ),
  duesValue: <DataPlaceholder className="w-[4ch]" />,
  duesBadge: <DataPlaceholder className="h-[26px] w-full" />,
  duesCovered: <DataPlaceholder />,
  duesWaived: <DataPlaceholder />,
  duesOverdue: <DataPlaceholder />,
  duesTimeline: (
    <TimelineDots
      emptyLabel="Nu există luni calculate."
      items={[]}
      modalTitle="Istoric cotizații"
      loading
    />
  ),
  meetingRelative: <DataPlaceholder className="h-7 w-32" />,
  meetingStatus: <DataPlaceholder className="h-6 w-full" />,
  meetingDate: <DataPlaceholder className="h-6 w-full" />,
  meetingTiming: <DataPlaceholder className="h-5 w-32" />,
  meetingDescription: (
    <MeetingDescription
      message={<DataPlaceholder className="h-5 w-full" />}
      description={<DataPlaceholder className="h-5 w-3/4" />}
    />
  ),
  meetingLink: <PendingMeetingLink />,
  inboxCount: <DataPlaceholder className="h-5 w-20" />,
  inboxBadge: <DataPlaceholder className="h-4 w-16" />,
  inboxRows: <InboxRows loading />,
}
export type DashboardSlots = { [Key in keyof typeof dashboardFallbacks]: ReactNode }

export default function DashboardShell(props: DashboardShellProps) {
  const { member, dashboard, capabilities, hasWebmail, now } = props
  const slots = { ...dashboardFallbacks, ...props.slots }
  const year = formatRotaryYearLabel(getRotaryYearStart(now)).toLowerCase()
  return (
    <div
      className="halftone-background min-h-screen bg-background text-foreground"
      data-dashboard-shell
    >
      <DashboardHero dashboard={dashboard} />
      <main className="container grid gap-4 py-8">
        {dashboard.announcement?.enabled && (
          <Announcement
            message={dashboard.announcement.message}
            title={dashboard.announcement.title}
          />
        )}
        <MemberSummary member={member} capabilities={capabilities} avatar={slots.avatar} />
        <div className="grid gap-4 lg:auto-rows-fr lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_420px]">
          <DashboardPanel
            data-dashboard-panel="attendance"
            className="flex h-full min-w-0 flex-col"
          >
            <PanelHeader
              description={`Situația ta în ședințele înregistrate din ${year}.`}
              icon={<CheckCircle2 className="size-5" />}
              title="Prezență"
            />
            <div className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="h-10 whitespace-nowrap text-4xl font-bold leading-10 tabular-nums"
                    data-dashboard-slot="attendance-value"
                  >
                    <span className="inline-block h-10 w-[3ch] align-top">
                      {slots.attendanceValue}
                    </span>
                    %
                  </div>
                  <p className="text-sm text-muted-foreground">prezență calculată</p>
                </div>
                <div className="flex h-7 w-36 shrink-0 items-center justify-end">
                  {slots.attendanceBadge}
                </div>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                data-dashboard-slot="attendance-progress"
              >
                {slots.attendanceProgress}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniStat label="Prezente" value={slots.attendancePresent} />
              <MiniStat label="Motivate" value={slots.attendanceMotivated} />
              <MiniStat label="Nemotivate" value={slots.attendanceAbsent} tone="danger" />
            </div>
            <div className="mt-auto" data-dashboard-footer="attendance">
              {slots.attendanceTimeline}
            </div>
          </DashboardPanel>
          <DashboardPanel
            data-dashboard-panel="dues"
            className="relative flex h-full min-w-0 flex-col"
          >
            <PanelHeader
              description={
                capabilities.board
                  ? 'Membrii boardului sunt scutiți de cotizații.'
                  : `Lunile achitate, scutite și restante din ${year}.`
              }
              icon={<CreditCard className="size-5" />}
              title="Cotizații"
            />
            <InfoTooltip text={dashboard.duesInfoText || DEFAULT_DUES_INFO_TEXT} />
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="min-w-0">
                <div
                  className="flex h-10 items-baseline gap-2 whitespace-nowrap text-4xl font-bold leading-10 tabular-nums"
                  data-dashboard-slot="dues-value"
                >
                  <span className="inline-block h-10">{slots.duesValue}</span>
                  <span>lei</span>
                </div>
                <p className="text-sm text-muted-foreground">de plată estimat</p>
              </div>
              <div className="flex h-7 w-36 items-center">{slots.duesBadge}</div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniStat label="Acoperite" value={slots.duesCovered} />
              <MiniStat label="Scutite" value={slots.duesWaived} tone="warning" />
              <MiniStat label="Restante" value={slots.duesOverdue} tone="danger" />
            </div>
            <div className="mt-auto" data-dashboard-footer="dues">
              {slots.duesTimeline}
            </div>
          </DashboardPanel>
          <section
            data-dashboard-panel="meeting"
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
          >
            <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent">
                  <CalendarDays className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold leading-5 text-muted-foreground">
                    Următoarea întâlnire
                  </h2>
                  <div
                    data-dashboard-slot="meeting-relative"
                    className="mt-1 h-14 overflow-hidden text-xl font-semibold leading-7 sm:h-16 sm:text-2xl sm:leading-8"
                  >
                    <div className="line-clamp-2">{slots.meetingRelative}</div>
                  </div>
                </div>
              </div>
              <div
                className="flex h-14 w-32 shrink-0 flex-col items-end gap-2"
                data-dashboard-slot="meeting-status"
              >
                {slots.meetingStatus}
              </div>
            </header>
            <div className="border-y border-border bg-muted/25 px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)] sm:gap-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Program</p>
                  <div
                    data-dashboard-slot="meeting-date"
                    className="mt-1 h-12 overflow-hidden text-base font-semibold leading-6"
                  >
                    <div className="line-clamp-2">{slots.meetingDate}</div>
                  </div>
                </div>
                <div className="min-w-0 border-border sm:border-l sm:pl-6">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Detalii</p>
                  <div className="mt-1 flex h-10 items-start gap-2 text-sm font-medium leading-5 text-muted-foreground">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" />
                    <div className="line-clamp-2">{slots.meetingTiming}</div>
                  </div>
                </div>
              </div>
            </div>
            <div
              data-dashboard-slot="meeting-description"
              className="flex flex-1 flex-col px-5 py-4 sm:px-6"
            >
              {slots.meetingDescription}
            </div>
            <MemberCodeActions
              member={{ id: member.id, name: member.name, email: member.email, role: member.role }}
            >
              {slots.meetingLink}
            </MemberCodeActions>
          </section>
        </div>
        {member.clubMail && <EmailCard member={member} hasWebmail={hasWebmail} slots={slots} />}
      </main>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone?: 'danger' | 'warning'
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-sidebar/60 p-3">
      <div
        className={cn(
          'h-8 text-2xl font-semibold leading-8 tabular-nums',
          tone === 'danger' && 'text-red-500',
          tone === 'warning' && 'text-[#f7a81b]',
        )}
      >
        {value}
      </div>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{label}</p>
    </div>
  )
}

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode
  tone: 'success' | 'warning' | 'danger'
}) {
  return (
    <span
      className={cn(
        'inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold leading-4',
        tone === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        tone === 'warning' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        tone === 'danger' && 'border-red-500/25 bg-red-500/10 text-red-500',
      )}
    >
      {children}
    </span>
  )
}
function DashboardHero({ dashboard }: { dashboard: MembersDashboard }) {
  return (
    <section className="halftone-background relative overflow-hidden border-b border-white/10 bg-sidebar px-4 pb-10 pt-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div className="container">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/80 backdrop-blur">
              <MarkOfExcellence className="size-3" currentAccent="blue" />
              Interact București Triumph
            </div>

            <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {dashboard?.dashboardTitle || 'Dashboard Membrii'}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              {dashboard?.welcomeMessage ||
                'Spațiul tău pentru prezență, cotizații și întâlnirile clubului.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Announcement(props: { title?: string | null; message?: string | null }) {
  const { title, message } = props

  return (
    <DashboardPanel className="border-[#f7a81b]/35 bg-[#f7a81b]/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PanelIcon className="bg-[#f7a81b]/20 text-[#f7a81b]">
          <Megaphone className="size-5" />
        </PanelIcon>

        <div>
          <p className="text-sm font-semibold uppercase text-muted-foreground">Anunț</p>
          <h2 className="mt-1 text-xl font-semibold">{title || 'Anunț pentru membri'}</h2>
          {message && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    </DashboardPanel>
  )
}

function MemberSummary({
  member,
  capabilities,
  avatar,
}: {
  member: DashboardShellProps['member']
  capabilities: DashboardShellProps['capabilities']
  avatar: ReactNode
}) {
  const {
    projects: hasManagedEvents,
    commissions: hasManagedCommissions,
    board: hasHRPanelAccess,
  } = capabilities
  return (
    <section>
      <DashboardPanel
        data-dashboard-panel="profile"
        className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            data-dashboard-slot="avatar"
            className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-sidebar/60"
          >
            {avatar}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Profil</p>
            <p className="mt-1 truncate text-2xl font-semibold leading-tight">
              {member.name || member.email}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{roleLabels[member.role]}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {hasManagedEvents && (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-accent px-3 text-sm font-semibold text-white transition hover:bg-accent"
              href="/members/projects"
            >
              <ClipboardCheck className="size-4" />
              Panou PM
            </Link>
          )}

          {hasManagedCommissions && (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-accent px-3 text-sm font-semibold text-white transition hover:bg-accent"
              href="/members/commissions"
            >
              <BriefcaseBusiness className="size-4" />
              Panou Comisii
            </Link>
          )}

          {hasHRPanelAccess && (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-accent px-3 text-sm font-semibold text-white transition hover:bg-accent"
              href="/members/recruitment"
            >
              <UserCheck className="size-4" />
              Panou HR
            </Link>
          )}

          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-sidebar/60 px-3 text-sm font-semibold text-white transition hover:bg-sidebar hover:text-foreground"
            href="/members/profile"
          >
            <SettingsIcon className="size-4" />
            Profile
          </Link>

          {hasHRPanelAccess && (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-sidebar/60 px-3 text-sm font-semibold text-white transition hover:bg-sidebar hover:text-foreground"
              href="/admin"
            >
              <ShieldCheck className="size-4" />
              Club Admin
            </Link>
          )}

          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-sidebar/60 px-3 text-sm font-semibold text-muted-foreground transition hover:bg-sidebar hover:text-foreground"
            href="/members/logout"
          >
            <LogOut className="size-4" />
            Logout
          </Link>
        </div>
      </DashboardPanel>
    </section>
  )
}

function EmailCard({
  member: user,
  hasWebmail: canOpenWebmail,
  slots,
}: {
  member: DashboardShellProps['member']
  hasWebmail: boolean
  slots: DashboardSlots
}) {
  return (
    <DashboardPanel data-dashboard-panel="email" className="overflow-hidden p-0">
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <PanelHeader
            description="Acces rapid la contul tău de email Interact."
            icon={<Mail className="size-5" />}
            title="Email Interact"
          />

          <div className="mt-6 flex min-w-0 flex-col gap-4">
            <div className="min-w-0 rounded-md border border-white/10 bg-sidebar/45 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Adresa ta</p>
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <AtSign className="size-4" />
                </span>
                <p className="min-w-0 break-all text-base font-semibold leading-6">
                  {user.clubMail}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-card-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Acces</p>
                  <p className="h-5 w-24 truncate text-sm font-semibold leading-5">
                    {canOpenWebmail ? 'Activ' : 'Neconfigurat'}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-card-foreground">
                  <Inbox className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Inbox</p>
                  <p className="h-5 w-24 truncate text-sm font-semibold leading-5">
                    {slots.inboxCount}
                  </p>
                </div>
              </div>
            </div>

            {canOpenWebmail ? (
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 sm:w-fit"
                href="/members/webmail"
                rel="noreferrer"
                target="_blank"
              >
                Deschide Webmail
                <ExternalLink className="size-4" />
              </Link>
            ) : (
              <div className="rounded-md border border-dashed border-white/15 p-4 text-sm leading-6 text-muted-foreground">
                Contul tău de email nu este complet configurat.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Mesaje recente
              </p>
              <h3 className="mt-1 text-lg font-semibold leading-tight">Inbox Interact</h3>
            </div>

            <span className="inline-flex w-28 items-center justify-center h-[26px] rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-card-foreground">
              {slots.inboxBadge}
            </span>
          </div>

          <div className="mt-5 h-[280px] sm:h-[196px]" data-dashboard-slot="inbox-rows">
            {slots.inboxRows}
          </div>

          {canOpenWebmail && (
            <Link
              className="mt-4 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase text-accent transition hover:text-accent/80"
              href="/members/webmail"
              rel="noreferrer"
              target="_blank"
            >
              Vezi toate mesajele
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </DashboardPanel>
  )
}

function DashboardPanel(props: HTMLAttributes<HTMLDivElement>) {
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

function PanelHeader(props: { title: string; description?: string; icon: ReactNode }) {
  const { title, description, icon } = props

  return (
    <div className="flex items-start gap-4">
      <PanelIcon>{icon}</PanelIcon>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

function PanelIcon(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props

  return (
    <div
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent',
        className,
      )}
      {...rest}
    />
  )
}

function InfoTooltip(props: { text: string }) {
  return (
    <div className="group absolute right-5 top-5 inline-flex sm:right-6 sm:top-6">
      <button
        aria-label="Detalii despre cotizații"
        className="inline-flex size-9 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        type="button"
      >
        <Info className="size-4" />
      </button>

      <div className="pointer-events-none absolute right-0 top-full z-20 mt-3 w-72 rounded-md border border-border bg-card p-3 text-xs leading-5 text-card-foreground opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">
        {props.text}
      </div>
    </div>
  )
}

export type InboxMessage = { uid?: number; subject?: string; from?: string; date?: string }
export function InboxRows({
  messages = [],
  loading = false,
  error,
}: {
  messages?: InboxMessage[]
  loading?: boolean
  error?: string
}) {
  if (!loading && !messages.length)
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
        {error || 'Nu există mesaje recente în inbox.'}
      </div>
    )
  return (
    <div className="grid h-full grid-rows-3 divide-y divide-white/10 overflow-hidden rounded-md border border-white/10">
      {Array.from({ length: 3 }, (_, index) => {
        const mail = messages[index]
        return (
          <div
            key={mail?.uid ?? index}
            aria-hidden={!loading && !mail ? true : undefined}
            className="grid min-w-0 grid-rows-[40px_20px] items-center gap-2 bg-sidebar/35 px-3 py-3 sm:grid-cols-[minmax(8rem,13rem)_minmax(0,1fr)] sm:grid-rows-1 sm:gap-4 sm:px-4"
          >
            {loading ? (
              <>
                <div className="space-y-2">
                  <DataPlaceholder className="block h-4 w-28" />
                  <DataPlaceholder className="block h-3 w-20" />
                </div>
                <DataPlaceholder className="h-4 w-3/4" />
              </>
            ) : mail ? (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-5">
                    {formatMailSender(mail.from)}
                  </p>
                  <p className="mt-1 truncate text-xs leading-4 text-muted-foreground">
                    {formatMailboxDate(mail.date)}
                  </p>
                </div>
                <p className="min-w-0 truncate text-sm leading-5 text-card-foreground/85">
                  {mail.subject || 'Fără subiect'}
                </p>
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
function formatMailboxDate(date?: string) {
  if (!date) return 'Dată indisponibilă'

  return new Date(date).toLocaleString('ro-RO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

function formatMailSender(from?: string) {
  if (!from) return 'Expeditor necunoscut'

  const quotedName = from.match(/"([^"]+)"/)?.[1]
  if (quotedName) return quotedName

  const withoutAddress = from.replace(/<[^>]+>/g, '').trim()

  return withoutAddress || from
}
