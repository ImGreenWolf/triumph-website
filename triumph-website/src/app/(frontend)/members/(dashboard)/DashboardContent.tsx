import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Attendance as AttendanceType } from '@/payload-types'
import { MONTHLY_DUE } from '@/utilities/memberDues'
import { isBoardMember } from '@/utilities/membersAccess'
import { getEffectiveMeetingAttendanceStatus } from '@/utilities/meetingAttendance'
import { cn } from '@/utilities/ui'
import DashboardShell, {
  dashboardFallbacks,
  InboxRows,
  MeetingDescription,
  meetingLinkClassName,
  PendingMeetingLink,
  StatusPill,
  type DashboardShellProps,
  type DashboardSlots,
} from '../_components/DashboardShell'
import DashboardAvatar from '../_components/DashboardAvatar'
import TimelineDots from '../TimelineDots'
import type { DashboardData, DashboardMeeting } from './data'

async function Value<T>({
  promise,
  render,
}: {
  promise: Promise<T>
  render: (value: T) => ReactNode
}) {
  return render(await promise)
}
function slot<T>(name: keyof DashboardSlots, promise: Promise<T>, render: (value: T) => ReactNode) {
  return (
    <Suspense fallback={dashboardFallbacks[name]}>
      <Value promise={promise} render={render} />
    </Suspense>
  )
}

export default function DashboardContent({
  shell,
  data,
}: {
  shell: DashboardShellProps
  data: DashboardData
}) {
  const { attendance, dues, meeting, inbox } = data
  const duesExempt = isBoardMember(shell.member)
  const slots: DashboardSlots = {
    avatar: slot('avatar', data.avatar, (src) =>
      src ? <DashboardAvatar key={src} src={src} /> : dashboardFallbacks.avatar,
    ),
    attendanceValue: slot('attendanceValue', attendance, (value) => value.attendancePercentage),
    attendanceBadge: slot('attendanceBadge', attendance, (value) => (
      <StatusPill
        tone={
          value.totalMeetings === 0
            ? 'warning'
            : value.attendancePercentage >= 70
              ? 'success'
              : 'danger'
        }
      >
        {value.totalMeetings === 0
          ? 'Neevaluat'
          : value.attendancePercentage >= 70
            ? 'În regulă'
            : 'Necesită atenție'}
      </StatusPill>
    )),
    attendanceProgress: slot('attendanceProgress', attendance, (value) => (
      <span
        className="block h-2 rounded-full bg-accent"
        style={{ width: `${Math.min(value.attendancePercentage, 100)}%` }}
      />
    )),
    attendancePresent: slot(
      'attendancePresent',
      attendance,
      (value) => value.presentMeetings + value.lateMeetings,
    ),
    attendanceMotivated: slot(
      'attendanceMotivated',
      attendance,
      (value) => value.motivatedMeetings,
    ),
    attendanceAbsent: slot('attendanceAbsent', attendance, (value) => value.absentMeetings),
    attendanceTimeline: slot('attendanceTimeline', attendance, (value) => (
      <AttendanceTimeline attendance={value.records} />
    )),
    duesValue: slot('duesValue', dues, (value) => (
      <span className={value.overdueCount > 1 ? 'text-red-500' : undefined}>{value.totalOwed}</span>
    )),
    duesBadge: slot('duesBadge', dues, (value) => (
      <StatusPill tone={value.overdueCount === 0 ? 'success' : 'danger'}>
        {duesExempt
          ? 'Scutit (board)'
          : value.overdueCount === 0
            ? 'Fără restanțe'
            : `${value.overdueCount} restante`}
      </StatusPill>
    )),
    duesCovered: slot('duesCovered', dues, (value) => value.coveredCount),
    duesWaived: slot('duesWaived', dues, (value) => value.waivedCount),
    duesOverdue: slot('duesOverdue', dues, (value) => value.overdueCount),
    duesTimeline: slot('duesTimeline', dues, (value) => (
      <DuesTimeline dues={value.dues} exempt={duesExempt} />
    )),
    meetingRelative: slot(
      'meetingRelative',
      meeting,
      (value) => value?.relativeLabel ?? 'Fără întâlniri',
    ),
    meetingStatus: slot('meetingStatus', meeting, (value) =>
      value ? <MeetingStatus value={value} /> : null,
    ),
    meetingDate: slot('meetingDate', meeting, (value) => value?.dateLabel ?? '—'),
    meetingTiming: slot('meetingTiming', meeting, (value) => value?.timingLabel ?? '—'),
    meetingDescription: slot('meetingDescription', meeting, (value) => (
      <MeetingDescription
        message={
          !value
            ? 'Nu există întâlniri programate.'
            : value.status === 'ongoing'
              ? 'Ședința este în desfășurare. Prezintă codul QR pentru a-ți înregistra prezența.'
              : value.status === 'ended'
                ? 'Ședința s-a încheiat, iar fereastra de check-in este încă deschisă temporar.'
                : 'Următorul reper din calendarul clubului.'
        }
        description={value?.description}
      />
    )),
    meetingLink: slot('meetingLink', meeting, (value) =>
      value ? (
        <Link className={meetingLinkClassName} href={`/members/meetings/${value.id}`}>
          Vezi întâlnirea
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <PendingMeetingLink />
      ),
    ),
    inboxCount: slot('inboxCount', inbox, (value) =>
      value.kind === 'ready'
        ? `${value.count} mesaje`
        : value.kind === 'unavailable'
          ? 'Indisponibil'
          : 'Neconfigurat',
    ),
    inboxBadge: slot('inboxBadge', inbox, (value) =>
      value.kind === 'unavailable'
        ? 'Indisponibil'
        : value.messages.length
          ? `${value.messages.length} recente`
          : 'Fără mesaje',
    ),
    inboxRows: slot('inboxRows', inbox, (value) => (
      <InboxRows
        messages={value.messages}
        error={value.kind === 'unavailable' ? 'Nu am putut încărca mesajele recente.' : undefined}
      />
    )),
  }
  return <DashboardShell {...shell} slots={slots} />
}

