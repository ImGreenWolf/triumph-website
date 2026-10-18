import type { Payload } from 'payload'
import { getRotaryYearRange, getRotaryYearStart } from './rotaryYear'
import { getMeetingWindow } from './meetingTime'

// A stable, time-independent read shared by attendance, dues and next meeting.
// Consumers apply the current time after reading the cached records.
export async function getMemberYearMeetings(payload: Pick<Payload, 'find'>, year: number) {
  return payload.find({
    collection: 'meetings',
    depth: 0,
    select: {
      createdAt: true,
      updatedAt: true,
      meetingDate: true,
      durationMinutes: true,
      endedBufferMinutes: true,
      description: true,
      onlineMeeting: true,
    },
    where: { meetingDate: { greater_than_equal: getRotaryYearRange(year).start.toISOString() } },
    sort: 'meetingDate',
    limit: 1000,
    pagination: false,
  })
}

export async function getTodayMemberMeeting(payload: Pick<Payload, 'find'>, now = new Date()) {
  const dayEnd = new Date(now)
  dayEnd.setHours(24, 0, 0, 0)
  const { docs } = await getMemberYearMeetings(payload, getRotaryYearStart(now))
  return docs.find(
    (meeting) =>
      new Date(meeting.meetingDate) < dayEnd && getMeetingWindow(meeting, now).status !== 'expired',
  )
}
