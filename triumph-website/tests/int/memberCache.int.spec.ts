// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Config, Payload } from 'payload'
import type { User } from '@/payload-types'

await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks')
  Object.assign(globalThis, { AsyncLocalStorage })
})
vi.mock('server-only', () => ({}))
vi.mock('@/collections/Users/mailUtils', () => ({ readMailboxPreview: vi.fn() }))

import { IncrementalCache } from 'next/dist/server/lib/incremental-cache/index.js'
import { nodeFs } from 'next/dist/server/lib/node-fs-methods.js'
import {
  workAsyncStorage,
  type WorkStore,
} from 'next/dist/server/app-render/work-async-storage.external.js'
import { getMemberReads } from '@/utilities/memberReads'
import { getMemberInbox } from '@/utilities/memberInbox'
import { readMailboxPreview } from '@/collections/Users/mailUtils'
import {
  invalidateMemberChange,
  invalidateMemberDelete,
  memberCachePlugin,
} from '@/hooks/memberCache'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'
import { getMemberDuesSummary } from '@/utilities/memberDues'

let incrementalCache: IncrementalCache
let sequence = 0
let member: User

beforeEach(() => {
  vi.clearAllMocks()
  member = { id: `cache-test-${++sequence}`, role: 'active', updatedAt: '2026-01-01' } as User
  incrementalCache = new IncrementalCache({
    fs: nodeFs,
    dev: false,
    minimalMode: false,
    flushToDisk: false,
    serverDistDir: '/tmp/triumph-member-cache-tests',
    requestHeaders: {},
    maxMemoryCacheSize: 10_000_000,
    getPrerenderManifest: () => ({
      version: 4,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: { previewModeId: 'test', previewModeEncryptionKey: '', previewModeSigningKey: '' },
    }),
  })
  Object.assign(globalThis, { __incrementalCache: incrementalCache })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, '__incrementalCache')
})

async function mutate(slug: string, doc: object, previousDoc?: object, deleted = false) {
  await new Promise((resolve) => setTimeout(resolve, 2))
  // Next route handlers publish the hooks' pending tags after the operation.
  const store = {
    incrementalCache,
    route: '/api/test',
    pendingRevalidatedTags: [],
  } as unknown as WorkStore
  await workAsyncStorage.run(store, async () => {
    const args = { collection: { slug }, doc, previousDoc }
    if (deleted) await invalidateMemberDelete(args as never)
    else await invalidateMemberChange(args as never)
  })
  for (const { tag, profile } of store.pendingRevalidatedTags ?? []) {
    expect(profile).toEqual({ expire: 0 })
    await incrementalCache.revalidateTag(tag, profile as { expire: number })
  }
}

