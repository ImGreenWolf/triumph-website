import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import type { Attendance, Meeting, User } from '@/payload-types'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'

const member = {
  id: 'member-1',
  joinedAt: '2026-01-01T00:00:00.000Z',
} as User

const meetings = [
  {
    id: 'meeting-1',
    meetingDate: '2026-01-04T16:00:00.000Z',
  },
  {
    id: 'meeting-2',
    meetingDate: '2026-01-11T16:00:00.000Z',
  },
  {
    id: 'meeting-3',
    meetingDate: '2026-01-18T16:00:00.000Z',
  },
  {
    id: 'meeting-4',
    meetingDate: '2026-01-25T16:00:00.000Z',
  },
  {
    id: 'meeting-5',
    meetingDate: '2026-02-08T16:00:00.000Z',
  },
  {
    id: 'meeting-6',
    meetingDate: '2026-02-15T16:00:00.000Z',
  },
] as Meeting[]

describe('getMemberAttendanceSummary', () => {
  it('counts missing records as absences and excludes motivated absences from attendance percentage', async () => {
    const attendance = [
      {
        id: 'attendance-1',
        meeting: meetings[0],
        status: 'present',
      },
      {
        id: 'attendance-2',
        meeting: meetings[1],
        status: 'late',
      },
      {
        id: 'attendance-3',
        meeting: meetings[2],
        status: 'motivated',
      },
      {
        id: 'attendance-4',
        meeting: meetings[4],
        status: 'motivated',
      },
    ] as Attendance[]
    const payload = {
      find: vi.fn(({ collection }) => {
        return Promise.resolve({
          docs: collection === 'meetings' ? meetings : attendance,
        })
      }),
    } as unknown as Payload

    const summary = await getMemberAttendanceSummary(
      payload,
      member,
      new Date('2026-02-01T00:00:00.000Z'),
    )

    expect(summary).toMatchObject({
      absencePercentage: 25,
      absentMeetings: 1,
      attendancePercentage: 67,
      lateMeetings: 1,
      motivatedMeetings: 2,
      presentMeetings: 1,
      totalMeetings: 4,
    })
    expect(summary.records.map((record) => record.status)).toEqual([
      'present',
      'late',
      'motivated',
      'absent',
      'motivated',
    ])
  })
})
