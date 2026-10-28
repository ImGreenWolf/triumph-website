import {
  guardRegistrationOperation,
  recordRegistrationOperation,
} from '@/collections/Events/operationHooks'
import {
  createEventOperationState,
  lockEvent,
  releaseEventOperation,
} from '@/utilities/eventOperationGuard'
import { defaultEventShift, shiftSnapshotKey } from '@/utilities/eventOperationsTypes'
import {
  checkInSearchPattern,
  checkInSearchTerms,
  getParticipantSearchPrefill,
  matchesCheckInSearch,
  normalizeCheckInSearch,
} from '@/utilities/eventCheckInSearch'
import {
  queryProjectPage,
  projectSummary,
  invalidateProjectIdentities,
} from '@/utilities/projectQueries'
import { describe, expect, it, vi } from 'vitest'
import { createRegistrationImportBatch } from '@/utilities/eventRegistrationImportContext'
import type { EventRegistration } from '@/payload-types'
import {
  getDuplicateRegistrationReasons,
  getDuplicateCleanupPlan,
  isDonationBelowMinimum,
} from '@/utilities/eventCheckInWarnings'

import {
  formatCompactEventDayLabel,
  formatEventDayLabel,
  formatEventSlotLabel,
  getEventSlotAvailability,
  getEventSlotRegistrationDeadline,
  isEventSlotRegistrationOpen,
  REGISTRATION_CUTOFF_MINUTES,
} from '@/utilities/eventRegistration'
import {
  EventRegistrations,
  eventRequiresMinimumsAcknowledgement,
  validateMinimumsAcknowledgement,
} from '@/collections/Events'

describe('registration age validation', () => {
  const hook = EventRegistrations.hooks!.beforeValidate![0]
  const validate = (
    data: Record<string, unknown>,
    operation = 'create',
    originalDoc = {},
    context = {},
  ) => hook({ data, operation, originalDoc, req: { context } } as never)

  it.each([undefined, null, '', 'major', 'child'])(
    'rejects missing/invalid age %s on new registrations',
    (ageGroup) => {
      expect(() => validate({ ageGroup })).toThrow('Selectează Minor')
    },
  )
  it.each(['minor', 'adult'])('accepts valid age %s', (ageGroup) => {
    expect(validate({ ageGroup })).toEqual({ ageGroup })
  })
  it('allows legacy status updates and CSV imports without assigning an age', () => {
    expect(validate({ status: 'absent' }, 'update')).toEqual({ status: 'absent' })
    expect(
      validate({ status: 'present' }, 'create', {}, { eventRegistrationImport: true }),
    ).toEqual({ status: 'present' })
    expect(() =>
      validate({ ageGroup: 'child' }, 'create', {}, { eventRegistrationImport: true }),
    ).toThrow()
  })
  it('requires age on attendance confirmation and preserves an existing age', () => {
    expect(() => validate({ status: 'present' }, 'update')).toThrow()
    expect(validate({ status: 'present' }, 'update', { ageGroup: 'adult' })).toEqual({
      status: 'present',
    })
  })
})

