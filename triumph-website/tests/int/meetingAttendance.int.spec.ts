import { describe, expect, it } from 'vitest'

import type { Meeting } from '@/payload-types'
import {
  calculateMeetingAbsenteeIds,
  calculateMeetingMemberAttendance,
} from '@/utilities/meetingAttendance'

const meeting = {
  durationMinutes: 90,
  endedBufferMinutes: 60,
  id: 'meeting-1',
  meetingDate: '2026-03-01T10:00:00.000Z',
} as Pick<Meeting, 'id' | 'meetingDate' | 'durationMinutes' | 'endedBufferMinutes'>

describe('meeting absentee calculation', () => {
  it('lists only eligible members without attendance or an accepted motivation after the meeting ends', () => {
    const absentees = calculateMeetingAbsenteeIds({
      attendance: [
        { member: 'present-member', status: 'present' },
        { member: 'late-member', status: 'late' },
        { member: 'motivated-member', status: 'motivated' },
        { member: 'explicit-absent-member', status: 'absent' },
      ],
      meeting,
      motivations: [{ member: 'accepted-motivation-member', status: 'accepted' }],
      members: [
        { id: 'present-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'late-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'motivated-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'explicit-absent-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'accepted-motivation-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'missing-attendance-member', joinedAt: '2026-02-01T10:00:00.000Z' },
        { id: 'future-member', joinedAt: '2026-03-02T10:00:00.000Z' },
      ],
      now: new Date('2026-03-01T11:30:00.000Z'),
    })

    expect(absentees).toEqual(['explicit-absent-member', 'missing-attendance-member'])
  })

  it('treats an accepted motivation as motivated even when attendance is still absent', () => {
    const records = calculateMeetingMemberAttendance({
      attendance: [{ member: 'member-1', status: 'absent' }],
      meeting,
      motivations: [{ member: 'member-1', status: 'accepted' }],
      members: [{ id: 'member-1', joinedAt: '2026-02-01T10:00:00.000Z' }],
      now: new Date('2026-03-01T11:30:00.000Z'),
    })

    expect(records).toEqual([{ memberId: 'member-1', status: 'motivated' }])
  })

  it('does not calculate absentees while the meeting is ongoing', () => {
    expect(
      calculateMeetingAbsenteeIds({
        attendance: [],
        meeting,
        motivations: [],
        members: [{ id: 'member-1', joinedAt: '2026-02-01T10:00:00.000Z' }],
        now: new Date('2026-03-01T11:29:00.000Z'),
      }),
    ).toEqual([])
  })
})
