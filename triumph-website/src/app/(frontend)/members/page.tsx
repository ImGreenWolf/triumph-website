import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { HTMLAttributes, ReactNode } from 'react'

import payloadConfig from '@payload-config'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Megaphone,
  ShieldCheck,
  UserCircle,
} from 'lucide-react'
import { getPayload } from 'payload'

import MarkOfExcellence from '@/components/ui/MarkOfExcellence'
import {
  AbsenceMotivation,
  Attendance as AttendanceType,
  Meeting,
  MembersDashboard,
  Payment,
  User,
} from '@/payload-types'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'
import { cn } from '@/utilities/ui'

import PageClient from './page.client'
import TimelineDots from './TimelineDots'

const MONTHLY_DUE = 21
const OVERDUE_DUE = 41
const OVERDUE_GRACE_MONTHS = 4
const DEFAULT_DUES_INFO_TEXT =
  'Luna curentă este marcată printr-un chip gol și nu este considerată restantă. Restanțele păstrează regula existentă: primele 4 luni sunt evaluate la 21 lei, apoi la 41 lei.'
const boardMemberRoles = new Set<string>([
  'president',
  'pr-director',
  'hr-director',
  'secretary',
  'tresoursier',
])

const roleLabels: Record<User['role'], string> = {
  aspirer: 'Membru Aspirant',
  active: 'Membru Activ',
  president: 'Președinte',
  'pr-director': 'PR Director',
  'hr-director': 'HR Director',
  secretary: 'Secretar',
  tresoursier: 'Trezorier',
}

export default async function DashboardPage() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/members/login')
  }

  const me = await payload.auth({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })

  if (!me.user) {
    redirect('/members/login')
  }

  const member = me.user as User

  const dashboard = (await payload.findGlobal({
    slug: 'members-dashboard',
  })) as MembersDashboard

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageClient />

      <section className="relative overflow-hidden border-b border-white/10 bg-[#0f172c] px-4 pb-10 pt-28 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00a2e0]/70 to-transparent" />
        <div className="mx-auto max-w-7xl">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {boardMemberRoles.has(member.role) && (
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                  href="/admin"
                >
                  <ShieldCheck className="size-4" />
                  Club Admin
                </Link>
              )}

              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white px-4 text-sm font-semibold text-[#0f172c] transition hover:bg-white/90"
                href="/members/logout"
              >
                <LogOut className="size-4" />
                Logout
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {dashboard?.announcement?.enabled && (
          <Announcement
            message={dashboard.announcement.message}
            title={dashboard.announcement.title}
          />
        )}

        <MemberSummary member={member} />

        <div className="grid gap-6">
          <div className="grid gap-6 lg:auto-rows-fr lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_420px]">
            <Attendance member={member} />
            <Dues duesInfoText={dashboard?.duesInfoText} member={member} />
            <NextMeeting member={member} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <QuickLinks links={dashboard?.quickLinks} />
            <SupportCard email={dashboard?.supportEmail} />
          </div>
        </div>
      </main>
    </div>
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

function MemberSummary(props: { member: User }) {
  const { member } = props

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard
        icon={<UserCircle className="size-5" />}
        label="Profil"
        value={member.name || member.email}
        detail={roleLabels[member.role]}
      />
      <MetricCard
        icon={<Mail className="size-5" />}
        label="Email"
        value={member.email}
        detail="Contul tău de membru"
      />
      <MetricCard
        icon={<ShieldCheck className="size-5" />}
        label="Membru din"
        value={formatDate(member.joinedAt, {
          dateStyle: 'long',
        })}
        detail="Înregistrat în club"
      />
    </section>
  )
}