describe('event registration availability', () => {
  it('includes the year in full and compact event date labels', () => {
    const eventDate = localDate(2026, 5, 15, 12).toISOString()

    expect(formatEventDayLabel(eventDate)).toContain('2026')
    expect(formatCompactEventDayLabel(eventDate)).toContain('2026')
  })

  it('closes a timed slot at the file configured cutoff before its start time', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()
    const startTime = localDate(2026, 5, 15, 10).toISOString()
    const endTime = localDate(2026, 5, 15, 11).toISOString()
    const atCutoff = localDate(2026, 5, 15, 10)
    atCutoff.setMinutes(atCutoff.getMinutes() - REGISTRATION_CUTOFF_MINUTES)
    const beforeCutoff = new Date(atCutoff)
    beforeCutoff.setMinutes(beforeCutoff.getMinutes() - 1)

    expect(
      isEventSlotRegistrationOpen(
        {
          endTime,
          eventDate,
          startTime,
        },
        beforeCutoff,
      ),
    ).toBe(true)

    expect(
      isEventSlotRegistrationOpen(
        {
          endTime,
          eventDate,
          startTime,
        },
        atCutoff,
      ),
    ).toBe(false)
  })

  it('keeps later days in a multi-day event available after earlier slots close', () => {
    const firstDay = localDate(2026, 5, 15)
    const secondDay = localDate(2026, 5, 16)
    const availability = getEventSlotAvailability({
      event: {
        days: [
          {
            eventDate: firstDay.toISOString(),
            id: 'day-1',
            slots: [
              {
                capacity: 5,
                id: 'slot-1',
                startTime: localDate(2026, 5, 15, 10).toISOString(),
              },
            ],
          },
          {
            eventDate: secondDay.toISOString(),
            id: 'day-2',
            slots: [
              {
                capacity: 5,
                id: 'slot-2',
                startTime: localDate(2026, 5, 16, 10).toISOString(),
              },
            ],
          },
        ],
      },
      now: localDate(2026, 5, 15, 12),
      registrations: [],
    })

    expect(availability).toHaveLength(2)
    expect(availability.find((slot) => slot.dayId === 'day-1')?.isAvailable).toBe(false)
    expect(availability.find((slot) => slot.dayId === 'day-2')?.isAvailable).toBe(true)
  })

  it('keeps an untimed slot open through the end of its event day', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()

    expect(
      isEventSlotRegistrationOpen(
        {
          eventDate,
        },
        localDate(2026, 5, 15, 20),
      ),
    ).toBe(true)

    expect(
      isEventSlotRegistrationOpen(
        {
          eventDate,
        },
        localDate(2026, 5, 16),
      ),
    ).toBe(false)
  })

  it('renders an interval with no fixed end as its start time only', () => {
    const startTime = localDate(2026, 5, 15, 18, 30).toISOString()

    expect(formatEventSlotLabel(startTime, null)).toBe('18:30')
  })

  it('uses the start time as the deadline for an interval with no fixed end', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()
    const startTime = localDate(2026, 5, 15, 18, 30).toISOString()
    const beforeStart = localDate(2026, 5, 15, 18, 29)
    const atStart = localDate(2026, 5, 15, 18, 30)

    expect(getEventSlotRegistrationDeadline({ eventDate, startTime, endTime: null })).toEqual(
      atStart,
    )
    expect(isEventSlotRegistrationOpen({ eventDate, startTime, endTime: null }, beforeStart)).toBe(
      true,
    )
    expect(isEventSlotRegistrationOpen({ eventDate, startTime, endTime: null }, atStart)).toBe(
      false,
    )
  })

  it('requires public acknowledgement when an event has minimum donation or consumation', () => {
    const minimumDonationEvent = {
      donation: '50',
      minimumConsumation: null,
    }
    const minimumConsumationEvent = {
      donation: null,
      minimumConsumation: 25,
    }
    const freeEvent = {
      donation: '',
      minimumConsumation: 0,
    }

    expect(eventRequiresMinimumsAcknowledgement(minimumDonationEvent)).toBe(true)
    expect(eventRequiresMinimumsAcknowledgement(minimumConsumationEvent)).toBe(true)
    expect(eventRequiresMinimumsAcknowledgement(freeEvent)).toBe(false)
    expect(validateMinimumsAcknowledgement(minimumDonationEvent, false)).toBe(false)
    expect(validateMinimumsAcknowledgement(minimumDonationEvent, true)).toBe(true)
    expect(validateMinimumsAcknowledgement(freeEvent, false)).toBe(true)
  })
})

function localDate(year: number, monthIndex: number, day: number, hours = 0, minutes = 0) {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0)
}

