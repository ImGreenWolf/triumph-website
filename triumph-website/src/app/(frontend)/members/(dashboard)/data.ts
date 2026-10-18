import 'server-only'

import type { User } from '@/payload-types'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'
import { getMemberDuesSummary } from '@/utilities/memberDues'
import { getMemberYearMeetings } from '@/utilities/memberMeetings'
import { getMemberInbox } from '@/utilities/memberInbox'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getMeetingWindow, shouldShowMeetingOnMemberDashboard } from '@/utilities/meetingTime'
import { getRotaryYearStart } from '@/utilities/rotaryYear'
import type { getDashboardBootstrap } from './bootstrap'

export type DashboardBootstrap = Awaited<ReturnType<typeof getDashboardBootstrap>>
export type DashboardData = ReturnType<typeof loadDashboardData>
export type DashboardMeeting = NonNullable<Awaited<DashboardData['meeting']>>
export type DashboardInbox = Awaited<DashboardData['inbox']>

async function loadAvatar({ user, reads }: DashboardBootstrap) {
  try {
    if (!user.profilePicture) return null
    const member =
      typeof user.profilePicture === 'object'
        ? user
        : await reads.findByID({
            collection: 'users',
            id: user.id,
            depth: 1,
            select: { profilePicture: true },
            overrideAccess: false,
          })
    const picture = member.profilePicture
    return picture && typeof picture === 'object'
      ? getMediaUrl(picture.url, picture.updatedAt)
      : null
  } catch {
    return null
  }
}

async function loadMeeting({ user, reads, shell: { now } }: DashboardBootstrap) {
  const { docs } = await getMemberYearMeetings(reads, getRotaryYearStart(now))
  const meeting = docs.find((candidate) => shouldShowMeetingOnMemberDashboard(candidate, now))
  if (!meeting) return null
  const where = { member: { equals: user.id }, meeting: { equals: meeting.id } }
  const [motivations, attendance] = await Promise.all([
    reads.find({
      collection: 'absence-motivations',
      where,
      depth: 0,
      limit: 1,
      select: { status: true },
      overrideAccess: true,
    }),
    reads.find({
      collection: 'attendance',
      where,
      depth: 0,
      limit: 1,
      select: { status: true },
      overrideAccess: false,
    }),
  ])
  const date = new Date(meeting.meetingDate)
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const meetingDay = new Date(date)
  meetingDay.setHours(0, 0, 0, 0)
  const days = Math.round((meetingDay.getTime() - startOfDay.getTime()) / 86_400_000)
  const window = getMeetingWindow(meeting, now)
  return {
    id: meeting.id,
    description: meeting.description,
    status: window.status,
    attendanceStatus: attendance.docs.at(0)?.status,
    motivationStatus: motivations.docs.at(0)?.status,
    dateLabel: date.toLocaleString('ro-RO', { dateStyle: 'full', timeStyle: 'short' }),
    relativeLabel:
      window.status === 'upcoming'
        ? days === 0
          ? 'Astăzi'
          : days === 1
            ? 'Mâine'
            : `În ${days} zile`
        : window.status === 'ongoing'
          ? 'În desfășurare'
          : 'Încheiată',
    timingLabel:
      window.status === 'upcoming'
        ? `Durată: ${window.durationMinutes} min`
        : window.status === 'ongoing'
          ? `Se încheie la ${window.endAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`
          : `Check-in disponibil până la ${window.bufferEndAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`,
  }
}

async function loadInbox(user: User) {
  if (!user.clubMail || !user.clubMailPassword)
    return { kind: 'unconfigured' as const, count: 0, messages: [] }
  try {
    const inbox = await getMemberInbox(user)
    return { kind: 'ready' as const, ...inbox }
  } catch {
    return { kind: 'unavailable' as const, count: 0, messages: [] }
  }
}

/** Start each read once; all of a card's slots share its promise. */
export function loadDashboardData(bootstrap: DashboardBootstrap) {
  const {
    user,
    reads,
    shell: { now },
  } = bootstrap
  return {
    avatar: loadAvatar(bootstrap),
    attendance: getMemberAttendanceSummary(reads, user, now),
    dues: getMemberDuesSummary(reads, user, now),
    meeting: loadMeeting(bootstrap),
    inbox: loadInbox(user),
  }
}
