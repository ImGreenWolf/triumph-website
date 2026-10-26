import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import { POST, PATCH, DELETE } from '@/app/(frontend)/members/projects/check-in/route'

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