describe('check-in row warnings', () => {
  function participant(id: string, values: Partial<EventRegistration> = {}) {
    return {
      id,
      name: `Participant ${id}`,
      email: null,
      phone: null,
      status: 'registered' as const,
      ...values,
    }
  }

  it('flags all active matches for a normalized email', () => {
    const warnings = getDuplicateRegistrationReasons([
      participant('a', { email: ' ANA@example.com ' }),
      participant('b', { email: 'ana@example.com', status: 'present' }),
      participant('c', { email: 'ana@example.com', status: 'absent' }),
    ])
    expect([...warnings.keys()]).toEqual(['a', 'b', 'c'])
    expect(warnings.get('a')).toEqual(['Aceeași adresă de email'])
  })

  it('matches phone formatting and Romanian local/international prefixes', () => {
    const warnings = getDuplicateRegistrationReasons([
      participant('a', { phone: '0712 345 678' }),
      participant('b', { phone: '+40 (712) 345-678' }),
      participant('c', { phone: '0040712345678' }),
    ])
    expect([...warnings.keys()]).toEqual(['a', 'b', 'c'])
    expect(warnings.get('b')).toEqual(['Același număr de telefon'])
  })

  it('uses a full-name match only for participants without either contact', () => {
    const warnings = getDuplicateRegistrationReasons([
      participant('a', { name: ' Ana   Popescu ' }),
      participant('b', { name: 'ana popescu', email: '', phone: ' ' }),
      participant('c', { name: 'Ana Popescu', email: 'ana@example.com' }),
      participant('d', { name: 'Ana Popescu', phone: '0712345678' }),
      participant('e', { name: '' }),
      participant('f', { name: '  ' }),
    ])
    expect([...warnings.keys()]).toEqual(['a', 'b'])
    expect(warnings.get('a')).toEqual(['Același nume, fără date de contact'])
  })

  it('does not count cancelled records or a repeated instance of the same ID', () => {
    const first = participant('a', { email: 'ana@example.com' })
    expect(
      getDuplicateRegistrationReasons([
        first,
        first,
        participant('b', { email: 'ana@example.com', status: 'cancelled' }),
      ]).size,
    ).toBe(0)
  })

  it('can describe both shared contacts without exposing the contact values', () => {
    const warnings = getDuplicateRegistrationReasons([
      participant('a', { email: 'ana@example.com', phone: '0712345678' }),
      participant('b', { email: 'ana@example.com', phone: '0712345678' }),
    ])
    expect(warnings.get('a')).toEqual(['Aceeași adresă de email', 'Același număr de telefon'])
  })

  it.each(['registered', 'absent', 'cancelled'] as const)(
    'does not flag a low donation for a participant with status %s',
    (status) => {
      expect(isDonationBelowMinimum({ status, donation: 0, guests: 2 }, 30)).toBe(false)
    },
  )

  it('flags checked-in participants using per-person minimums, including companions', () => {
    expect(isDonationBelowMinimum({ status: 'present', donation: 0, guests: 0 }, 30)).toBe(true)
    expect(isDonationBelowMinimum({ status: 'present', donation: 59.99, guests: 1 }, 30)).toBe(true)
    expect(isDonationBelowMinimum({ status: 'present', donation: 60, guests: 1 }, 30)).toBe(false)
    expect(isDonationBelowMinimum({ status: 'present', donation: 0, guests: 0 }, 0)).toBe(false)
    expect(isDonationBelowMinimum({ status: 'present', donation: 0.3, guests: 2 }, 0.1)).toBe(false)
    expect(isDonationBelowMinimum({ status: 'present', donation: 0.29, guests: 2 }, 0.1)).toBe(true)
  })
})

describe('duplicate cleanup planning', () => {
  const row = (id: string, values: Partial<EventRegistration> = {}) => ({
    id,
    name: id,
    email: 'ana@example.com',
    phone: '',
    status: 'registered' as const,
    donation: 0,
    consumptionAmount: null,
    timeOfArrival: null,
    createdAt: '2026-01-01',
    ...values,
  })
  it('keeps the oldest unpaid record, independent of input order', () => {
    expect(
      getDuplicateCleanupPlan([
        row('new', { createdAt: '2026-02-01' }),
        row('old'),
        row('cancelled', { status: 'cancelled' }),
      ]),
    ).toEqual({
      removals: [{ id: 'new', keepId: 'old' }],
      protectedCount: 0,
      remainingDuplicateCount: 0,
    })
  })
  it.each([
    { status: 'present' as const },
    { donation: 10 },
    { consumptionAmount: 20 },
    { timeOfArrival: '2026-02-01' },
  ])('keeps a protected record %j even if it is newer', (values) => {
    const result = getDuplicateCleanupPlan([
      row('old'),
      row('protected', { createdAt: '2026-02-01', ...values }),
    ])
    expect(result.removals).toEqual([{ id: 'old', keepId: 'protected' }])
    expect(result.protectedCount).toBe(1)
  })
  it('keeps both paid records and leaves their warning for manual review', () => {
    expect(
      getDuplicateCleanupPlan([
        row('a', { donation: 30 }),
        row('b', { consumptionAmount: 20 }),
        row('c'),
      ]),
    ).toEqual({
      removals: [{ id: 'c', keepId: 'a' }],
      protectedCount: 2,
      remainingDuplicateCount: 2,
    })
  })
  it('does not remove a record through a contact held only by another removed row', () => {
    const result = getDuplicateCleanupPlan([
      row('a'),
      row('b', { phone: '0712345678' }),
      row('c', { email: 'different@example.com', phone: '+40712345678' }),
    ])
    expect(result.removals).toEqual([{ id: 'b', keepId: 'a' }])
    expect(result.remainingDuplicateCount).toBe(0)
  })
  it('uses name fallback only without contacts and is stable for equal dates', () => {
    const a = row('a', { email: '', name: ' Ana   Popescu ' })
    expect(
      getDuplicateCleanupPlan([
        row('c', { name: 'Ana Popescu' }),
        row('b', { email: '', name: 'ana popescu' }),
        a,
        a,
      ]).removals,
    ).toEqual([{ id: 'b', keepId: 'a' }])
  })
})