function AttendanceTimeline({
  attendance,
}: {
  attendance: Awaited<DashboardData['attendance']>['records']
}) {
  return (
    <TimelineDots
      emptyLabel="Nu există ședințe trecute încă."
      modalTitle="Istoric prezență"
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
    />
  )
}
function DuesTimeline({
  dues,
  exempt,
}: {
  dues: Awaited<DashboardData['dues']>['dues']
  exempt: boolean
}) {
  return (
    <TimelineDots
      emptyLabel={exempt ? 'Scutit de cotizații.' : 'Nu există luni calculate.'}
      modalTitle="Istoric cotizații"
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
    />
  )
}

function MeetingStatus({ value }: { value: DashboardMeeting }) {
  const status = getEffectiveMeetingAttendanceStatus(value.attendanceStatus, value.motivationStatus)
  const attendance =
    status === 'present'
      ? 'Prezent/ǎ'
      : status === 'late'
        ? 'Întârziat/ǎ'
        : status === 'absent'
          ? 'Absent/ǎ'
          : status === 'motivated' && value.motivationStatus === 'accepted'
            ? 'Motivare acceptată'
            : status === 'motivated' && value.motivationStatus === 'rejected'
              ? 'Motivare respinsă'
              : null
  return (
    <>
      <span
        className={cn(
          'inline-flex h-6 w-full max-w-full shrink-0 items-center justify-center rounded-full border px-2.5 text-xs font-semibold',
          value.status === 'upcoming'
            ? 'border-sky-500/25 bg-sky-500/10 text-sky-700'
            : value.status === 'ongoing'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
              : 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        )}
      >
        <span className="truncate">
          {value.status === 'upcoming'
            ? 'Programată'
            : value.status === 'ongoing'
              ? 'În desfășurare'
              : 'Încheiată'}
        </span>
      </span>
      {attendance && (
        <span className="inline-flex h-6 w-full max-w-full shrink-0 items-center justify-center rounded-full border border-border px-2.5 text-xs font-semibold">
          <span className="truncate" title={attendance}>
            {attendance}
          </span>
        </span>
      )}
    </>
  )
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