describe('member server cache with the real Next Data Cache', () => {
  it('measures cold versus warm reads with controlled database latency', async () => {
    const find = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return { docs: [] }
    })
    const payload = { find } as unknown as Payload
    const load = () =>
      getMemberReads(payload, { ...member }).find({ collection: 'events', depth: 0 })
    const coldStart = performance.now()
    await load()
    const coldMs = performance.now() - coldStart
    const warmStart = performance.now()
    await load()
    const warmMs = performance.now() - warmStart
    expect(find).toHaveBeenCalledTimes(1)
    console.info('Member cache benchmark (controlled database):', {
      coldMs: Math.round(coldMs * 100) / 100,
      warmMs: Math.round(warmMs * 100) / 100,
      coldQueries: 1,
      warmQueries: 0,
    })
  })

  it('recalculates meeting and month boundaries without repeating content reads', async () => {
    const meeting = {
      id: 'meeting',
      meetingDate: new Date(2026, 9, 18, 10).toISOString(),
      durationMinutes: 60,
      endedBufferMinutes: 60,
    }
    const find = vi.fn(async ({ collection }: { collection: string }) => ({
      docs: collection === 'meetings' ? [meeting] : [],
    }))
    const user = { ...member, joinedAt: new Date(2026, 6, 1).toISOString() }
    const reads = getMemberReads({ find } as unknown as Payload, user)
    const before = await getMemberAttendanceSummary(reads, user, new Date(2026, 9, 18, 10, 30))
    const after = await getMemberAttendanceSummary(reads, user, new Date(2026, 9, 18, 11, 1))
    expect(before.totalMeetings).toBe(0)
    expect(after.totalMeetings).toBe(1)
    expect(find).toHaveBeenCalledTimes(3)
    const october = await getMemberDuesSummary(reads, user, new Date(2026, 9, 31, 23, 59))
    const november = await getMemberDuesSummary(reads, user, new Date(2026, 10, 1))
    expect(october.dues).toHaveLength(1)
    expect(november.dues).toHaveLength(2)
    expect(find).toHaveBeenCalledTimes(4)
    await getMemberDuesSummary(reads, user, new Date(2027, 6, 1))
    expect(find).toHaveBeenCalledTimes(5)
  })

  it('reuses content across requests, partitions identity/role/filters, and projects user fields', async () => {
    const find = vi.fn(async () => ({ docs: [], totalDocs: 0 }))
    const payload = { find } as unknown as Payload
    const query = { collection: 'users' as const, depth: 1, where: { role: { equals: 'active' } } }
    await getMemberReads(payload, member).find(query)
    await getMemberReads(payload, { ...member }).find(query)
    expect(find).toHaveBeenCalledTimes(1)
    const options = (find.mock.calls[0] as unknown as [Record<string, unknown>])[0]
    expect(options.select).not.toHaveProperty('clubMailPassword')
    expect(options.select).not.toHaveProperty('sessions')
    expect(options.populate).toMatchObject({ users: { name: true, role: true } })
    await getMemberReads(payload, { ...member, id: `${member.id}-other` }).find(query)
    await getMemberReads(payload, { ...member, role: 'president' }).find(query)
    await getMemberReads(payload, member).find({ ...query, where: { role: { equals: 'aspirer' } } })
    expect(find).toHaveBeenCalledTimes(4)
  })

  it('invalidates both members after reassignment and preserves unrelated warm entries', async () => {
    const find = vi.fn(async () => ({ docs: [] }))
    const payload = { find } as unknown as Payload
    const users = [
      member,
      { ...member, id: `${member.id}-new` },
      { ...member, id: `${member.id}-unrelated` },
    ]
    const load = (user: User) =>
      getMemberReads(payload, user).find({
        collection: 'payments',
        depth: 0,
        where: { member: { equals: user.id } },
      })
    await Promise.all(users.map(load))
    expect(find).toHaveBeenCalledTimes(3)
    await mutate('payments', { member: { id: users[1].id } }, { member: users[0].id })
    await Promise.all(users.map(load))
    expect(find).toHaveBeenCalledTimes(5)
  })

  it('updates cached dashboard navigation counts after project and commission reassignment', async () => {
    const assigned = { events: member.id, comissions: member.id }
    const count = vi.fn(
      async ({
        collection,
        where,
      }: {
        collection: keyof typeof assigned
        where: {
          coordinators?: { contains: string }
          or?: { coordonators?: { contains: string } }[]
        }
      }) => ({
        totalDocs:
          assigned[collection] ===
          (where.coordinators?.contains ?? where.or?.[0].coordonators?.contains)
            ? 1
            : 0,
      }),
    )
    const payload = { count } as unknown as Payload
    const users = [member, { ...member, id: `${member.id}-new` }]
    for (const collection of ['events', 'comissions'] as const) {
      const load = (user: User) =>
        getMemberReads(payload, user).count({
          collection,
          overrideAccess: true,
          where:
            collection === 'events'
              ? {
                  or: [
                    { coordonators: { contains: user.id } },
                    { checkInMembers: { contains: user.id } },
                  ],
                }
              : { coordinators: { contains: user.id } },
        })
      expect(await Promise.all(users.map(load))).toEqual([{ totalDocs: 1 }, { totalDocs: 0 }])
      await Promise.all(users.map(load))
      const before = count.mock.calls.length
      assigned[collection] = users[1].id
      const field = collection === 'events' ? 'coordonators' : 'coordinators'
      await mutate(collection, { [field]: [users[1].id] }, { [field]: [users[0].id] })
      expect(await Promise.all(users.map(load))).toEqual([{ totalDocs: 0 }, { totalDocs: 1 }])
      expect(count).toHaveBeenCalledTimes(before + 2)
    }
  })

  it('expires cached meeting participants on attendance creation and deletion', async () => {
    const find = vi.fn(async () => ({ docs: [] }))
    const payload = { find } as unknown as Payload
    const meeting = `${member.id}-meeting`
    const load = () =>
      getMemberReads(payload, member).find({
        collection: 'attendance',
        depth: 0,
        where: { meeting: { equals: meeting } },
      })
    await load()
    await load()
    await mutate('attendance', { member: member.id, meeting })
    await load()
    await mutate('attendance', { member: member.id, meeting: { id: meeting } }, undefined, true)
    await load()
    expect(find).toHaveBeenCalledTimes(3)
  })

  it('expires populated recruitment records when a submission changes', async () => {
    const find = vi.fn(async () => ({ docs: [] }))
    const payload = { find } as unknown as Payload
    const load = () =>
      getMemberReads(payload, member).find({ collection: 'applications', depth: 2 })
    await load()
    await load()
    await mutate('form-submissions', { id: 'submission' })
    await load()
    expect(find).toHaveBeenCalledTimes(2)
  })

  it('retries failed reads instead of caching failures', async () => {
    const find = vi
      .fn()
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValue({ docs: [] })
    const payload = { find } as unknown as Payload
    const load = () => getMemberReads(payload, member).find({ collection: 'events', depth: 0 })
    await expect(load()).rejects.toThrow('Database unavailable')
    await expect(load()).resolves.toEqual({ docs: [] })
    expect(find).toHaveBeenCalledTimes(2)
  })

  it('caches a small inbox preview for 60 seconds without credentials in the cache key', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2035-01-01T00:00:00Z'))
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now() - performance.timeOrigin)
    const preview = { count: 7, messages: [{ uid: 7, subject: 'Hello' }] }
    vi.mocked(readMailboxPreview).mockResolvedValue(preview)
    const generateKey = vi.spyOn(incrementalCache, 'generateCacheKey')
    const user = { ...member, clubMail: 'test@example.com', clubMailPassword: 'private-password' }
    await expect(getMemberInbox(user)).resolves.toEqual(preview)
    await getMemberInbox({ ...user })
    expect(readMailboxPreview).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(generateKey.mock.calls)).not.toContain('private-password')
    vi.setSystemTime(new Date('2035-01-01T00:01:01Z'))
    await getMemberInbox({ ...user })
    expect(readMailboxPreview).toHaveBeenCalledTimes(2)
  })

  it('adds hooks to generated collections and globals without replacing existing hooks', async () => {
    const existing = vi.fn()
    const config = memberCachePlugin({
      collections: [{ slug: 'form-submissions', fields: [], hooks: { afterChange: [existing] } }],
      globals: [{ slug: 'members-dashboard', fields: [] }],
    } as unknown as Config)
    expect(config.collections?.[0].hooks?.afterChange).toEqual([existing, invalidateMemberChange])
    const hook = config.globals?.[0].hooks?.afterChange?.[0]
    expect(hook).toBeDefined()
    const findGlobal = vi.fn(async () => ({ dashboardTitle: 'Title' }))
    const load = () =>
      getMemberReads({ findGlobal } as unknown as Payload, member).findGlobal({
        slug: 'members-dashboard',
        depth: 0,
      })
    await load()
    await load()
    await new Promise((resolve) => setTimeout(resolve, 2))
    const store = {
      incrementalCache,
      route: '/api/test',
      pendingRevalidatedTags: [],
    } as unknown as WorkStore
    await workAsyncStorage.run(store, () =>
      hook!({ global: { slug: 'members-dashboard' }, doc: {}, previousDoc: {} } as never),
    )
    for (const { tag } of store.pendingRevalidatedTags ?? [])
      await incrementalCache.revalidateTag(tag, { expire: 0 })
    await load()
    expect(findGlobal).toHaveBeenCalledTimes(2)
  })
})