function operationHarness() {
  const event = {
    id: 'event-ops',
    donation: '30',
    days: [{ id: 'day', eventDate: '2099-06-21', slots: [{ id: 'slot', capacity: 4 }] }],
  }
  let stored = {
    registrationRevision: 0,
    registrationIdentityRevision: 0,
    registrationLastToken: undefined as string | undefined,
  }
  let leased = false
  const rows: Array<Record<string, unknown>> = []
  const eventModel = {
    schema: { path: () => ({ cast: (id: string) => id }) },
    findOneAndUpdate: vi.fn(async (_where, update, _options) => {
      if (leased) return null
      leased = true
      const previous = { ...stored }
      stored = {
        registrationRevision: stored.registrationRevision + 1,
        registrationIdentityRevision:
          stored.registrationIdentityRevision + (update.$inc.registrationIdentityRevision || 0),
        registrationLastToken: update.$set.registrationLockToken,
      }
      return previous
    }),
    updateOne: vi.fn(async () => {
      leased = false
    }),
  }
  const payload = {
    db: { collections: { events: eventModel }, sessions: { tx: { test: 'session' } } },
    findByID: vi.fn(async ({ collection, id }) =>
      collection === 'events' ? event : rows.find((row) => row.id === id),
    ),
    find: vi.fn(async ({ collection, select }) => ({
      docs:
        collection === 'event-shifts' ? [] : select?.email ? rows.filter((row) => row.email) : rows,
    })),
    create: vi.fn(async ({ data }) => data),
  }
  const request = (context: Record<string, unknown> = {}) => ({
    payload,
    context,
    user: { id: 'manager', role: 'president', name: 'Manager' },
    transactionID: 'tx',
  })
  const data = {
    event: event.id,
    day: 'day',
    slot: 'slot',
    name: 'Ana',
    guests: 0,
    status: 'registered',
    donation: 0,
  }
  return { event, rows, eventModel, payload, request, data }
}

