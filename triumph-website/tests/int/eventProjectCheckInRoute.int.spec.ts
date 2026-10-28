import { GET as projectData } from '@/app/(frontend)/members/projects/data/route'
import { mutateProjectOperation } from '@/utilities/projectOperations'
import { shiftSnapshotKey } from '@/utilities/eventOperationsTypes'
const ops = vi.hoisted(() => ({ summary: vi.fn(), query: vi.fn() }))
vi.mock('@/utilities/projectQueries', () => ({
  projectSummary: ops.summary,
  queryProjectPage: ops.query,
  serializeProjectRegistration: (row: unknown) => row,
}))
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import { POST, PATCH, DELETE } from '@/app/(frontend)/members/projects/check-in/route'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: vi.fn(),
  createLocalReq: async (args: object, payload: unknown) => ({ ...args, payload }),
  initTransaction: vi.fn(async () => false),
  commitTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

const event = {
  id: 'event',
  donation: '30',
  minimumConsumation: 20,
  days: [{ id: 'day', slots: [{ id: 'slot' }] }],
}
let registration: Record<string, unknown>
let payload: {
  auth: ReturnType<typeof vi.fn>
  findByID: ReturnType<typeof vi.fn>
  find: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

const request = (method: string, body: unknown) =>
  new Request('https://example.com/members/projects/check-in', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const walkIn = {
  eventId: 'event',
  dayId: 'day',
  slotId: 'slot',
  name: 'Ana',
  ageGroup: 'minor',
  guests: 1,
  totalCollected: 100,
}
const confirmation = {
  expectedVersion: 0,
  registrationId: 'reg',
  status: 'present',
  ageGroup: 'adult',
  guests: 1,
  totalCollected: 100,
}

beforeEach(() => {
  registration = {
    id: 'reg',
    event: 'event',
    name: 'Ana',
    status: 'registered',
    guests: 1,
    donation: 60,
  }
  payload = {
    auth: vi.fn(async () => ({ user: { id: 'staff', role: 'president' } })),
    findByID: vi.fn(async ({ collection }) => (collection === 'events' ? event : registration)),
    find: vi.fn().mockResolvedValue({ docs: [] }),
    create: vi.fn(async ({ data }) => ({ ...data, id: 'reg', createdAt: '2026-10-27' })),
    update: vi.fn(async ({ data }) => {
      registration = { ...registration, ...data }
      return registration
    }),
  }
  vi.mocked(getPayload).mockResolvedValue(payload as never)
})

describe('project check-in payment HTTP boundary', () => {
  it.each(['minor', 'adult'])(
    'splits a walk-in total for age %s on the server',
    async (ageGroup) => {
      const response = await POST(
        request('POST', { ...walkIn, ageGroup, donation: 999, consumptionAmount: 0 }),
      )
      expect(response.status).toBe(201)
      expect((await response.json()).registration).toMatchObject({
        ageGroup,
        donation: 60,
        consumptionAmount: 40,
      })
      expect(payload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ eventRegistrationWalkIn: true }),
        }),
      )
    },
  )

  it('confirms and reconfirms without subtracting consumption twice', async () => {
    const first = await PATCH(request('PATCH', confirmation))
    expect(first.status).toBe(200)
    expect((await first.json()).registration).toMatchObject({
      ageGroup: 'adult',
      donation: 60,
      consumptionAmount: 40,
      status: 'present',
    })
    const second = await PATCH(request('PATCH', confirmation))
    expect((await second.json()).registration).toMatchObject({
      donation: 60,
      consumptionAmount: 40,
    })
  })

  it.each([
    { totalCollected: 99.99 },
    { totalCollected: null },
    { totalCollected: '' },
    { totalCollected: 100.001 },
    { totalCollected: -1 },
    { totalCollected: 1_000_001 },
    { ageGroup: null },
    { ageGroup: 'major' },
    { guests: 2 },
    { guests: -1 },
    { guests: 1.5 },
  ])('rejects invalid payment/age %j for walk-ins and confirmations', async (invalid) => {
    expect((await POST(request('POST', { ...walkIn, ...invalid }))).status).toBe(400)
    expect((await PATCH(request('PATCH', { ...confirmation, ...invalid }))).status).toBe(400)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it.each(['registered', 'absent'])(
    'preserves stored amounts when changing status to %s without payment or age',
    async (status) => {
      registration.consumptionAmount = 40
      const response = await PATCH(
        request('PATCH', {
          registrationId: 'reg',
          expectedVersion: 0,
          status,
          donation: 0,
          consumptionAmount: 0,
        }),
      )
      expect(response.status).toBe(200)
      expect((await response.json()).registration).toMatchObject({
        donation: 60,
        consumptionAmount: 40,
        status,
      })
      expect(registration.ageGroup).toBeUndefined()
      expect(payload.update.mock.calls[0][0].data).not.toHaveProperty('donation')
    },
  )

  it('cancels without changing payment or requiring age', async () => {
    registration.consumptionAmount = 40
    expect(
      (await DELETE(request('DELETE', { registrationId: 'reg', expectedVersion: 0 }))).status,
    ).toBe(200)
    expect(registration).toMatchObject({ donation: 60, consumptionAmount: 40, status: 'cancelled' })
  })

  it('rejects donation-only confirmation and malformed bodies', async () => {
    expect(
      (
        await PATCH(
          request('PATCH', {
            registrationId: 'reg',
            status: 'present',
            ageGroup: 'adult',
            donation: 100,
          }),
        )
      ).status,
    ).toBe(400)
    expect((await POST(request('POST', null))).status).toBe(400)
    expect((await PATCH(request('PATCH', []))).status).toBe(400)
  })

  it('keeps authentication and event access checks', async () => {
    payload.auth.mockResolvedValueOnce({ user: null })
    expect((await POST(request('POST', walkIn))).status).toBe(401)
    payload.auth.mockResolvedValue({ user: { id: 'outsider', role: 'active' } })
    expect((await POST(request('POST', walkIn))).status).toBe(403)
    expect((await PATCH(request('PATCH', confirmation))).status).toBe(403)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('duplicate cleanup HTTP boundary', () => {
  const rows = () => [
    {
      id: 'keep',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '',
      status: 'present',
      donation: 30,
      createdAt: '2026-01-01',
    },
    {
      id: 'remove',
      name: 'Ana again',
      email: 'ANA@example.com',
      phone: '',
      status: 'registered',
      donation: 0,
      createdAt: '2026-02-01',
    },
  ]
  const action = (name = 'preview-duplicates', extra = {}) =>
    request('POST', { action: name, eventId: 'event', ...extra })
  beforeEach(() => {
    payload.find.mockResolvedValue({ docs: rows() })
    payload.update.mockResolvedValue({ docs: [{ ...rows()[1], status: 'cancelled' }], errors: [] })
  })
  it('previews server-computed removals without changing registrations', async () => {
    const response = await POST(action())
    expect(response.status).toBe(200)
    expect((await response.json()).plan).toMatchObject({
      removals: [{ id: 'remove', keepId: 'keep' }],
      protectedCount: 1,
    })
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 0,
        pagination: false,
        where: { and: [{ event: { equals: 'event' } }, { status: { not_equals: 'cancelled' } }] },
      }),
    )
  })
  it('requires manager permission even for the preview', async () => {
    payload.auth.mockResolvedValue({ user: { id: 'member', role: 'member' } })
    expect((await POST(action())).status).toBe(403)
    expect(
      (await POST(action('remove-duplicates', { removals: [{ id: 'remove', keepId: 'keep' }] })))
        .status,
    ).toBe(403)
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
  it('rejects unauthenticated and cross-site actions', async () => {
    payload.auth.mockResolvedValue({ user: null })
    expect((await POST(action())).status).toBe(401)
    const crossSite = action()
    crossSite.headers.set('sec-fetch-site', 'cross-site')
    expect((await POST(crossSite)).status).toBe(403)
    expect(payload.update).not.toHaveBeenCalled()
  })
  it('requires the exact reviewed list and rechecks attendance/payment changes', async () => {
    expect(
      (await POST(action('remove-duplicates', { removals: [{ id: 'keep', keepId: 'remove' }] })))
        .status,
    ).toBe(409)
    payload.find.mockResolvedValue({ docs: [rows()[0], { ...rows()[1], donation: 20 }] })
    const response = await POST(
      action('remove-duplicates', { removals: [{ id: 'remove', keepId: 'keep' }] }),
    )
    expect(response.status).toBe(409)
    expect((await response.json()).plan.removals).toEqual([])
    expect(payload.update).not.toHaveBeenCalled()
  })
  it.each([undefined, null, {}, ['remove'], [{ id: 'remove' }]])(
    'rejects an invalid review list %j',
    async (removals) => {
      expect((await POST(action('remove-duplicates', { removals }))).status).toBe(400)
      expect(payload.update).not.toHaveBeenCalled()
    },
  )
  it('soft-cancels only the reviewed unpaid rows without changing their recorded data', async () => {
    const response = await POST(
      action('remove-duplicates', { removals: [{ id: 'remove', keepId: 'keep' }] }),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).registrations).toEqual([
      { id: 'remove', status: 'cancelled', timeOfArrival: null },
    ])
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'cancelled' },
        depth: 0,
        where: {
          and: expect.arrayContaining([
            { id: { in: ['remove'] } },
            { event: { equals: 'event' } },
            { status: { in: ['registered', 'absent'] } },
            {
              or: [
                { donation: { exists: false } },
                { donation: { equals: null } },
                { donation: { equals: 0 } },
              ],
            },
          ]),
        },
      }),
    )
  })
  it('reports partial failures instead of claiming every duplicate was removed', async () => {
    payload.update.mockResolvedValue({ docs: [], errors: [{ id: 'remove', message: 'Failed' }] })
    const response = await POST(
      action('remove-duplicates', { removals: [{ id: 'remove', keepId: 'keep' }] }),
    )
    expect(await response.json()).toMatchObject({
      incomplete: true,
      registrations: [],
      message: expect.stringContaining('nu au putut fi eliminate'),
    })
  })
  it('does no write when there is nothing safe to remove', async () => {
    payload.find.mockResolvedValue({ docs: [rows()[0]] })
    expect((await POST(action('remove-duplicates', { removals: [] }))).status).toBe(200)
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('duplicate cleanup batching', () => {
  it.each([false, true])(
    'bounds transactions and reports earlier commits when a later chunk fails: %s',
    async (failLater) => {
      const keep = {
        id: 'keep',
        name: 'Ana',
        email: 'ana@example.com',
        status: 'present',
        donation: 30,
      }
      const duplicates = Array.from({ length: 120 }, (_, index) => ({
        id: `duplicate-${String(index).padStart(3, '0')}`,
        name: 'Ana',
        email: 'ana@example.com',
        status: 'registered',
        donation: 0,
      }))
      payload.find.mockResolvedValue({ docs: [keep, ...duplicates] })
      payload.update.mockImplementation(async ({ where }) => {
        if (failLater && payload.update.mock.calls.length === 2) throw new Error('Database failure')
        return {
          docs: where.and[0].id.in.map((id: string) => ({ id, status: 'cancelled' })),
          errors: [],
        }
      })
      const response = await POST(
        request('POST', {
          action: 'remove-duplicates',
          eventId: 'event',
          removals: duplicates.map((row) => ({ id: row.id, keepId: 'keep' })),
        }),
      )
      const result = await response.json()
      expect(result.registrations).toHaveLength(failLater ? 50 : 120)
      expect(result.incomplete).toBe(failLater)
      expect(payload.update).toHaveBeenCalledTimes(failLater ? 2 : 3)
      for (const [args] of payload.update.mock.calls) {
        expect(args.where.and[0].id.in.length).toBeLessThanOrEqual(50)
        expect(args.data).toEqual({ status: 'cancelled' })
      }
    },
  )
})

describe('operation versions at the HTTP boundary', () => {
  it('rejects missing versions and returns the latest record for stale saves', async () => {
    registration.operationVersion = 3
    registration.lastHandledName = 'Maria'
    const missing = { ...confirmation, expectedVersion: undefined }
    expect((await PATCH(request('PATCH', missing))).status).toBe(400)
    const response = await PATCH(request('PATCH', { ...confirmation, expectedVersion: 2 }))
    expect(response.status).toBe(409)
    expect((await response.json()).registration).toMatchObject({
      operationVersion: 3,
      lastHandledName: 'Maria',
    })
    expect(payload.update).not.toHaveBeenCalled()
  })
  it('never exposes the latest participant to an unauthorized user through a version conflict', async () => {
    payload.auth.mockResolvedValue({ user: { id: 'outsider', role: 'active' } })
    registration.operationVersion = 3
    const response = await PATCH(request('PATCH', confirmation))
    expect(response.status).toBe(403)
    expect(await response.json()).not.toHaveProperty('registration')
  })
  it('returns the fresh version when another device commits during the update', async () => {
    payload.update.mockImplementationOnce(async () => {
      registration = {
        ...registration,
        operationVersion: 2,
        lastHandledName: 'Maria',
        status: 'present',
        consumptionAmount: 40,
      }
      throw Object.assign(new Error('Alt membru a modificat înscrierea.'), { status: 409 })
    })
    const response = await PATCH(request('PATCH', confirmation))
    expect(response.status).toBe(409)
    expect((await response.json()).registration).toMatchObject({
      operationVersion: 2,
      lastHandledName: 'Maria',
      status: 'present',
      consumptionAmount: 40,
    })
  })
  it('validates malformed cancellation bodies', async () => {
    expect((await DELETE(request('DELETE', null))).status).toBe(400)
  })
})

const closingSlot = {
  day: 'day',
  slot: 'slot',
  capacity: 100,
  activeCount: 3,
  reservedPeople: 4,
  presentCount: 2,
  presentPeople: 3,
  pendingPeople: 1,
  absentCount: 0,
  donation: 30.15,
  consumptionAmount: 20.25,
  totalCollected: 50.4,
  legacyConsumptionCount: 0,
}
function closingHarness() {
  const state = {
    shift: null as Record<string, unknown> | null,
    closings: [] as Record<string, unknown>[],
    logs: [] as Record<string, unknown>[],
  }
  const p = {
    db: {
      collections: {
        events: {
          schema: { path: () => ({ cast: (id: string) => id }) },
          findOneAndUpdate: vi.fn(async () => ({ registrationRevision: 7 })),
          updateOne: vi.fn(async () => ({})),
        },
      },
    },
    find: vi.fn(async () => ({ docs: state.shift ? [state.shift] : [] })),
    findByID: vi.fn(
      async (_args: { collection: string }): Promise<Record<string, unknown>> => ({}),
    ),
    create: vi.fn(async ({ collection, data }) => {
      const doc = {
        ...data,
        id: `${collection}-${state.closings.length + 1}`,
        updatedAt: '2026-10-27T12:00:00Z',
      }
      if (collection === 'event-shifts') state.shift = doc
      if (collection === 'event-closings') state.closings.push(doc)
      if (collection === 'event-activity') state.logs.push(doc)
      return doc
    }),
    update: vi.fn(async ({ collection, data }) => {
      if (collection === 'event-shifts') state.shift = { ...state.shift, ...data }
      return { id: 'reg', ...data }
    }),
  }
  ops.summary.mockResolvedValue({ slots: [{ ...closingSlot }] })
  const user = { id: 'manager', name: 'Manager', role: 'president' }
  const body = {
    action: 'close-shift',
    day: 'day',
    slot: 'slot',
    snapshot: shiftSnapshotKey(closingSlot),
    countedAmount: '50.40',
  }
  const mutate = (changes = {}, asUser = user) =>
    mutateProjectOperation(p as never, event as never, asUser as never, { ...body, ...changes })
  return { state, p, user, body, mutate }
}

describe('shift closing, reopening, and undo', () => {
  it('stores exact cents in an immutable closing and appends an activity entry', async () => {
    const h = closingHarness()
    await h.mutate()
    expect(h.state.closings[0]).toMatchObject({
      donation: 30.15,
      consumptionAmount: 20.25,
      totalCollected: 50.4,
      countedAmount: 50.4,
      difference: 0,
      revision: 7,
    })
    expect(h.state.shift?.closing).toBe(h.state.closings[0].id)
    expect(h.state.logs[0].action).toBe('shift-close')
    expect(h.p.create.mock.calls.every(([args]) => args.req)).toBe(true)
  })
  it('requires an explanation for differences and preserves the signed difference', async () => {
    const h = closingHarness()
    await expect(h.mutate({ countedAmount: '50.39' })).rejects.toThrow('Scrie un motiv')
    await h.mutate({ countedAmount: '50.39', note: 'Diferență verificată de casier' })
    expect(h.state.closings[0].difference).toBe(-0.01)
  })
  it.each(['', null, '-1', '1.001', '1e2', 'Infinity', '1234567890123'])(
    'rejects invalid verified amount %s',
    async (countedAmount) => {
      const h = closingHarness()
      await expect(h.mutate({ countedAmount })).rejects.toThrow('maximum două zecimale')
      expect(h.state.closings).toHaveLength(0)
    },
  )
  it('requires acknowledgement and an explanation for unknown legacy consumption without backfilling it', async () => {
    const h = closingHarness(),
      legacy = { ...closingSlot, legacyConsumptionCount: 1 }
    ops.summary.mockResolvedValue({ slots: [legacy] })
    const body = { snapshot: shiftSnapshotKey(legacy) }
    await expect(h.mutate(body)).rejects.toThrow('istorice')
    await expect(h.mutate({ ...body, legacyAcknowledged: true })).rejects.toThrow('Scrie un motiv')
    await h.mutate({
      ...body,
      legacyAcknowledged: true,
      note: 'Registrul istoric a fost verificat',
    })
    expect(h.state.closings[0]).toMatchObject({
      legacyConsumptionCount: 1,
      consumptionAmount: 20.25,
    })
    expect(h.p.update).not.toHaveBeenCalled()
  })
  it('rejects a stale shift snapshot, and restricts closing to managers', async () => {
    const h = closingHarness()
    await expect(h.mutate({ snapshot: 'outdated' })).rejects.toThrow(
      'Totalurile turei s-au schimbat',
    )
    await expect(h.mutate({}, { ...h.user, role: 'active' })).rejects.toThrow('Doar un manager')
    expect(h.state.closings).toHaveLength(0)
  })
  it('reopens the exact closing with a reason, preserving the original snapshot', async () => {
    const h = closingHarness()
    await h.mutate()
    const original = structuredClone(h.state.closings[0])
    await expect(
      h.mutate({ action: 'reopen-shift', closingId: 'old', reason: 'Corectare registru' }),
    ).rejects.toThrow('s-a schimbat')
    await h.mutate({ action: 'reopen-shift', closingId: original.id, reason: 'Corectare registru' })
    expect(h.state.shift?.closing).toBeNull()
    expect(h.state.closings[0]).toEqual(original)
    expect(h.state.logs.at(-1)).toMatchObject({
      action: 'shift-reopen',
      reason: 'Corectare registru',
    })
  })
  it('protects handover notes from stale overwrites and roster changes by volunteers', async () => {
    const h = closingHarness()
    h.state.shift = { id: 'shift', members: ['volunteer'], updatedAt: 'latest' }
    await expect(
      h.mutate({ action: 'save-shift', expectedUpdatedAt: 'old', handoverNote: 'Notă' }),
    ).rejects.toThrow('actualizate')
    await expect(
      h.mutate(
        { action: 'save-shift', expectedUpdatedAt: 'latest', memberIds: [] },
        { ...h.user, id: 'volunteer', role: 'active' },
      ),
    ).rejects.toThrow('atribui echipa')
  })
  it('undoes only the latest registration version and retains legacy null values', async () => {
    const h = closingHarness()
    h.p.findByID.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'event-activity'
        ? {
            id: 'log',
            event: 'event',
            registration: 'reg',
            version: 2,
            before: {
              status: 'registered',
              donation: 15.25,
              consumptionAmount: null,
              ageGroup: null,
            },
          }
        : { id: 'reg', name: 'Ana', event: 'event', operationVersion: 3 },
    )
    await expect(
      h.mutate({ action: 'undo', activityId: 'log', reason: 'Confirmare greșită' }),
    ).rejects.toThrow('modificată ulterior')
    h.p.findByID.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'event-activity'
        ? {
            id: 'log',
            event: 'event',
            registration: 'reg',
            version: 2,
            before: {
              status: 'registered',
              donation: 15.25,
              consumptionAmount: null,
              ageGroup: null,
            },
          }
        : { id: 'reg', name: 'Ana', event: 'event', operationVersion: 2 },
    )
    await h.mutate({ action: 'undo', activityId: 'log', reason: 'Confirmare greșită' })
    expect(h.p.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          donation: 15.25,
          consumptionAmount: null,
          ageGroup: null,
          status: 'registered',
        }),
        req: expect.objectContaining({
          context: expect.objectContaining({
            eventOperationState: expect.objectContaining({ expectedVersion: 2, undoOf: 'log' }),
          }),
        }),
      }),
    )
  })
})

