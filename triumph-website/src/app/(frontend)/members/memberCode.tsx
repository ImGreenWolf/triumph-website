'use client'

import Link from 'next/link'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { ArrowRight, CalendarDays, Clock3, QrCode, ScanQrCode, XIcon } from 'lucide-react'

import type { AbsenceMotivation, Attendance, Meeting, User } from '@/payload-types'
import { getEffectiveMeetingAttendanceStatus } from '@/utilities/meetingAttendance'
import type { MeetingWindowStatus } from '@/utilities/meetingTime'
import { cn } from '@/utilities/ui'
import { boardRoles } from '@/utilities/membersAccess'

type MemberCodeUser = Pick<User, 'email' | 'id' | 'name' | 'role'>

type NextMeetingSummary = {
  description?: Meeting['description']
  id: Meeting['id']
  meetingDateLabel: string
  relativeLabel: string
  status: MeetingWindowStatus
  timingLabel: string
}

type NextMeetingWithCodeProps = {
  absenceMotivationStatus?: AbsenceMotivation['status'] | null
  member: MemberCodeUser
  nextMeeting: NextMeetingSummary
  attendance: Attendance | undefined
}

export default function NextMeetingWithCode(props: NextMeetingWithCodeProps) {
  const { absenceMotivationStatus, member, nextMeeting, attendance } = props
  const [isCodeOpen, setIsCodeOpen] = useState(false)

  return (
    <section className="flex h-full min-h-[330px] flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">
              {nextMeeting.status === 'upcoming' ? 'Următoarea întâlnire' : 'Întâlnire'}
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-tight sm:text-2xl">
              {nextMeeting.relativeLabel}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MeetingStatusBox status={nextMeeting.status} />
          {(attendance || absenceMotivationStatus) && (
            <AttendanceStatusBox
              status={attendance?.status}
              motivationStatus={absenceMotivationStatus}
            />
          )}
        </div>
      </header>

      <div className="border-y border-border bg-muted/25 px-5 py-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)] sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Program</p>
            <p className="mt-1 text-base font-semibold leading-6">{nextMeeting.meetingDateLabel}</p>
          </div>
          <div className="border-border sm:border-l sm:pl-6">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Detalii</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock3 className="size-4 shrink-0 text-accent" />
              <span>{nextMeeting.timingLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4 sm:px-6">
        <p className="text-sm leading-6 text-muted-foreground">
          {getMeetingDescription(nextMeeting.status)}
        </p>
        {nextMeeting.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/80">
            {nextMeeting.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-4 sm:px-6">
        <Link
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          href={`/members/meetings/${nextMeeting.id}`}
        >
          Vezi întâlnirea
          <ArrowRight className="size-4" />
        </Link>
        <button
          aria-label="Arată codul QR"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          onClick={() => setIsCodeOpen(true)}
          title="Arată codul QR"
          type="button"
        >
          <QrCode className="size-4" />
        </button>
        {boardRoles.includes(member.role as (typeof boardRoles)[number]) && (
          <Link
            aria-label="Deschide scannerul de prezență"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            href="/members/check-in"
            title="Scanner de prezență"
          >
            <ScanQrCode className="size-4" />
          </Link>
        )}
      </div>

      {isCodeOpen && <MemberCode member={member} onClose={() => setIsCodeOpen(false)} />}
    </section>
  )
}

function MemberCode(props: { member: MemberCodeUser; onClose: () => void }) {
  const { member, onClose } = props
  const memberCodeUrl = getMemberCodeUrl(member.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div
        aria-labelledby="member-qr-title"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8"
        role="dialog"
      >
        <button
          aria-label="Închide codul QR"
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-5" />
        </button>

        <div className="pr-10">
          <p className="text-sm font-semibold text-muted-foreground">Prezență la întâlnire</p>
          <h2 id="member-qr-title" className="mt-1 text-2xl font-semibold">
            Codul tău QR
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Prezintă acest cod operatorului pentru a-ți înregistra prezența.
        </p>

        <div className="my-6 rounded-md border border-border bg-white p-5">
          <QRCode className="h-auto w-full" value={memberCodeUrl} />
        </div>

        <p className="border-t border-border pt-4 text-sm font-medium text-muted-foreground">
          {member.name || member.email}
        </p>
      </div>
    </div>
  )
}

// function MotivationStatusBox(props: { status: AbsenceMotivation['status'] }) {
//   return (
//     <div
//       className={cn(
//         'inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold',
//         props.status === 'accepted' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
//         props.status === 'pending' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
//         props.status === 'rejected' && 'border-red-500/25 bg-red-500/10 text-red-500',
//       )}
//     >
//       {motivationLabel(props.status)}
//     </div>
//   )
// }

function AttendanceStatusBox(props: {
  status: Attendance['status'] | undefined
  motivationStatus: AbsenceMotivation['status'] | undefined | null
}) {
  const status = getEffectiveMeetingAttendanceStatus(props.status, props.motivationStatus)
  const label = attendanceLabel(status, props.motivationStatus)
  return (
    label && (
      <div
        className={cn(
          'inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-xs font-semibold',
          status === 'present' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
          status === 'late' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
          status === 'absent' && 'border-red-500/25 bg-red-500/10 text-red-500',
          status === 'motivated' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
          props.motivationStatus === 'accepted' &&
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
          props.motivationStatus === 'pending' &&
            'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
          props.motivationStatus === 'rejected' && 'border-red-500/25 bg-red-500/10 text-red-500',
        )}
      >
        {label}
      </div>
    )
  )
}

function MeetingStatusBox(props: { status: MeetingWindowStatus }) {
  const { status } = props

  return (
    <div
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-xs font-semibold',
        status === 'upcoming' && 'border-sky-500/25 bg-sky-500/10 text-sky-700',
        status === 'ongoing' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        status === 'ended' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
      )}
    >
      {status === 'upcoming' ? 'Programată' : status === 'ongoing' ? 'În desfășurare' : 'Încheiată'}
    </div>
  )
}

function getMemberCodeUrl(memberId: User['id']) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || ''

  return `${serverUrl}/members/checkin?member=${encodeURIComponent(String(memberId))}`
}

// function motivationLabel(status: AbsenceMotivation['status']) {
//   if (status === 'accepted') return 'Motivare acceptată'
//   if (status === 'rejected') return 'Motivare respinsă'

//   return 'Motivare în verificare'
// }

function attendanceLabel(
  status: Attendance['status'] | null | undefined,
  motivationStatus: AbsenceMotivation['status'] | undefined | null,
) {
  if (status === 'present') return 'Prezent/ǎ'
  if (status === 'late') return 'Întârziat/ǎ'
  if (status === 'absent') return 'Absent/ǎ'
  if (status === 'motivated' && motivationStatus) {
    if (motivationStatus === 'accepted') return 'Motivare acceptată'
    if (motivationStatus === 'rejected') return 'Motivare respinsă'
  }
  return undefined
}

function getMeetingDescription(status: MeetingWindowStatus) {
  if (status === 'ongoing') {
    return 'Ședința este în desfășurare. Scanarea codului QR va înregistra întârzierea.'
  }

  if (status === 'ended') {
    return 'Ședința s-a încheiat, iar fereastra de check-in este încă deschisă temporar.'
  }

  return 'Următorul reper din calendarul clubului.'
}