describe('serialized registration capacity and history', () => {
  it.each([
    ['walk-in', { eventRegistrationWalkIn: true }],
    ['import', { eventRegistrationImport: true }],
    ['signup', {}],
  ])('accepts Payload empty originalDoc on a new %s registration', async (action, context) => {
    const h = operationHarness(),
      req = h.request(context)
    const changed = await guardRegistrationOperation({
      data: { ...h.data },
      operation: 'create',
      originalDoc: {},
      req,
    } as never)
    expect(changed).toMatchObject({ operationVersion: 1 })
    expect(h.payload.findByID.mock.calls.every(([args]) => args.collection === 'events')).toBe(true)
    await recordRegistrationOperation({
      doc: { ...h.data, ...changed, id: 'new-registration' },
      req,
    } as never)
    expect(h.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action, before: undefined, version: 1 }),
      }),
    )
  })
  it('treats a duplicated document as a new registration instead of an event move', async () => {
    const h = operationHarness()
    const changed = await guardRegistrationOperation({
      data: { ...h.data },
      operation: 'create',
      originalDoc: { ...h.data, id: 'source', event: 'another-event', operationVersion: 12 },
      req: h.request(),
    } as never)
    expect(changed).toMatchObject({ operationVersion: 1 })
  })
  it('still rejects moving an existing registration to another event', async () => {
    const h = operationHarness()
    await expect(
      guardRegistrationOperation({
        data: { event: 'another-event' },
        operation: 'update',
        originalDoc: { ...h.data, id: 'existing' },
        req: h.request(),
      } as never),
    ).rejects.toThrow('Mutarea între evenimente')
    expect(h.eventModel.findOneAndUpdate).not.toHaveBeenCalled()
  })
  it('counts companions and rejects group overflow for public signups and walk-ins', async () => {
    for (const context of [{}, { eventRegistrationWalkIn: true }]) {
      const h = operationHarness()
      h.rows.push({ id: 'existing', guests: 2, status: 'present' })
      await expect(
        guardRegistrationOperation({
          data: { ...h.data, guests: 1 },
          operation: 'create',
          req: h.request(context),
        } as never),
      ).rejects.toThrow('Capacitatea turei este de 4 persoane')
    }
  })
  it('records manager override reasons and refuses volunteer overrides', async () => {
    for (const role of ['president', 'active']) {
      const h = operationHarness()
      h.rows.push({ guests: 3 })
      const state = createEventOperationState()
      state.capacityOverrideReason = 'Locuri suplimentare aprobate'
      const req = h.request({ eventOperationState: state })
      req.user.role = role
      const result = guardRegistrationOperation({ data: h.data, operation: 'create', req } as never)
      if (role === 'active') await expect(result).rejects.toThrow('Doar un manager')
      else {
        await result
        expect(state.reason).toContain('Locuri suplimentare aprobate')
        expect(state.capacity?.people).toBe(5)
      }
    }
  })
  it('checks companion increases against reserved people, but permits payment updates at existing capacity', async () => {
    for (const guests of [1, 2]) {
      const h = operationHarness()
      const original = { ...h.data, id: 'reg', guests: 1, operationVersion: 2 }
      h.rows.push(original, { guests: 1 })
      const result = guardRegistrationOperation({
        data: { guests },
        originalDoc: original,
        operation: 'update',
        req: h.request(),
      } as never)
      if (guests === 2) await expect(result).rejects.toThrow('Capacitatea')
      else expect(await result).toMatchObject({ operationVersion: 3 })
    }
  })
  it('rejects stale versions, including a commit between original read and lock acquisition', async () => {
    for (const expected of [0, 1]) {
      const h = operationHarness()
      const original = { ...h.data, id: 'reg', operationVersion: 1 }
      h.rows.push({ ...original, operationVersion: 2 })
      const state = createEventOperationState()
      state.expectedVersion = expected
      await expect(
        guardRegistrationOperation({
          data: { status: 'present' },
          originalDoc: original,
          operation: 'update',
          req: h.request({ eventOperationState: state }),
        } as never),
      ).rejects.toThrow('Alt membru')
    }
  })
  it('serializes competing requests and shares the lock within a bulk operation', async () => {
    const h = operationHarness(),
      req = h.request()
    const [a, b] = await Promise.all([
      lockEvent(req as never, h.event.id),
      lockEvent(req as never, h.event.id),
    ])
    expect(a).toBe(b)
    expect(h.eventModel.findOneAndUpdate).toHaveBeenCalledOnce()
    await expect(lockEvent(h.request() as never, h.event.id)).rejects.toThrow('Alt membru')
    await releaseEventOperation(h.payload as never, a, req as never)
    await expect(lockEvent(h.request() as never, h.event.id)).resolves.toMatchObject({
      revision: 2,
    })
    expect(h.eventModel.findOneAndUpdate.mock.calls[0][2]).toMatchObject({
      session: { test: 'session' },
    })
  })
  it('never releases the write lock during nested reads', async () => {
    const h = operationHarness(),
      req = h.request()
    await lockEvent(req as never, h.event.id)
    const hook = EventRegistrations.hooks!.afterOperation![0]
    await hook({ operation: 'findByID', result: {}, req } as never)
    expect(h.eventModel.updateOne).not.toHaveBeenCalled()
    await hook({ operation: 'updateByID', result: {}, req } as never)
    expect(h.eventModel.updateOne).toHaveBeenCalledOnce()
  })
  it('blocks writes to closed shifts and rejects a duplicate inserted after CSV preflight', async () => {
    for (const closed of [true, false]) {
      const h = operationHarness()
      h.payload.find.mockImplementation(
        async ({ collection }) =>
          ({
            docs:
              collection === 'event-shifts'
                ? closed
                  ? [{ closing: 'snapshot' }]
                  : []
                : [{ email: 'ana@example.com', guests: 0 }],
          }) as never,
      )
      await expect(
        guardRegistrationOperation({
          data: { ...h.data, email: 'ana@example.com' },
          operation: 'create',
          req: h.request({ eventRegistrationImport: true }),
        } as never),
      ).rejects.toThrow(closed ? 'Tura este închisă' : 'Te-ai înscris deja')
    }
  })
  it('stores complete audit snapshots even when a bulk mutation projects only status', async () => {
    const h = operationHarness()
    const original = {
      ...h.data,
      id: 'reg',
      operationVersion: 0,
      donation: 15.25,
      consumptionAmount: null,
    }
    h.rows.push(original)
    const req = h.request()
    const changed = await guardRegistrationOperation({
      data: { status: 'cancelled' },
      originalDoc: original,
      operation: 'update',
      req,
    } as never)
    await recordRegistrationOperation({ doc: { id: 'reg', status: 'cancelled' }, req } as never)
    expect(changed).toMatchObject({ operationVersion: 1 })
    expect(h.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        data: expect.objectContaining({
          event: h.event.id,
          actorName: 'Manager',
          version: 1,
          before: expect.objectContaining({ donation: 15.25 }),
          after: expect.objectContaining({
            donation: 15.25,
            consumptionAmount: null,
            status: 'cancelled',
          }),
        }),
      }),
    )
  })
  it.each([-1, 1.5, 51])(
    'rejects invalid companion count %s at the collection boundary',
    async (guests) => {
      const h = operationHarness()
      await expect(
        guardRegistrationOperation({
          data: { ...h.data, guests },
          operation: 'create',
          req: h.request(),
        } as never),
      ).rejects.toThrow('însoțitori')
    },
  )
  it('reuses bulk capacity and closed-shift checks only while the committed token matches', async () => {
    const h = operationHarness()
    h.event.days[0].slots[0].capacity = 2000
    const batch = createRegistrationImportBatch(h.event, true)
    for (let index = 0; index < 2000; index++) {
      const state = createEventOperationState(),
        req = h.request({
          eventRegistrationImport: true,
          eventRegistrationImportBatch: batch,
          eventOperationState: state,
        })
      await guardRegistrationOperation({ data: h.data, operation: 'create', req } as never)
      batch.capacityState.token = state.token
      batch.capacityState.counts.set(state.capacity!.key, state.capacity!.people)
      await releaseEventOperation(h.payload as never, state, req as never)
    }
    expect(h.payload.findByID).not.toHaveBeenCalled()
    expect(h.payload.find).toHaveBeenCalledTimes(2)
    expect(batch.capacityState.counts.get(JSON.stringify(['day', 'slot']))).toBe(2000)
    expect(h.eventModel.findOneAndUpdate).toHaveBeenCalledTimes(2000)
  })
})