describe('private event data HTTP boundary', () => {
  const get = (query = '', headers = {}) =>
    projectData(
      new Request(`https://example.com/members/projects/data?eventId=event${query}`, { headers }),
    )
  it('uses conditional updates and skips page queries when the event has not changed', async () => {
    ops.query.mockResolvedValue({
      eventId: 'event',
      registrations: [],
      metrics: { presentCount: 250 },
    })
    ops.query.mockClear()
    const first = await get('&page=2&q=Ana&sort=participant&direction=descending')
    expect(first.status).toBe(200)
    expect(first.headers.get('Cache-Control')).toContain('no-store')
    const etag = first.headers.get('ETag')!
    const second = await get('&page=2&q=Ana&sort=participant&direction=descending', {
      'If-None-Match': etag,
    })
    expect(second.status).toBe(304)
    expect(ops.query).toHaveBeenCalledOnce()
    const otherPage = await get('&page=3&q=Ana&sort=participant&direction=descending', {
      'If-None-Match': etag,
    })
    expect(otherPage.status).toBe(200)
  })
  it('rejects unauthenticated, cross-site, and unrelated event readers', async () => {
    expect((await get('', { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
    payload.auth.mockResolvedValue({ user: null })
    expect((await get()).status).toBe(401)
    payload.auth.mockResolvedValue({ user: { id: 'outsider', role: 'active' } })
    expect((await get()).status).toBe(403)
  })
  it('scopes QR lookup by event instead of the visible page', async () => {
    payload.find.mockResolvedValue({ docs: [registration] })
    const response = await get('&registrationId=reg')
    expect(response.status).toBe(200)
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
        where: { and: [{ event: { equals: 'event' } }, { id: { equals: 'reg' } }] },
      }),
    )
    payload.find.mockResolvedValue({ docs: [] })
    expect((await get('&registrationId=foreign')).status).toBe(404)
  })
})
