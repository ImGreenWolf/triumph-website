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

export type MeetingMemberAttendance = {
  memberId: string
  status: Attendance['status']
}

export function getRelationId(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id
}

export function isMemberEligibleForMeeting(
  member: Pick<User, 'joinedAt'>,
  meeting: Pick<Meeting, 'meetingDate'>,
) {
  return new Date(member.joinedAt).getTime() <= new Date(meeting.meetingDate).getTime()
}

export function getEffectiveMeetingAttendanceStatus(
  attendanceStatus: Attendance['status'] | null | undefined,
  motivationStatus: AbsenceMotivation['status'] | null | undefined,
) {
  if (
    motivationStatus === 'accepted' &&
    attendanceStatus !== 'present' &&
    attendanceStatus !== 'late'
  ) {
    return 'motivated' as const
  }

  return attendanceStatus ?? null
}

export function calculateMeetingMemberAttendance(args: {
  attendance: MeetingAttendanceRecord[]
  meeting: MeetingWithTiming
  motivations: MeetingMotivationRecord[]
  now?: Date
  members: MeetingMember[]
}): MeetingMemberAttendance[] {
  const { attendance, meeting, motivations, members, now = new Date() } = args

  if (!canCalculateMeetingAbsences(meeting, now)) return []

  const attendanceByMember = new Map(
    attendance.map((record) => [getRelationId(record.member), record.status]),
  )
  const motivationByMember = new Map(
    motivations.map((motivation) => [getRelationId(motivation.member), motivation.status]),
  )

  return members
    .filter((member) => isMemberEligibleForMeeting(member, meeting))
    .map((member) => ({
      memberId: member.id,
      status:
        getEffectiveMeetingAttendanceStatus(
          attendanceByMember.get(member.id),
          motivationByMember.get(member.id),
        ) ?? 'absent',
    }))
}

export function calculateMeetingAbsenteeIds(args: {
  attendance: MeetingAttendanceRecord[]
  meeting: MeetingWithTiming
  motivations: MeetingMotivationRecord[]
  now?: Date
  members: MeetingMember[]
}) {
  return calculateMeetingMemberAttendance(args)
    .filter((record) => record.status === 'absent')
    .map((record) => record.memberId)
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
