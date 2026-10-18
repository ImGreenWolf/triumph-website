import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import type { AbsenceMotivation, Attendance, Meeting, User } from '@/payload-types'
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
  it('counts missing records as absences and keeps motivated absences separate from presence', async () => {
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
          docs:
            collection === 'meetings' ? meetings : collection === 'attendance' ? attendance : [],
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
      attendancePercentage: 50,
      lateMeetings: 1,
      motivatedMeetings: 1,
      presentMeetings: 1,
      totalMeetings: 4,
    })
    expect(summary.records.map((record) => record.status)).toEqual([
      'present',
      'late',
      'motivated',
      'absent',
    ])
  })

  it('does not count an ongoing meeting as an absence before its duration has elapsed', async () => {
    const ongoingMeeting = {
      durationMinutes: 60,
      endedBufferMinutes: 60,
      id: 'meeting-ongoing',
      meetingDate: '2026-02-01T10:00:00.000Z',
    } as Meeting
    const payload = {
      find: vi.fn(({ collection }) => {
        return Promise.resolve({
          docs: collection === 'meetings' ? [ongoingMeeting] : [],
        })
      }),
    } as unknown as Payload

    const summary = await getMemberAttendanceSummary(
      payload,
      member,
      new Date('2026-02-01T10:30:00.000Z'),
    )

    expect(summary).toMatchObject({
      absentMeetings: 0,
      attendancePercentage: 0,
      totalMeetings: 0,
    })
    expect(summary.records).toHaveLength(0)
  })

  it('uses an accepted motivation even when the stored attendance status is absent', async () => {
    const endedMeeting = {
      durationMinutes: 60,
      endedBufferMinutes: 60,
      id: 'meeting-motivated',
      meetingDate: '2026-02-01T10:00:00.000Z',
    } as Meeting
    const attendance = [
      {
        id: 'attendance-motivated',
        meeting: endedMeeting,
        status: 'absent',
      },
    ] as Attendance[]
    const motivations = [
      {
        id: 'motivation-1',
        meeting: endedMeeting,
        status: 'accepted',
      },
    ] as AbsenceMotivation[]
    const payload = {
      find: vi.fn(({ collection }) =>
        Promise.resolve({
          docs:
            collection === 'meetings'
              ? [endedMeeting]
              : collection === 'attendance'
                ? attendance
                : motivations,
        }),
      ),
    } as unknown as Payload

    const summary = await getMemberAttendanceSummary(
      payload,
      member,
      new Date('2026-02-01T12:00:00.000Z'),
    )

    expect(summary).toMatchObject({
      absentMeetings: 0,
      motivatedMeetings: 1,
      totalMeetings: 1,
      absencePercentage: 0,
      attendancePercentage: 0,
    })
    expect(summary.records[0]?.status).toBe('motivated')
  })

  it('keeps the percentage bounded when a member checks in during an ongoing meeting', async () => {
    const ongoing = {
      ...meetings[0],
      id: 'ongoing',
      meetingDate: '2026-02-01T10:00:00Z',
      durationMinutes: 60,
    }
    const payload = {
      find: vi.fn(async ({ collection }) => ({
        docs:
          collection === 'meetings'
            ? [meetings[0], ongoing]
            : collection === 'attendance'
              ? [
                  { meeting: meetings[0].id, status: 'present' },
                  { meeting: ongoing.id, status: 'late' },
                ]
              : [],
      })),
    } as unknown as Payload
    const summary = await getMemberAttendanceSummary(
      payload,
      member,
      new Date('2026-02-01T10:30:00Z'),
    )
    expect(summary).toMatchObject({
      totalMeetings: 2,
      attendancePercentage: 100,
      absentMeetings: 0,
    })
  })

  it.each([
    { statuses: ['motivated', 'motivated'], total: 2, percentage: 0 },
    { statuses: ['present', 'motivated'], total: 2, percentage: 50 },
    {
      statuses: ['present', 'present', 'present', 'present', 'present', 'motivated'],
      total: 6,
      percentage: 83,
    },
  ])(
    'counts only present and late records as attendance ($statuses)',
    async ({ statuses, total, percentage }) => {
      const endedMeetings = meetings.slice(0, statuses.length)
      const payload = {
        find: vi.fn(async ({ collection }) => ({
          docs:
            collection === 'meetings'
              ? endedMeetings
              : collection === 'attendance'
                ? statuses.map((status, index) => ({ meeting: endedMeetings[index].id, status }))
                : [],
        })),
      } as unknown as Payload
      const summary = await getMemberAttendanceSummary(
        payload,
        member,
        new Date('2026-03-01T12:00:00Z'),
      )
      expect(summary).toMatchObject({
        totalMeetings: total,
        attendancePercentage: percentage,
        motivatedMeetings: statuses.filter((status) => status === 'motivated').length,
      })
    },
  )
})
