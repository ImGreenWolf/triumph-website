// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Event } from '@/payload-types'
const { find, count } = vi.hoisted(() => ({ find: vi.fn(), count: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: async () => ({ find, count, logger: { error: vi.fn() } }),
}))
import { withPublicEventCounts } from '@/utilities/publicEventStats'

describe('public event aggregates', () => {
  it('returns only aggregate counts for published events, excluding cancelled registrations', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 'published' }] })
    count.mockResolvedValueOnce({ totalDocs: 184 })
    const [event] = await withPublicEventCounts([{ id: 'published' }] as Event[])
    expect(event.registrations).toEqual({ totalDocs: 184 })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, draft: false }),
    )
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [{ event: { equals: 'published' } }, { status: { not_equals: 'cancelled' } }],
        },
      }),
    )
  })
  it('never reads private counts for an unpublished event', async () => {
    find.mockResolvedValueOnce({ docs: [] })
    const calls = count.mock.calls.length
    const [event] = await withPublicEventCounts([{ id: 'draft' }] as Event[])
    expect(event.registrations).toBeUndefined()
    expect(count.mock.calls.length).toBe(calls)
  })
  it('does not turn an unavailable count into zero', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 'unavailable' }] })
    count.mockRejectedValueOnce(new Error('Unavailable'))
    const [event] = await withPublicEventCounts([{ id: 'unavailable' }] as Event[])
    expect(event.registrations).toBeUndefined()
  })
})
