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

describe('registration database validation', () => {
  const hook = EventRegistrations.hooks!.beforeValidate![1]
  const event = {
    id: 'event-1',
    days: [
      {
        id: 'day-1',
        eventDate: '2026-06-21T00:00:00.000Z',
        slots: [{ id: 'slot-1', capacity: 2 }],
      },
    ],
  }
  const data = { event: event.id, day: 'day-1', slot: 'slot-1', email: 'ana@example.com' }
  function request(context: Record<string, unknown> = {}) {
    return {
      context,
      payload: {
        findByID: vi.fn().mockResolvedValue(event),
        find: vi.fn().mockResolvedValue({ docs: [] }),
        count: vi.fn().mockResolvedValue({ totalDocs: 1 }),
      },
    }
  }

  it('reuses trusted event data but keeps live checks within the row transaction', async () => {
    const req = request({
      eventRegistrationImport: true,
      eventRegistrationImportBatch: createRegistrationImportBatch(event, false),
    })
    await expect(hook({ data, operation: 'create', req } as never)).resolves.toEqual(data)
    expect(req.payload.findByID).not.toHaveBeenCalled()
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        depth: 0,
        limit: 1,
        pagination: false,
        select: { email: true },
      }),
    )
    expect(req.payload.count).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('does not trust serialized batch objects and rejects live capacity changes', async () => {
    const req = request({ eventRegistrationImport: true, eventRegistrationImportBatch: { event } })
    req.payload.count.mockResolvedValue({ totalDocs: 2 })
    await expect(hook({ data, operation: 'create', req } as never)).rejects.toThrow('este complet')
    expect(req.payload.findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('rejects a duplicate inserted after import preflight', async () => {
    const req = request({ eventRegistrationImport: true })
    req.payload.find.mockResolvedValue({ docs: [{ id: 'concurrent-registration' }] })
    await expect(hook({ data, operation: 'create', req } as never)).rejects.toThrow(
      'Te-ai înscris deja',
    )
    expect(req.payload.count).not.toHaveBeenCalled()
  })

  it('does not count occupancy for walk-ins, which may exceed capacity', async () => {
    const req = request({ eventRegistrationWalkIn: true })
    await expect(hook({ data, operation: 'create', req } as never)).resolves.toEqual(data)
    expect(req.payload.count).not.toHaveBeenCalled()
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
