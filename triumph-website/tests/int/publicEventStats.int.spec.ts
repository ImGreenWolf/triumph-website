// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Event } from '@/payload-types'
const { find, aggregate } = vi.hoisted(() => ({ find: vi.fn(), aggregate: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: async () => ({
    find,
    db: {
      collections: {
        'event-registrations': {
          schema: { path: () => ({ cast: (id: string) => id }) },
          aggregate: (pipeline: unknown) => ({
            collation: () => ({ exec: () => aggregate(pipeline) }),
          }),
        },
      },
    },
    logger: { error: vi.fn() },
  }),
}))
import { withPublicEventCounts } from '@/utilities/publicEventStats'

describe('public event aggregates', () => {
  it('returns only aggregate counts for published events, excluding cancelled registrations', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 'published' }] })
    aggregate.mockResolvedValueOnce([{ people: 184 }])
    const [event] = await withPublicEventCounts([{ id: 'published' }] as Event[])
    expect(event.registrations).toEqual({ totalDocs: 184 })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, draft: false }),
    )
    expect(aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { $match: { event: 'published', status: { $ne: 'cancelled' } } },
        expect.objectContaining({
          $group: expect.objectContaining({
            people: { $sum: { $add: [1, { $max: [0, { $ifNull: ['$guests', 0] }] }] } },
          }),
        }),
      ]),
    )
  })
  it('never reads private counts for an unpublished event', async () => {
    find.mockResolvedValueOnce({ docs: [] })
    const calls = aggregate.mock.calls.length
    const [event] = await withPublicEventCounts([{ id: 'draft' }] as Event[])
    expect(event.registrations).toBeUndefined()
    expect(aggregate.mock.calls.length).toBe(calls)
  })
  it('does not turn an unavailable count into zero', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 'unavailable' }] })
    aggregate.mockRejectedValueOnce(new Error('Unavailable'))
    const [event] = await withPublicEventCounts([{ id: 'unavailable' }] as Event[])
    expect(event.registrations).toBeUndefined()
  })
})
