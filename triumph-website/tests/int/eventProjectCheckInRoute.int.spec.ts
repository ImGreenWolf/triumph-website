import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import { POST, PATCH, DELETE } from '@/app/(frontend)/members/projects/check-in/route'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

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
        expect.objectContaining({ context: { eventRegistrationWalkIn: true } }),
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
        request('PATCH', { registrationId: 'reg', status, donation: 0, consumptionAmount: 0 }),
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
    expect((await DELETE(request('DELETE', { registrationId: 'reg' }))).status).toBe(200)
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
