// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import {
  getPresenceGraphData,
  getPresenceOverview,
} from '@/components/Dashboard/Widgets/presenceData'
import { getMeetingAbsenteeIds } from '@/utilities/meetingAttendance'

vi.mock('payload', () => ({ getPayload: vi.fn() }))

const now = new Date('2026-10-18T12:00:00Z')
const meeting = {
  id: 'meeting',
  meetingDate: '2026-10-11T10:00:00Z',
  durationMinutes: 60,
  endedBufferMinutes: 60,
}
const records = {
  users: ['present', 'late', 'motivated', 'missing', 'future'].map((id) => ({
    id,
    joinedAt: id === 'future' ? '2026-10-17T00:00:00Z' : '2026-07-01T00:00:00Z',
  })),
  meetings: [meeting],
  attendance: [
    { member: 'present', meeting: meeting.id, status: 'present' },
    { member: 'late', meeting: meeting.id, status: 'late' },
    { member: 'motivated', meeting: meeting.id, status: 'absent' },
  ],
  'absence-motivations': [{ member: 'motivated', meeting: meeting.id, status: 'accepted' }],
}
function source() {
  const find = vi.fn(async ({ collection }: { collection: string }) => ({
    docs: records[collection as keyof typeof records],
  }))
  return { find, payload: { find, config: {} } as unknown as Payload }
}
function closedTopology() {
  return Object.assign(new Error('Topology is closed'), { name: 'MongoTopologyClosedError' })
}
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('admin presence statistics reads', () => {
  it('calculates real attendance totals with four projected reads and no virtual joins', async () => {
    const { find, payload } = source()
    await expect(getPresenceOverview(payload, now)).resolves.toEqual({
      absent: 1,
      late: 1,
      motivated: 1,
      present: 1,
      attendanceRate: 50,
      expectedRecords: 4,
      memberCount: 5,
      meetingCount: 1,
    })
    expect(find).toHaveBeenCalledTimes(4)
    const calls = find.mock.calls.map(([options]) => options) as {
      collection: string
      select: Record<string, boolean>
      joins?: unknown
    }[]
    for (const options of calls) {
      expect(options.select).toBeDefined()
      expect(options.joins).toBeUndefined()
      expect(options.select).not.toHaveProperty('absentees')
      expect(options.select).not.toHaveProperty('attendance')
      expect(options.select).not.toHaveProperty('absenceMotivations')
    }
    await expect(getPresenceGraphData(payload, now)).resolves.toEqual([
      expect.objectContaining({ absent: 1, present: 1, late: 1, motivated: 1, total: 4, rate: 50 }),
    ])
  })

  it('waits for the development reload before retrying the interrupted read', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const stale = source()
    stale.find.mockRejectedValue(closedTopology())
    const fresh = source()
    let finishReload!: (payload: Payload) => void
    vi.mocked(getPayload).mockReturnValue(
      new Promise((resolve) => {
        finishReload = resolve
      }),
    )
    const result = getPresenceOverview(stale.payload, now)
    await vi.waitFor(() => expect(getPayload).toHaveBeenCalledTimes(1))
    expect(fresh.find).not.toHaveBeenCalled()
    finishReload(fresh.payload)
    await expect(result).resolves.toMatchObject({ present: 1, absent: 1, attendanceRate: 50 })
    expect(fresh.find).toHaveBeenCalledTimes(4)
  })

  it('counts no presence for all-motivated meetings without classifying them as unexcused', async () => {
    const { find, payload } = source()
    find.mockImplementation(async ({ collection }) => ({
      docs:
        collection === 'attendance'
          ? records.users.map((member) => ({
              member: member.id,
              meeting: meeting.id,
              status: 'motivated',
            }))
          : collection === 'absence-motivations'
            ? []
            : records[collection as keyof typeof records],
    }))
    await expect(getPresenceOverview(payload, now)).resolves.toMatchObject({
      expectedRecords: 4,
      motivated: 4,
      attendanceRate: 0,
      present: 0,
      absent: 0,
    })
    await expect(getPresenceGraphData(payload, now)).resolves.toEqual([
      expect.objectContaining({ total: 4, motivated: 4, rate: 0 }),
    ])
  })

  it('propagates a persistent topology failure after a single retry', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { find, payload } = source()
    const error = closedTopology()
    find.mockRejectedValue(error)
    vi.mocked(getPayload).mockResolvedValue(payload)
    await expect(getPresenceOverview(payload, now)).rejects.toBe(error)
    expect(getPayload).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledTimes(8)
  })

  it.each([
    ['production', closedTopology()],
    ['development', new Error('Not authorized')],
  ])(
    'does not retry unrelated failures or production connections (%s)',
    async (environment, error) => {
      vi.stubEnv('NODE_ENV', environment as string)
      const { find, payload } = source()
      find.mockRejectedValue(error)
      await expect(getPresenceOverview(payload, now)).rejects.toBe(error)
      expect(getPayload).not.toHaveBeenCalled()
    },
  )

  it('keeps direct meeting absentee reads small without changing absentee eligibility', async () => {
    const { find, payload } = source()
    await expect(getMeetingAbsenteeIds(payload, meeting, now)).resolves.toEqual(['missing'])
    expect(find).toHaveBeenCalledTimes(3)
    expect(find.mock.calls[0][0]).toMatchObject({ select: { joinedAt: true } })
  })
})
