import type { Payload } from 'payload'

import type { Attendance, Meeting, User } from '@/payload-types'
import { boardRoles } from '@/utilities/membersAccess'

import { formatShortDate, getRelationId, percentage } from './widgetUtils'

const presenceMemberRoles = ['active', 'aspirer', ...boardRoles]

type PresenceStatus = Attendance['status']

export type PresenceStatusCounts = Record<PresenceStatus, number>

export type MeetingPresencePoint = PresenceStatusCounts & {
  date: string
  id: string
  label: string
  rate: number
  total: number
}

export type PresenceOverview = PresenceStatusCounts & {
  attendanceRate: number
  expectedRecords: number
  memberCount: number
  meetingCount: number
}

function emptyCounts(): PresenceStatusCounts {
  return {
    absent: 0,
    late: 0,
    motivated: 0,
    present: 0,
  }
}

function getMeetingTime(meeting: Pick<Meeting, 'meetingDate'>) {
  return new Date(meeting.meetingDate).getTime()
}

function isMemberEligibleForMeeting(
  member: Pick<User, 'joinedAt'>,
  meeting: Pick<Meeting, 'meetingDate'>,
) {
  return new Date(member.joinedAt).getTime() <= getMeetingTime(meeting)
}

async function getPresenceSource(payload: Payload, now = new Date()) {
  const [membersDocs, meetingsDocs, attendanceDocs] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: 'joinedAt',
      where: {
        role: {
          in: presenceMemberRoles,
        },
      },
    }),
    payload.find({
      collection: 'meetings',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: 'meetingDate',
      where: {
        meetingDate: {
          less_than_equal: now.toISOString(),
        },
      },
    }),
    payload.find({
      collection: 'attendance',
      depth: 0,
      limit: 10000,
      pagination: false,
    }),
  ])

  return {
    attendance: attendanceDocs.docs as Attendance[],
    meetings: meetingsDocs.docs as Meeting[],
    members: membersDocs.docs as User[],
  }
}

function calculateMeetingPoint(args: {
  attendance: Attendance[]
  meeting: Meeting
  members: User[]
}): MeetingPresencePoint {
  const { attendance, meeting, members } = args
  const eligibleMembers = members.filter((member) => isMemberEligibleForMeeting(member, meeting))
  const eligibleMemberIds = new Set(eligibleMembers.map((member) => getRelationId(member.id)))
  const counts = emptyCounts()
  const seenMembers = new Set<string>()

  attendance.forEach((record) => {
    const memberId = getRelationId(record.member)

    if (!eligibleMemberIds.has(memberId) || seenMembers.has(memberId)) return

    counts[record.status] += 1
    seenMembers.add(memberId)
  })

  counts.absent += Math.max(0, eligibleMembers.length - seenMembers.size)

  const effectiveTotal = Math.max(0, eligibleMembers.length - counts.motivated)
  const rate = percentage(counts.present + counts.late, effectiveTotal)

  return {
    ...counts,
    date: meeting.meetingDate,
    id: meeting.id,
    label: formatShortDate(meeting.meetingDate),
    rate,
    total: eligibleMembers.length,
  }
}

export async function getPresenceOverview(
  payload: Payload,
  now = new Date(),
): Promise<PresenceOverview> {
  const { attendance, meetings, members } = await getPresenceSource(payload, now)
  const memberById = new Map(members.map((member) => [getRelationId(member.id), member]))
  const meetingById = new Map(meetings.map((meeting) => [getRelationId(meeting.id), meeting]))
  const counts = emptyCounts()
  const seen = new Set<string>()
  const expectedRecords = meetings.reduce(
    (total, meeting) =>
      total + members.filter((member) => isMemberEligibleForMeeting(member, meeting)).length,
    0,
  )

  attendance.forEach((record) => {
    const memberId = getRelationId(record.member)
    const meetingId = getRelationId(record.meeting)
    const member = memberById.get(memberId)
    const meeting = meetingById.get(meetingId)

    if (!member || !meeting || !isMemberEligibleForMeeting(member, meeting)) return

    const attendanceKey = `${meetingId}:${memberId}`
    if (seen.has(attendanceKey)) return

    counts[record.status] += 1
    seen.add(attendanceKey)
  })

  counts.absent += Math.max(0, expectedRecords - seen.size)

  const effectiveRecords = Math.max(0, expectedRecords - counts.motivated)

  return {
    ...counts,
    attendanceRate: percentage(counts.present + counts.late, effectiveRecords),
    expectedRecords,
    meetingCount: meetings.length,
    memberCount: members.length,
  }
}

export async function getPresenceGraphData(payload: Payload, now = new Date(), limit = 8) {
  const { attendance, meetings, members } = await getPresenceSource(payload, now)
  const latestMeetings = meetings.slice(-limit)
  const attendanceByMeeting = new Map<string, Attendance[]>()

  attendance.forEach((record) => {
    const meetingId = getRelationId(record.meeting)
    const meetingAttendance = attendanceByMeeting.get(meetingId) ?? []

    meetingAttendance.push(record)
    attendanceByMeeting.set(meetingId, meetingAttendance)
  })

  return latestMeetings.map((meeting) =>
    calculateMeetingPoint({
      attendance: attendanceByMeeting.get(getRelationId(meeting.id)) ?? [],
      meeting,
      members,
    }),
  )
}