async function Attendance(props: { member: User }) {
  const { member } = props

  const payload = await getPayload({
    config: payloadConfig,
  })

  const {
    absentMeetings,
    attendancePercentage,
    lateMeetings,
    motivatedMeetings,
    presentMeetings,
    records: attendance,
  } = await getMemberAttendanceSummary(payload, member)

  return (
    <DashboardPanel className="flex h-full flex-col">
      <PanelHeader
        description="Situația ta în ședințele înregistrate."
        icon={<CheckCircle2 className="size-5" />}
        title="Prezență"
      />

      <div className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-bold">{attendancePercentage}%</p>
            <p className="text-sm text-muted-foreground">prezență calculată</p>
          </div>
          <StatusPill tone={attendancePercentage >= 70 ? 'success' : 'danger'}>
            {attendancePercentage >= 70 ? 'În regulă' : 'Necesită atenție'}
          </StatusPill>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00a2e0]"
            style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <MiniStat label="Prezente" value={presentMeetings + lateMeetings} />
        <MiniStat label="Motivate" value={motivatedMeetings} />
        <MiniStat label="Nemotivate" value={absentMeetings} tone="danger" />
      </div>

      <div className="mt-auto">
        <TimelineDots
          emptyLabel="Nu există ședințe trecute încă."
          items={attendance.map((record) => ({
            action: {
              href: `/members/meetings/${record.meeting.id}`,
              label: 'Vezi minuta',
            },
            date: formatDate(record.meeting.meetingDate, {
              day: '2-digit',
              month: '2-digit',
            }),
            detailDate: formatDate(record.meeting.meetingDate, {
              dateStyle: 'medium',
            }),
            label: attendanceLabel(record.status),
            tone: attendanceTone(record.status),
          }))}
          modalTitle="Istoric prezență"
        />
      </div>
    </DashboardPanel>
  )
}

async function Dues(props: { duesInfoText?: string | null; member: User }) {
  const { duesInfoText, member } = props

  const payload = await getPayload({
    config: payloadConfig,
  })

  const paymentsDocs = await payload.find({
    collection: 'payments',
    where: {
      member: {
        equals: member.id,
      },
    },
    sort: 'month',
  })

  const payments = paymentsDocs.docs as Payment[]
  const expectedMonths = getExpectedMonths(member.joinedAt)
  const paymentsByMonth = new Map(
    payments.map((payment) => {
      const month = new Date(payment.month)

      return [getMonthKey(month), payment]
    }),
  )

  let overdueMonthsSeen = 0
  const dues = expectedMonths.map((month) => {
    const key = getMonthKey(month)
    const payment = paymentsByMonth.get(key)
    const isCurrentMonth = key === getMonthKey(new Date())
    let amountDue = 0

    if (!payment) {
      if (isCurrentMonth) {
        amountDue = MONTHLY_DUE
      } else {
        overdueMonthsSeen += 1
        amountDue = overdueMonthsSeen <= OVERDUE_GRACE_MONTHS ? MONTHLY_DUE : OVERDUE_DUE
      }
    }

    return {
      amountDue,
      month,
      paid: Boolean(payment),
      payment,
      isCurrentMonth,
      waived: payment?.type === 'waived',
    }
  })

  const paidCount = dues.filter((due) => due.paid && !due.waived).length
  const waivedCount = dues.filter((due) => due.waived).length
  const coveredCount = paidCount + waivedCount
  const overdueCount = dues.filter((due) => !due.paid && !due.isCurrentMonth).length
  const totalOwed = dues.reduce((total, due) => total + due.amountDue, 0)

  return (
    <DashboardPanel className="relative flex h-full flex-col">
      <PanelHeader
        description="Lunile achitate, scutite și restante."
        icon={<CreditCard className="size-5" />}
        title="Cotizații"
      />
      <InfoTooltip text={duesInfoText || DEFAULT_DUES_INFO_TEXT} />

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className={cn('text-4xl font-bold', totalOwed > 0 && 'text-red-500')}>
            {totalOwed} lei
          </p>
          <p className="text-sm text-muted-foreground">de plată estimat</p>
        </div>

        <StatusPill tone={overdueCount === 0 ? 'success' : 'danger'}>
          {overdueCount === 0 ? 'Fără restanțe' : `${overdueCount} restante`}
        </StatusPill>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <MiniStat label="Acoperite" value={coveredCount} />
        <MiniStat label="Scutite" value={waivedCount} tone="warning" />
        <MiniStat label="Restante" value={overdueCount} tone="danger" />
      </div>

      <div className="mt-auto">
        <TimelineDots
          emptyLabel="Nu există luni calculate."
          items={dues.map((due) => ({
            date: due.month.toLocaleDateString('ro-RO', {
              month: '2-digit',
              year: '2-digit',
            }),
            detailDate: due.month.toLocaleDateString('ro-RO', {
              month: 'long',
              year: 'numeric',
            }),
            details: due.waived
              ? [
                  'Scutit de plată',
                  ...(due.payment
                    ? [
                        `Înregistrat: ${formatDate(due.payment.createdAt, {
                          dateStyle: 'medium',
                        })}`,
                      ]
                    : []),
                ]
              : due.paid
                ? [
                    `Sumă achitată: ${due.payment?.amount ?? MONTHLY_DUE} lei`,
                    ...(due.payment
                      ? [
                          `Înregistrat: ${formatDate(due.payment.createdAt, {
                            dateStyle: 'medium',
                          })}`,
                        ]
                      : []),
                  ]
                : [
                    `Sumă de plată: ${due.amountDue} lei`,
                    due.isCurrentMonth ? 'Luna curentă' : 'Plată restantă',
                  ],
            label: due.waived
              ? 'Scutit'
              : due.paid
                ? 'Achitat'
                : due.isCurrentMonth
                  ? 'De plată'
                  : 'Restant',
            empty: !due.paid && due.isCurrentMonth,
            tone:
              due.waived || (!due.paid && due.isCurrentMonth)
                ? 'warning'
                : due.paid
                  ? 'success'
                  : 'danger',
          }))}
          modalTitle="Istoric cotizații"
        />
      </div>
    </DashboardPanel>
  )
}

