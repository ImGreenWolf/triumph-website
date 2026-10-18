import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { recordMemberCheckIn } from '@/utilities/recordMemberCheckIn'

const member = { id: 'member-1', role: 'active' } as User
const meeting = {
  id: 'meeting-1',
  meetingDate: '2026-10-18T10:00:00Z',
  durationMinutes: 60,
  endedBufferMinutes: 60,
}
function mocks() {
  const findByID = vi.fn().mockResolvedValue(meeting)
  const find = vi.fn().mockResolvedValue({ docs: [] })
  const create = vi.fn().mockImplementation(async ({ data }) => ({ id: 'attendance-1', ...data }))
  const update = vi.fn().mockImplementation(async ({ data }) => ({ id: 'attendance-1', ...data }))
  const remove = vi.fn().mockResolvedValue({ docs: [] })
  return {
    findByID,
    find,
    create,
    update,
    remove,
    payload: { findByID, find, create, update, delete: remove } as unknown as Payload,
  }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-18T10:05:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('automatic member check-in', () => {
  it('records the authenticated member, clears motivations, and checks access live', async () => {
    const { payload, create, remove, findByID } = mocks()
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toEqual({
      status: 'present',
      meetingDate: meeting.meetingDate,
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: member,
        overrideAccess: false,
        data: { member: member.id, meeting: meeting.id, status: 'present' },
      }),
    )
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ user: member, overrideAccess: false }),
    )
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'absence-motivations',
        overrideAccess: true,
        where: { and: [{ member: { equals: member.id } }, { meeting: { equals: meeting.id } }] },
      }),
    )
  })

  it('keeps an existing successful attendance unchanged on retries', async () => {
    const { payload, find, create, update } = mocks()
    find.mockResolvedValue({ docs: [{ id: 'attendance-1', status: 'present' }] })
    vi.setSystemTime(new Date('2026-10-18T10:30:00Z'))
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      status: 'present',
    })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('accepts a competing successful insert without duplicating the record', async () => {
    const { payload, find, create } = mocks()
    find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ status: 'present' }] })
    create.mockRejectedValueOnce(new Error('Unique index conflict'))
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      status: 'present',
    })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('propagates failed writes and allows a subsequent retry', async () => {
    const { payload, create } = mocks()
    create.mockRejectedValueOnce(new Error('Database unavailable'))
    await expect(recordMemberCheckIn(payload, member, meeting.id)).rejects.toThrow(
      'Database unavailable',
    )
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      status: 'present',
    })
  })

  it('rejects missing meetings and expired windows without any writes', async () => {
    const { payload, findByID, create, update, remove } = mocks()
    findByID.mockResolvedValueOnce(null)
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      statusCode: 404,
    })
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      statusCode: 409,
    })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('evaluates the late boundary using the current clock', async () => {
    const { payload } = mocks()
    vi.setSystemTime(new Date('2026-10-18T10:16:00Z'))
    await expect(recordMemberCheckIn(payload, member, meeting.id)).resolves.toMatchObject({
      status: 'late',
    })
  })
})
