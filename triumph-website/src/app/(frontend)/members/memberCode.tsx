'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, QrCode, ScanQrCode, XIcon } from 'lucide-react'

import type { AbsenceMotivation, Attendance, Meeting, User } from '@/payload-types'
import { cn } from '@/utilities/ui'
import { boardRoles } from '@/utilities/membersAccess'

type MemberCodeUser = Pick<User, 'email' | 'id' | 'name' | 'role'>

type NextMeetingSummary = {
  description?: Meeting['description']
  id: Meeting['id']
  meetingDateLabel: string
  relativeLabel: string
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
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <PanelHeader
        description="Următorul reper din calendarul clubului."
        icon={<CalendarDays className="size-5" />}
        title="Următoarea întâlnire"
      />

      <div className="mt-6 rounded-lg border border-[#00a2e0]/25 bg-[#00a2e0]/10 p-5">
        <div className='flex items-center gap-2 mb-4'>
          <div className=" inline-flex items-center gap-2 rounded-full border border-[#00a2e0]/25 bg-sidebar/60 px-3 py-1 text-sm font-medium">
            <Clock3 className="size-4 text-[#00a2e0]" />
            {nextMeeting.relativeLabel}
            
          </div>
          {(attendance || absenceMotivationStatus) && (<AttendanceStatusBox status={attendance?.status} motivationStatus={absenceMotivationStatus}/>)}
        </div>
       
        

        <h3 className="text-2xl font-semibold leading-tight">{nextMeeting.meetingDateLabel}</h3>

        {nextMeeting.description && (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{nextMeeting.description}</p>
        )}
        
      </div>

      <div className="mt-auto flex flex-col flex-wrap gap-2 pt-5 sm:flex-row sm:items-center">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          href={`/members/meetings/${nextMeeting.id}`}
        >
          Vezi întâlnirea
          <ArrowRight className="size-4" />
        </Link>
        <div className='flex justify-between grow justify-stretch'>
            <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-sidebar/60 px-4 text-xs font-semibold text-white transition hover:bg-sidebar hover:text-foreground"
            onClick={() => setIsCodeOpen(true)}
            type="button"
            >
                <QrCode className="size-4" />
            Cod QR
            
            </button>
            {boardRoles.includes(member.role as any) && (
                <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-sidebar/60 px-3 text-xs font-semibold text-white transition hover:bg-sidebar hover:text-foreground"
                href="/members/check-in"
                >
                <ScanQrCode className="size-4" />
                Check-In
                </Link>
            )}
        </div>
        

        {/* {absenceMotivationStatus && <MotivationStatusBox status={absenceMotivationStatus} />} */}
      </div>

      {isCodeOpen && <MemberCode member={member} onClose={() => setIsCodeOpen(false)} />}
    </section>
  )
}

function MemberCode(props: { member: MemberCodeUser; onClose: () => void }) {
  const { member, onClose } = props
  const memberCodeUrl = getMemberCodeUrl(member.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/25 p-4 backdrop-blur-lg">
      <div className="relative w-full max-w-sm">
        <button
          aria-label="Închide codul QR"
          className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-md bg-black/70 text-white transition hover:bg-black"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-5" />
        </button>

        <div className="flex flex-col rounded-xl bg-card px-8 py-10 text-card-foreground shadow-2xl">
          <h2 className="text-xl font-semibold">Codul tău Triumph</h2>
          <p className="py-3 text-sm leading-6 text-muted-foreground">
            Scanează acest cod QR pentru a-ți înregistra prezența la ședințe.
          </p>

          <div className="my-2 rounded-lg bg-white p-6">
            <QRCode className="h-auto w-full" value={memberCodeUrl} />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{member.name || member.email}</p>
        </div>
      </div>
    </div>
  )
}

function PanelHeader(props: { title: string; description?: string; icon: ReactNode }) {
  const { title, description, icon } = props

  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#00a2e0]/15 text-[#00a2e0]">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
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

function AttendanceStatusBox(props: { status: Attendance['status'] | undefined, motivationStatus: AbsenceMotivation['status'] | undefined | null}) {
  const label = attendanceLabel(props.status, props.motivationStatus)
  return (
    label &&
    <div
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-full border px-3 py-1 text-sm font-semibold',
        props.status === 'present' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        props.status === 'absent' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        props.status === 'motivated' && 'border-red-500/25 bg-red-500/10 text-red-500',
        props.motivationStatus === 'accepted' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
        props.motivationStatus === 'pending' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10 text-[#c97700]',
        props.motivationStatus === 'rejected' && 'border-red-500/25 bg-red-500/10 text-red-500',
      )}
    >
      {label}
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

function attendanceLabel(status: Attendance['status'] | undefined, motivationStatus: AbsenceMotivation['status'] | undefined | null) {
  if (status === 'present') return 'Prezent/ǎ'
  if (status === 'absent') return 'Absent/ǎ'
  if (status === 'motivated' && motivationStatus) {
    if (motivationStatus === 'accepted') return 'Motivare acceptată'
    if (motivationStatus === 'rejected') return 'Motivare respinsă'
  }
  return undefined
}

