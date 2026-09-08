import type { Payload } from 'payload'

import type { AbsenceMotivation, Attendance, Meeting, User } from '@/payload-types'
import { getEffectiveMeetingAttendanceStatus } from '@/utilities/meetingAttendance'
import { canCalculateMeetingAbsences, getMeetingAttendanceStatus } from '@/utilities/meetingTime'
import { getRotaryYearQueryBounds, getRotaryYearStart } from '@/utilities/rotaryYear'

export async function getMemberAttendanceSummary(
  payload: Payload,
  member: User,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const bounds = getRotaryYearQueryBounds(rotaryYearStart, now)
  const memberJoinedAt = new Date(member.joinedAt)
  const start = memberJoinedAt > bounds.start ? memberJoinedAt : bounds.start

  const [meetingsDocs, attendanceDocs, motivationDocs] = await Promise.all([
    payload.find({
      collection: 'meetings',
      where: {
        meetingDate: {
          greater_than_equal: start.toISOString(),
          [bounds.endOperator]: bounds.end.toISOString(),
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
    payload.find({
      collection: 'absence-motivations',
      where: {
        and: [{ member: { equals: member.id } }, { status: { equals: 'accepted' } }],
      },
      depth: 0,
      limit: 1000,
      pagination: false,
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
  const motivationByMeeting = new Map(
    (motivationDocs.docs as AbsenceMotivation[]).map((motivation) => [
      typeof motivation.meeting === 'object' ? motivation.meeting.id : motivation.meeting,
      motivation.status,
    ]),
  )
  const records = meetings
    .filter((meeting) => {
      const existingRecord = attendanceByMeeting.get(meeting.id)
      const effectiveStatus = getEffectiveMeetingAttendanceStatus(
        existingRecord?.status,
        motivationByMeeting.get(meeting.id),
      )
      const status = getMeetingAttendanceStatus(meeting, effectiveStatus, now)

      return canCalculateMeetingAbsences(meeting, now) || status === 'motivated'
    })
    .map((meeting) => {
      const existingRecord = attendanceByMeeting.get(meeting.id)
      const effectiveStatus = getEffectiveMeetingAttendanceStatus(
        existingRecord?.status,
        motivationByMeeting.get(meeting.id),
      )

      return {
        meeting,
        status: getMeetingAttendanceStatus(meeting, effectiveStatus, now) || ('absent' as const),
      }
    })

  const historicalRecords = records.filter((record) =>
    canCalculateMeetingAbsences(record.meeting, now),
  )
  const totalMeetings = historicalRecords.length
  const presentMeetings = records.filter((record) => record.status === 'present').length
  const lateMeetings = records.filter((record) => record.status === 'late').length
  const motivatedMeetings = records.filter((record) => record.status === 'motivated').length
  const absentMeetings = records.filter((record) => record.status === 'absent').length
  const effectiveMeetings = historicalRecords.filter(
    (record) => record.status !== 'motivated',
  ).length
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