async function NextMeeting(props: { member: User }) {
  const { member } = props

  const payload = await getPayload({
    config: payloadConfig,
  })

  const now = new Date()
  const meetingsDocs = await payload.find({
    collection: 'meetings',
    where: {
      meetingDate: {
        greater_than: now.toISOString(),
      },
    },
    sort: 'meetingDate',
    limit: 1,
  })

  const nextMeeting = meetingsDocs.docs[0] as Meeting | undefined

  if (!nextMeeting) {
    return (
      <DashboardPanel className="flex h-full flex-col">
        <PanelHeader
          description="Clubul nu are încă o ședință viitoare publicată."
          icon={<CalendarDays className="size-5" />}
          title="Următoarea întâlnire"
        />

        <div className="mt-6 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nu există întâlniri programate.
        </div>
      </DashboardPanel>
    )
  }

  const absenceMotivationsDocs = await payload.find({
    collection: 'absence-motivations',
    where: {
      and: [
        {
          member: {
            equals: member.id,
          },
        },
        {
          meeting: {
            equals: nextMeeting.id,
          },
        },
      ],
    },
    limit: 1,
    overrideAccess: false,
    user: member,
  })
  const absenceMotivation = absenceMotivationsDocs.docs[0] as AbsenceMotivation | undefined
  const meetingDate = new Date(nextMeeting.meetingDate)
  const daysRemaining = getDaysRemaining(now, meetingDate)

  return (
    <DashboardPanel className="flex h-full flex-col bg-card">
      <PanelHeader
        description="Următorul reper din calendarul clubului."
        icon={<CalendarDays className="size-5" />}
        title="Următoarea întâlnire"
      />

      <div className="mt-6 rounded-lg border border-[#00a2e0]/25 bg-[#00a2e0]/10 p-5">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00a2e0]/25 bg-background/60 px-3 py-1 text-sm font-medium">
          <Clock3 className="size-4 text-[#00a2e0]" />
          {formatRelativeDay(daysRemaining)}
        </div>

        <h3 className="text-2xl font-semibold leading-tight">
          {meetingDate.toLocaleString('ro-RO', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </h3>

        {nextMeeting.description && (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{nextMeeting.description}</p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center">
        <Link
          href={`/members/meetings/${nextMeeting.id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Vezi întâlnirea
          <ArrowRight className="size-4" />
        </Link>

        {absenceMotivation && <MotivationStatusBox status={absenceMotivation.status} />}
      </div>
    </DashboardPanel>
  )
}

function MotivationStatusBox(props: { status: AbsenceMotivation['status'] }) {
  return (
    <div
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold',
        props.status === 'accepted' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        props.status === 'pending' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        props.status === 'rejected' && 'border-red-500/25 bg-red-500/10 text-red-500',
      )}
    >
      {motivationLabel(props.status)}
    </div>
  )
}

function QuickLinks(props: { links?: MembersDashboard['quickLinks'] }) {
  const { links } = props

  return (
    <DashboardPanel>
      <PanelHeader
        description="Accese rapide configurate pentru membri."
        icon={<ExternalLink className="size-5" />}
        title="Linkuri utile"
      />

      {links?.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {links.map((link, index) => (
            <a
              className="group flex min-h-16 items-center justify-between gap-4 rounded-md border border-border bg-background/40 px-4 py-3 text-sm font-semibold transition hover:border-[#00a2e0]/50 hover:bg-[#00a2e0]/10"
              href={link.url || '#'}
              key={link.id || `${link.label}-${index}`}
            >
              <span>{link.label}</span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[#00a2e0]" />
            </a>
          ))}
        </div>
      ) : (
        <EmptyState label="Nu există linkuri configurate." />
      )}
    </DashboardPanel>
  )
}

function SupportCard(props: { email?: string | null }) {
  const { email } = props

  return (
    <DashboardPanel>
      <PanelHeader
        description="Pentru acces, date sau întrebări despre dashboard."
        icon={<HelpCircle className="size-5" />}
        title="Support"
      />

      {email ? (
        <a
          className="mt-6 inline-flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-4 py-3 text-sm font-semibold transition hover:border-[#00a2e0]/50 hover:bg-[#00a2e0]/10"
          href={`mailto:${email}`}
        >
          <span className="break-all">{email}</span>
          <Mail className="size-4 shrink-0 text-[#00a2e0]" />
        </a>
      ) : (
        <EmptyState label="Nu există email de support configurat." />
      )}
    </DashboardPanel>
  )
}

function DashboardPanel(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props

  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6',
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
        'flex size-11 shrink-0 items-center justify-center rounded-md bg-[#00a2e0]/15 text-[#00a2e0]',
        className,
      )}
      {...rest}
    />
  )
}

function MetricCard(props: { label: string; value: string; detail: string; icon: ReactNode }) {
  const { label, value, detail, icon } = props

  return (
    <DashboardPanel className="p-5 flex gap-4">
      <PanelIcon className="size-10">{icon}</PanelIcon>
      <div className="flex flex-col justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>

        <p className="break-words text-xl font-semibold leading-tight">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </div>
    </DashboardPanel>
  )
}

function MiniStat(props: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const { label, value, tone = 'default' } = props

  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <p
        className={cn(
          'text-2xl font-semibold',
          tone === 'success' && 'text-emerald-500',
          tone === 'warning' && 'text-[#f7a81b]',
          tone === 'danger' && 'text-red-500',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatusPill(props: { children: ReactNode; tone: 'success' | 'warning' | 'danger' }) {
  const { children, tone } = props

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold',
        tone === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        tone === 'warning' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        tone === 'danger' && 'border-red-500/25 bg-red-500/10 text-red-500',
      )}
    >
      {children}
    </span>
  )
}

function InfoTooltip(props: { text: string }) {
  return (
    <div className="group absolute right-5 top-5 inline-flex sm:right-6 sm:top-6">
      <button
        aria-label="Detalii despre cotizații"
        className="inline-flex size-9 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:text-[#00a2e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a2e0]/50"
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

function EmptyState(props: { label: string }) {
  return (
    <div className="mt-6 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
      {props.label}
    </div>
  )
}

function getExpectedMonths(joinedAt: string) {
  const joinedAtDate = new Date(joinedAt)
  const now = new Date()
  const expectedMonths: Date[] = []
  const start = new Date(joinedAtDate.getFullYear(), joinedAtDate.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let date = new Date(start); date <= end; date.setMonth(date.getMonth() + 1)) {
    expectedMonths.push(new Date(date))
  }

  return expectedMonths
}

function getMonthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`
}

function getDaysRemaining(from: Date, to: Date) {
  const start = new Date(from)
  const end = new Date(to)

  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function formatRelativeDay(daysRemaining: number) {
  if (daysRemaining === 0) return 'Astăzi'
  if (daysRemaining === 1) return 'Mâine'

  return `În ${daysRemaining} zile`
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString('ro-RO', options)
}

function attendanceLabel(status: AttendanceType['status']) {
  if (status === 'present') return 'Prezent'
  if (status === 'late') return 'Întârziat'
  if (status === 'motivated') return 'Motivat'

  return 'Absent'
}

function attendanceTone(status: AttendanceType['status']) {
  if (status === 'present' || status === 'late') return 'success'
  if (status === 'motivated') return 'warning'
  if (status === 'absent') return 'danger'

  return 'neutral'
}

function motivationLabel(status: AbsenceMotivation['status']) {
  if (status === 'accepted') return 'Motivare acceptată'
  if (status === 'rejected') return 'Motivare respinsă'

  return 'Motivare în verificare'
}
