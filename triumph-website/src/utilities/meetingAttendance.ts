import type { Payload } from 'payload'

import type { AbsenceMotivation, Attendance, Meeting, User } from '@/payload-types'
import { allRoles } from '@/utilities/membersAccess'
import { canCalculateMeetingAbsences } from '@/utilities/meetingTime'

export const meetingAttendanceMemberRoles = [...allRoles]

type MeetingAttendanceRecord = Pick<Attendance, 'member' | 'status'>
type MeetingMotivationRecord = Pick<AbsenceMotivation, 'member' | 'status'>
type MeetingWithTiming = Pick<
  Meeting,
  'id' | 'meetingDate' | 'durationMinutes' | 'endedBufferMinutes'
>
type MeetingMember = Pick<User, 'id' | 'joinedAt'>

export function getRelationId(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id
}

export function isMemberEligibleForMeeting(
  member: Pick<User, 'joinedAt'>,
  meeting: Pick<Meeting, 'meetingDate'>,
) {
  return new Date(member.joinedAt).getTime() <= new Date(meeting.meetingDate).getTime()
}

export function calculateMeetingAbsenteeIds(args: {
  attendance: MeetingAttendanceRecord[]
  meeting: MeetingWithTiming
  motivations: MeetingMotivationRecord[]
  now?: Date
  members: MeetingMember[]
}) {
  const { attendance, meeting, motivations, members, now = new Date() } = args

  if (!canCalculateMeetingAbsences(meeting, now)) return []

  const excludedMemberIds = new Set<string>()

  attendance.forEach((record) => {
    if (record.status !== 'absent') {
      excludedMemberIds.add(getRelationId(record.member))
    }
  })

  motivations.forEach((motivation) => {
    if (motivation.status === 'accepted') {
      excludedMemberIds.add(getRelationId(motivation.member))
    }
  })

  return members
    .filter((member) => isMemberEligibleForMeeting(member, meeting))
    .map((member) => member.id)
    .filter((memberId) => !excludedMemberIds.has(memberId))
}

export async function getMeetingAbsenteeIds(
  payload: Payload,
  meeting: MeetingWithTiming,
  now = new Date(),
) {
  if (!canCalculateMeetingAbsences(meeting, now)) return []

  const [membersDocs, attendanceDocs, motivationsDocs] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        role: {
          in: meetingAttendanceMemberRoles,
        },
      },
    }),
    payload.find({
      collection: 'attendance',
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        meeting: {
          equals: meeting.id,
        },
      },
    }),
    payload.find({
      collection: 'absence-motivations',
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        meeting: {
          equals: meeting.id,
        },
      },
    }),
  ])

  return calculateMeetingAbsenteeIds({
    attendance: attendanceDocs.docs as Attendance[],
    meeting,
    motivations: motivationsDocs.docs as AbsenceMotivation[],
    members: membersDocs.docs as User[],
    now,
  })
}
