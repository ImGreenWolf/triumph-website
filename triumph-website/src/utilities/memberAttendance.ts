import type { Payload } from 'payload'

import type { Attendance, Meeting, User } from '@/payload-types'

export async function getMemberAttendanceSummary(
  payload: Payload,
  member: User,
  now = new Date(),
) {
  const [meetingsDocs, attendanceDocs] = await Promise.all([
    payload.find({
      collection: 'meetings',
      where: {
        meetingDate: {
          greater_than_equal: new Date(member.joinedAt).toISOString(),
        },
      },
      limit: 1000,
      pagination: false,
      sort: 'meetingDate',
    }),
    payload.find({
      collection: 'attendance',
      where: {
        member: {
          equals: member.id,
        },
      },
      depth: 1,
      limit: 1000,
      pagination: false,
      sort: 'createdAt',
    }),
  ])

  const meetings = meetingsDocs.docs as Meeting[]
  const attendanceRecords = attendanceDocs.docs as Attendance[]
  const attendanceByMeeting = new Map(
    attendanceRecords.map((record) => [
      typeof record.meeting === 'object' ? record.meeting.id : record.meeting,
      record,
    ]),
  )
  const records = meetings
    .filter((meeting) => {
      const existingRecord = attendanceByMeeting.get(meeting.id)

      return new Date(meeting.meetingDate) <= now || existingRecord?.status === 'motivated'
    })
    .map((meeting) => {
      const existingRecord = attendanceByMeeting.get(meeting.id)

      return {
        meeting,
        status: existingRecord?.status || ('absent' as const),
      }
    })

  const historicalRecords = records.filter((record) => new Date(record.meeting.meetingDate) <= now)
  const totalMeetings = historicalRecords.length
  const presentMeetings = records.filter((record) => record.status === 'present').length
  const lateMeetings = records.filter((record) => record.status === 'late').length
  const motivatedMeetings = records.filter((record) => record.status === 'motivated').length
  const absentMeetings = records.filter((record) => record.status === 'absent').length
  const effectiveMeetings = historicalRecords.filter((record) => record.status !== 'motivated').length
  const attendancePercentage =
    effectiveMeetings <= 0
      ? 100
      : Math.round(((presentMeetings + lateMeetings) / effectiveMeetings) * 100)
  const absencePercentage =
    totalMeetings <= 0 ? 0 : Math.round((absentMeetings / totalMeetings) * 100)

  return {
    absencePercentage,
    absentMeetings,
    attendancePercentage,
    lateMeetings,
    motivatedMeetings,
    presentMeetings,
    records,
    totalMeetings,
  }
}