describe('server event pages and global totals', () => {
  function queryHarness() {
    const h = operationHarness()
    const aggregate = vi.fn(async (pipeline: Array<Record<string, unknown>>) =>
      pipeline.some((stage) => stage.$facet)
        ? [
            {
              docs: [
                {
                  _id: 'reg',
                  name: 'Ana',
                  day: 'day',
                  slot: 'slot',
                  donation: 30.15,
                  consumptionAmount: null,
                  operationVersion: 2,
                },
              ],
              total: [{ count: 201 }],
            },
          ]
        : pipeline.some((stage) => stage.$group)
          ? [
              {
                _id: { day: 'day', slot: 'slot' },
                activeCount: 201,
                reservedPeople: 220,
                presentCount: 100,
                presentPeople: 110,
                pendingPeople: 110,
                pendingCount: 101,
                absentCount: 0,
                donationBani: 3015,
                consumptionBani: 2025,
                legacyConsumptionCount: 1,
                missingDonations: 0,
              },
            ]
          : [],
    )
    const model = {
      schema: { path: () => ({ cast: (id: string) => id }) },
      aggregate: (pipeline: Array<Record<string, unknown>>) => ({
        collation: () => ({
          session() {
            return this
          },
          exec: () => aggregate(pipeline),
        }),
      }),
    }
    Object.assign(h.payload.db.collections, { 'event-registrations': model })
    invalidateProjectIdentities(h.event.id)
    return { ...h, aggregate }
  }
  it('paginates at 100 on the server and retains complete event totals', async () => {
    const h = queryHarness(),
      params = new URLSearchParams({
        page: '2',
        q: 'Ana[',
        shift: 'day:slot',
        sort: 'group',
        direction: 'descending',
      })
    const result = await queryProjectPage(
      h.payload as never,
      h.event as never,
      h.request().user as never,
      params,
    )
    expect(result).toMatchObject({
      page: 2,
      totalDocs: 201,
      totalPages: 3,
      metrics: {
        activeCount: 201,
        peoplePresent: 110,
        activePeople: 220,
        funds: 30.15,
        consumptionAmount: 20.25,
        totalCollected: 50.4,
        legacyConsumptionCount: 1,
      },
    })
    const pagePipeline = h.aggregate.mock.calls.find(([stages]) =>
      stages.some((stage) => stage.$facet),
    )![0]
    expect(pagePipeline).toContainEqual({ $sort: { _people: -1, _id: 1 } })
    expect(pagePipeline.find((stage) => stage.$facet)).toMatchObject({
      $facet: { docs: [{ $skip: 100 }, { $limit: 100 }, expect.any(Object)] },
    })
    expect(pagePipeline[0]).toMatchObject({
      $match: {
        event: h.event.id,
        day: 'day',
        slot: 'slot',
        $and: [
          {
            $or: [
              { name: { $regex: expect.any(String), $options: 'i' } },
              expect.any(Object),
              expect.any(Object),
            ],
          },
        ],
      },
    })
    const searchStage = pagePipeline[0] as {
      $match: { $and: { $or: { name: { $regex: string } }[] }[] }
    }
    const pattern = new RegExp(searchStage.$match.$and[0]!.$or[0]!.name.$regex, 'i')
    expect(pattern.test('Ănâ[')).toBe(true)
    expect(pattern.test('Ana without bracket')).toBe(false)
    const summary = h.aggregate.mock.calls.find(([stages]) =>
      stages.some((stage) => stage.$group),
    )![0]
    expect(summary[0]).toEqual({ $match: { event: h.event.id, status: { $ne: 'cancelled' } } })
    expect(result.registrations[0]).toMatchObject({ operationVersion: 2, consumptionAmount: null })
  })
  it('requires every name word in the database query, independent of order', async () => {
    const h = queryHarness()
    await queryProjectPage(
      h.payload as never,
      h.event as never,
      h.request().user as never,
      new URLSearchParams({ q: '  Țiriac   ȘTEFAN  ' }),
    )
    const stage = h.aggregate.mock.calls[0]![0][0] as {
      $match: { $and: { $or: { name: { $regex: string } }[] }[] }
    }
    const clauses = stage.$match.$and
    expect(clauses).toHaveLength(2)
    for (const name of ['Ștefan Țiriac', 'Țiriac Ștefan', 'Ștefan Mihai Țiriac'])
      expect(
        clauses.every((clause) => new RegExp(clause.$or[0]!.name.$regex, 'i').test(name)),
      ).toBe(true)
    for (const name of ['Ștefan Popescu', 'Ana Țiriac'])
      expect(
        clauses.every((clause) => new RegExp(clause.$or[0]!.name.$regex, 'i').test(name)),
      ).toBe(false)
  })
  it('queries donation warnings only for checked-in registrations and caches projected identities', async () => {
    const h = queryHarness()
    h.rows.push(
      { id: 'duplicate1', name: 'Ana', email: 'ana@example.com' },
      { id: 'duplicate2', name: 'Ana', email: 'ana@example.com' },
    )
    await queryProjectPage(
      h.payload as never,
      h.event as never,
      h.request().user as never,
      new URLSearchParams({ status: 'warnings' }),
    )
    const match = h.aggregate.mock.calls[0][0][0] as { $match: { $or: unknown[] } }
    expect(match.$match.$or[0]).toEqual({ _id: { $in: ['duplicate1', 'duplicate2'] } })
    expect(JSON.stringify(match.$match.$or[1])).toContain('"$eq":["$status","present"]')
    h.payload.find.mockClear()
    await queryProjectPage(
      h.payload as never,
      h.event as never,
      h.request().user as never,
      new URLSearchParams(),
    )
    expect(
      h.payload.find.mock.calls.every(([args]) => args.collection !== 'event-registrations'),
    ).toBe(true)
    await queryProjectPage(
      h.payload as never,
      { ...h.event, registrationIdentityRevision: 1 } as never,
      h.request().user as never,
      new URLSearchParams(),
    )
    expect(h.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'event-registrations',
        select: { name: true, email: true, phone: true, status: true },
      }),
    )
  })
  it('selects the active shift, then next shift, and uses a signature of this shift only', () => {
    const days = [
      {
        id: 'day',
        eventDate: '2026-10-27',
        slots: [
          { id: 'one', startTime: '2026-10-27T10:00:00Z', endTime: '2026-10-27T12:00:00Z' },
          { id: 'two', startTime: '2026-10-27T12:00:00Z', endTime: '2026-10-27T14:00:00Z' },
        ],
      },
    ]
    expect(defaultEventShift({ days } as never, Date.parse('2026-10-27T11:00:00Z'))).toBe('day:one')
    expect(defaultEventShift({ days } as never, Date.parse('2026-10-27T09:00:00Z'))).toBe('day:one')
    expect(defaultEventShift({ days } as never, Date.parse('2026-10-27T12:00:00Z'))).toBe('day:two')
  })
})

