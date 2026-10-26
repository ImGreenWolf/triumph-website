// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionAfterChangeHook } from 'payload'

await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks')
  Object.assign(globalThis, { AsyncLocalStorage })
})

const { after } = vi.hoisted(() => ({ after: vi.fn() }))
vi.mock('next/server', () => ({ after }))

import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external.js'
import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external.js'
import { invalidateMemberChange } from '@/hooks/memberCache'

type HookArgs = Parameters<CollectionAfterChangeHook>[0]

function eventChange(operation: 'create' | 'update', status = 'draft'): HookArgs {
  return {
    collection: { slug: 'events', versions: { drafts: { autosave: { interval: 100 } } } },
    doc: { id: 'new-event', _status: status },
    previousDoc: {},
    operation,
  } as HookArgs
}

function requestStore() {
  return {
    route: '/admin/collections/events/create',
    page: '/admin/[[...segments]]/page',
    incrementalCache: {},
    pendingRevalidatedTags: [],
  } as unknown as Parameters<typeof workAsyncStorage.run>[0]
}

beforeEach(() => vi.clearAllMocks())

describe('event editor initial draft cache invalidation', () => {
  it('finishes initial draft creation during rendering and expires its cache after the response', async () => {
    const store = requestStore()
    const change = eventChange('create')
    await workAsyncStorage.run(store, async () => {
      await workUnitAsyncStorage.run(
        { type: 'request', phase: 'render' } as Parameters<typeof workUnitAsyncStorage.run>[0],
        async () => expect(await invalidateMemberChange(change)).toBe(change.doc),
      )
      expect(store.pendingRevalidatedTags).toEqual([])
      expect(after).toHaveBeenCalledOnce()
      await workUnitAsyncStorage.run(
        { type: 'request', phase: 'after' } as Parameters<typeof workUnitAsyncStorage.run>[0],
        async () => after.mock.calls[0][0](),
      )
      expect(store.pendingRevalidatedTags).toContainEqual({
        tag: 'members:collection:events',
        profile: { expire: 0 },
      })
    })
  })

  it.each([
    ['update', 'draft'],
    ['create', 'published'],
    ['update', 'published'],
  ] as const)('keeps %s of a %s event immediately fresh', async (operation, status) => {
    const store = requestStore()
    await workAsyncStorage.run(store, async () => {
      await invalidateMemberChange(eventChange(operation, status))
      expect(after).not.toHaveBeenCalled()
      expect(store.pendingRevalidatedTags).toContainEqual({
        tag: 'members:collection:events',
        profile: { expire: 0 },
      })
    })
  })
})
