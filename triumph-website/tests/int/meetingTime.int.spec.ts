import { describe, expect, it } from 'vitest'

import type { Meeting } from '@/payload-types'
import {
  canCalculateMeetingAbsences,
  getMeetingAttendanceStatus,
  getMeetingCheckInAttendanceStatus,
  getMeetingWindow,
} from '@/utilities/meetingTime'

const meeting = {
  durationMinutes: 90,
  endedBufferMinutes: 15,
  id: 'meeting-1',
  meetingDate: '2026-03-01T10:00:00.000Z',
} as Meeting

describe('meeting time windows', () => {
  it('uses the configured duration and ended buffer to calculate meeting status', () => {
    expect(getMeetingWindow(meeting, new Date('2026-03-01T09:59:00.000Z')).status).toBe('upcoming')
    expect(getMeetingWindow(meeting, new Date('2026-03-01T10:00:00.000Z')).status).toBe('ongoing')
    expect(getMeetingWindow(meeting, new Date('2026-03-01T11:30:00.000Z')).status).toBe('ended')
    expect(getMeetingWindow(meeting, new Date('2026-03-01T11:45:00.000Z')).status).toBe('expired')
  })

  it('marks check-ins after the scheduled start as late until the buffer closes', () => {
    expect(getMeetingCheckInAttendanceStatus(meeting, new Date('2026-03-01T10:00:00.000Z'))).toBe(
      'present',
    )
    expect(getMeetingCheckInAttendanceStatus(meeting, new Date('2026-03-01T10:01:00.000Z'))).toBe(
      'late',
    )
    expect(getMeetingCheckInAttendanceStatus(meeting, new Date('2026-03-01T11:44:00.000Z'))).toBe(
      'late',
    )
    expect(
      getMeetingCheckInAttendanceStatus(meeting, new Date('2026-03-01T11:45:00.000Z')),
    ).toBeNull()
  })

  it('only infers an absence after the configured duration has ended', () => {
    expect(canCalculateMeetingAbsences(meeting, new Date('2026-03-01T11:29:00.000Z'))).toBe(false)
    expect(canCalculateMeetingAbsences(meeting, new Date('2026-03-01T11:30:00.000Z'))).toBe(true)
    expect(
      getMeetingAttendanceStatus(meeting, undefined, new Date('2026-03-01T11:29:00.000Z')),
    ).toBeNull()
    expect(
      getMeetingAttendanceStatus(meeting, undefined, new Date('2026-03-01T11:30:00.000Z')),
    ).toBe('absent')
    expect(
      getMeetingAttendanceStatus(meeting, 'absent', new Date('2026-03-01T11:29:00.000Z')),
    ).toBeNull()
  })

  it('uses one hour defaults for older meetings without timing fields', () => {
    const legacyMeeting = {
      id: 'meeting-2',
      meetingDate: '2026-03-01T10:00:00.000Z',
    } as Meeting

    const window = getMeetingWindow(legacyMeeting, new Date('2026-03-01T10:30:00.000Z'))

    expect(window.durationMinutes).toBe(60)
    expect(window.endedBufferMinutes).toBe(60)
    expect(window.status).toBe('ongoing')
  })
})