describe('Romanian check-in search', () => {
  it.each([
    [' Ștefan Țiriac ', { name: 'Ștefan Țiriac', email: '', phone: '' }],
    ['Ana-Maria O’Neill', { name: 'Ana-Maria O’Neill', email: '', phone: '' }],
    ['S\u0326tefan Popescu', { name: 'S\u0326tefan Popescu', email: '', phone: '' }],
    [
      ' Ana.Popescu+event@Example.ro ',
      { name: '', email: 'Ana.Popescu+event@Example.ro', phone: '' },
    ],
    ['0721 234 567', { name: '', email: '', phone: '0721 234 567' }],
    [' +40 (721) 234-567 ', { name: '', email: '', phone: '+40 (721) 234-567' }],
    ['0040-721-234-567', { name: '', email: '', phone: '0040-721-234-567' }],
  ])('prefills the appropriate participant field from %s', (query, expected) => {
    expect(getParticipantSearchPrefill(query)).toEqual(expected)
  })
  it.each([
    '',
    '   ',
    'Ana ana@example.com',
    'ana@',
    '@example.ro',
    '123',
    '42.50',
    '+40 Alice',
    'https://example.com',
  ])('leaves ambiguous search %s blank for manual entry', (query) => {
    expect(getParticipantSearchPrefill(query)).toEqual({ name: '', email: '', phone: '' })
  })
  it.each([
    ['popescu ana', 'Ana Popescu'],
    ['ANA POPESCU', 'Popescu Ana'],
    ['tiriac stefan', 'Ștefan Mihai Țiriac'],
    ['  Ţiriac\t ȘTEFAN  ', 'Ștefan Țiriac'],
    ['pop ana', 'Ana Popescu'],
    ['ana ana', 'Ana Popescu'],
  ])('matches all words in %s against %s in any order', (query, name) => {
    expect(matchesCheckInSearch([name], checkInSearchTerms(query))).toBe(true)
  })
  it('requires all terms and supports contact searches alongside names', () => {
    const values = ['Ana Popescu', 'ana@example.com', '+40 712 345 678']
    expect(matchesCheckInSearch(values, checkInSearchTerms('popescu missing'))).toBe(false)
    expect(matchesCheckInSearch(values, checkInSearchTerms('ana @example.com 712'))).toBe(true)
    expect(matchesCheckInSearch(values, checkInSearchTerms('  '))).toBe(true)
  })
  it.each([
    ['stefan', 'Ștefan'],
    ['ȘTEFAN', 'Stefan'],
    ['Ştefan', 'Ștefan'],
    ['tudor tiriac', 'Tudor Țiriac'],
    ['Țiriac', 'Tiriac'],
    ['ţiriac', 'Țiriac'],
    ['calin', 'Călin'],
    ['CĂLIN', 'Calin'],
    ['parvu', 'Pârvu'],
    ['Pârvu', 'Parvu'],
    ['marian', 'Marîan'],
    ['Marîan', 'Marian'],
    ['stefan', 'S\u0326tefan'],
    ['S\u0327tefan', 'Ștefan'],
    ['calin', 'Ca\u0306lin'],
  ])('matches %s against %s locally and in the database pattern', (query, name) => {
    expect(normalizeCheckInSearch(name).includes(normalizeCheckInSearch(query))).toBe(true)
    expect(new RegExp(checkInSearchPattern(query), 'i').test(name)).toBe(true)
  })
  it.each([
    '[Ana]',
    'Ștefan (VIP)',
    'ana+checkin@example.com',
    '+40 712 345 678',
    '.*',
    '$^',
    'a|b',
    '\\',
  ])('treats punctuation in %s literally', (query) => {
    const pattern = new RegExp(`^${checkInSearchPattern(query)}$`, 'i')
    expect(pattern.test(query)).toBe(true)
    expect(pattern.test('Unrelated participant')).toBe(false)
  })
  it('keeps partial matching and distinguishes different letters', () => {
    expect(new RegExp(checkInSearchPattern('stefan'), 'i').test('Ștefania')).toBe(true)
    expect(new RegExp(checkInSearchPattern('stefan'), 'i').test('Stevan')).toBe(false)
  })
})
