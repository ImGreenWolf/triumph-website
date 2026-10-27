import { describe, expect, it, vi } from 'vitest'

import { importParticipantsFromCSV, parseParticipantsCSV } from '@/collections/Events/bulkUpload'
import type { Event } from '@/payload-types'

const event = {
  days: [
    {
      eventDate: '2026-06-21T00:00:00.000Z',
      id: 'day-1',
      slots: [
        {
          endTime: '2026-06-21T09:00:00.000Z',
          id: 'slot-1',
          startTime: '2026-06-21T07:00:00.000Z',
        },
      ],
    },
  ],
  id: 'event-1',
} satisfies Pick<Event, 'days' | 'id'>

describe('participant CSV bulk upload parsing', () => {
  it.each([
    ['minor', 'minor'],
    ['adult', 'adult'],
    ['major', 'adult'],
    ['MAJOR', 'adult'],
  ])('accepts optional age category %s without changing donation semantics', (value, expected) => {
    const result = parseParticipantsCSV(
      `name,phone,day,slot,donation,ageGroup\nAna,,2026-06-21,10:00-12:00,50,${value}`,
      event,
    )
    expect(result.errors).toEqual([])
    expect(result.rows[0].data).toMatchObject({
      ageGroup: expected,
      donation: 50,
      status: 'present',
    })
    expect(result.rows[0].data.consumptionAmount).toBeUndefined()
  })

  it('allows blank age without inventing one and rejects unknown age categories', () => {
    const blank = parseParticipantsCSV(
      'name,phone,day,slot,ageGroup\nAna,,2026-06-21,10:00-12:00,',
      event,
    )
    expect(blank.errors).toEqual([])
    expect(blank.rows[0].data.ageGroup).toBeUndefined()
    const invalid = parseParticipantsCSV(
      'name,phone,day,slot,ageGroup\nAna,,2026-06-21,10:00-12:00,child',
      event,
    )
    expect(invalid.rows).toEqual([])
    expect(invalid.errors[0].message).toContain('minor, adult sau major')
  })
  it('parses valid participant rows and maps human-readable dates and slots', () => {
    const result = parseParticipantsCSV(
      [
        'name,email,phone,day,slot,questions',
        'Ana Popescu,ana@example.com,0712345678,2026-06-21,10:00-12:00,"Alergie, nuci"',
      ].join('\n'),
      event,
    )

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      data: {
        day: 'day-1',
        donation: 0,
        email: 'ana@example.com',
        event: 'event-1',
        name: 'Ana Popescu',
        phone: '0712345678',
        questions: 'Alergie, nuci',
        slot: 'slot-1',
        status: 'registered',
      },
      row: 2,
    })
  })

  it('accepts missing email and donation columns as an unconfirmed registration', () => {
    const result = parseParticipantsCSV(
      'name,phone,day,slot\nAna,0712345678,2026-06-21,10:00-12:00',
      event,
    )

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].data).toMatchObject({
      donation: 0,
      email: undefined,
      status: 'registered',
    })
  })

  it.each(['', '0', '  '])('leaves blank email and donation %j unconfirmed', (donation) => {
    const result = parseParticipantsCSV(
      `name,email,phone,day,slot,donation\nAna,,0712345678,2026-06-21,10:00-12:00,${donation}`,
      event,
    )

    expect(result.errors).toEqual([])
    expect(result.rows[0].data).toMatchObject({
      donation: 0,
      email: undefined,
      status: 'registered',
    })
  })

  it.each(['50', '25.50', '"25,50"'])(
    'marks donation %s as present without truncating it',
    (donation) => {
      const result = parseParticipantsCSV(
        `name,phone,day,slot,donation\nAna,0712345678,2026-06-21,10:00-12:00,${donation}`,
        event,
      )

      expect(result.errors).toEqual([])
      expect(result.rows[0].data.donation).toBe(donation === '50' ? 50 : 25.5)
      expect(result.rows[0].data.status).toBe('present')
    },
  )

  it.each(['abc', '-5', 'Infinity', '50 RON'])('rejects invalid donation %s', (donation) => {
    const result = parseParticipantsCSV(
      `name,phone,day,slot,donation\nAna,0712345678,2026-06-21,10:00-12:00,${donation}`,
      event,
    )

    expect(result.rows).toEqual([])
    expect(result.errors).toEqual([
      { message: 'Donația trebuie să fie un număr pozitiv sau zero.', row: 2 },
    ])
  })

  it('still validates an email when one is provided', () => {
    const result = parseParticipantsCSV(
      'name,email,phone,day,slot\nAna,invalid,0712345678,2026-06-21,10:00-12:00',
      event,
    )

    expect(result.rows).toEqual([])
    expect(result.errors).toEqual([{ message: 'Emailul nu este valid.', row: 2 }])
  })

  it('imports multiple participants without email or donation and skips email duplicate lookup', async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => ({ ...data, id: data.name }))
    const find = vi.fn()
    const count = vi.fn()
    const result = await importParticipantsFromCSV({
      csv: [
        'name,phone,day,slot',
        'Ana,0712345678,2026-06-21,10:00-12:00',
        'Ion,0722345678,2026-06-21,10:00-12:00',
      ].join('\n'),
      event,
      payload: { create, find, count },
      user: null,
    })

    expect(result.errors).toEqual([])
    expect(result.created).toHaveLength(2)
    expect(find).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ eventRegistrationImport: true }),
        data: expect.objectContaining({ donation: 0, status: 'registered' }),
      }),
    )
  })

  it('accepts Romanian aliases and semicolon delimiters', () => {
    const result = parseParticipantsCSV(
      [
        'nume;email;telefon;zi;tură;observații',
        'Ion Ionescu;ion@example.com;0722000000;2026-06-21;10.00–12.00;',
      ].join('\n'),
      event,
    )

    expect(result.errors).toEqual([])
    expect(result.rows[0].data.slot).toBe('slot-1')
  })

  it('reports missing columns, duplicates, and unknown shifts', () => {
    const missing = parseParticipantsCSV('name,email\nAna,ana@example.com', event)
    expect(missing.rows).toEqual([])
    expect(missing.errors.map((error) => error.message)).toEqual([
      'Lipsește coloana obligatorie "phone".',
    ])

    const invalid = parseParticipantsCSV(
      [
        'name,email,phone,day,slot',
        'Ana,ana@example.com,0700000000,2026-06-21,14:00-16:00',
        'Ana Doi,ana@example.com,0700000001,2026-06-21,10:00-12:00',
      ].join('\n'),
      event,
    )

    expect(invalid.rows).toHaveLength(0)
    expect(invalid.errors[0].message).toContain('nu există în ziua selectată')
    expect(invalid.errors[1].message).toContain('dublează rândul 2')
  })
})

const capacityEvent = {
  id: 'event-1',
  // Deliberately unsorted: automatic selection must use chronological order.
  days: [
    {
      id: 'day-2',
      eventDate: '2026-06-22T00:00:00.000Z',
      slots: [
        {
          id: 'slot-3',
          capacity: 1,
          startTime: '2026-06-22T07:00:00.000Z',
          endTime: '2026-06-22T09:00:00.000Z',
        },
      ],
    },
    {
      id: 'day-1',
      eventDate: '2026-06-21T00:00:00.000Z',
      slots: [
        {
          id: 'slot-2',
          capacity: 1,
          startTime: '2026-06-21T09:00:00.000Z',
          endTime: '2026-06-21T11:00:00.000Z',
        },
        {
          id: 'slot-1',
          capacity: 1,
          startTime: '2026-06-21T07:00:00.000Z',
          endTime: '2026-06-21T09:00:00.000Z',
        },
        {
          id: 'slot-zero',
          capacity: 0,
          startTime: '2026-06-21T06:00:00.000Z',
          endTime: '2026-06-21T07:00:00.000Z',
        },
      ],
    },
  ],
} satisfies Pick<Event, 'days' | 'id'>

function capacityPayload(initial: Array<Record<string, unknown>> = [], failedNames: string[] = []) {
  const stored = initial.map((row) => ({
    event: 'event-1',
    status: 'registered',
    ...row,
  })) as Array<Record<string, unknown>>
  const matches = (where: {
    and: Array<Record<string, { equals?: unknown; not_equals?: unknown; in?: unknown[] }>>
  }) =>
    stored.filter((row) =>
      where.and.every((condition) =>
        Object.entries(condition).every(([field, filter]) =>
          'equals' in filter
            ? row[field] === filter.equals
            : 'in' in filter
              ? filter.in!.includes(row[field])
              : row[field] !== filter.not_equals,
        ),
      ),
    )
  const find = vi
    .fn()
    .mockImplementation(async ({ where }) => ({
      docs: matches(where),
      totalDocs: matches(where).length,
    }))
  const count = vi
    .fn()
    .mockImplementation(async ({ where }) => ({ totalDocs: matches(where).length }))
  const create = vi.fn().mockImplementation(async ({ data }) => {
    if (failedNames.includes(data.name)) throw new Error('Participantul nu a putut fi salvat.')
    const created = { ...data, id: `created-${stored.length}` }
    stored.push(created)
    return created
  })
  return { payload: { create, find, count }, stored }
}

describe('participant CSV automatic slot assignment', () => {
  it.each([
    ['name,phone\nAna,', 'day-1', 'slot-1'],
    ['name,phone,day,slot\nAna,,,', 'day-1', 'slot-1'],
    ['name,phone,day\nAna,,2026-06-22', 'day-2', 'slot-3'],
    ['name,phone,slot\nAna,,12:00-14:00', 'day-1', 'slot-2'],
  ])('accepts omitted or blank day/slot in %s', (csv, day, slot) => {
    const parsed = parseParticipantsCSV(csv, capacityEvent)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows[0].data).toMatchObject({ day, slot, donation: 0, status: 'registered' })
    expect(parsed.rows[0].automaticSlots?.[0]).toMatchObject({ day, slot })
  })

  it('fills each slot in order, includes existing active registrations, and reports exhaustion', async () => {
    const { payload } = capacityPayload([{ day: 'day-1', slot: 'slot-1' }])
    const result = await importParticipantsFromCSV({
      csv: 'name,phone\nAna,\nIon,\nMara,',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.created).toHaveLength(2)
    expect(payload.create.mock.calls.map(([args]) => [args.data.day, args.data.slot])).toEqual([
      ['day-1', 'slot-2'],
      ['day-2', 'slot-3'],
    ])
    expect(result.errors).toEqual([
      { row: 4, message: expect.stringContaining('locuri disponibile') },
    ])
  })

  it('uses all three chronological slots in the same import without overfilling', async () => {
    const { payload } = capacityPayload()
    const result = await importParticipantsFromCSV({
      csv: 'name,phone\nAna,\nIon,\nMara,\nDan,',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.created).toHaveLength(3)
    expect(payload.create.mock.calls.map(([args]) => args.data.slot)).toEqual([
      'slot-1',
      'slot-2',
      'slot-3',
    ])
    expect(result.errors[0].row).toBe(5)
  })

  it('counts present and absent registrations but frees cancelled places and ignores other events', async () => {
    const { payload } = capacityPayload([
      { day: 'day-1', slot: 'slot-1', status: 'cancelled' },
      { day: 'day-1', slot: 'slot-1', event: 'another-event' },
      { day: 'day-1', slot: 'slot-2', status: 'present' },
      { day: 'day-2', slot: 'slot-3', status: 'absent' },
    ])
    const result = await importParticipantsFromCSV({
      csv: 'name,phone\nAna,\nIon,',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.created).toHaveLength(1)
    expect(payload.create.mock.calls[0][0].data.slot).toBe('slot-1')
    expect(result.errors[0].row).toBe(3)
  })

  it('respects the provided day and does not spill into another day', async () => {
    const { payload } = capacityPayload([{ day: 'day-2', slot: 'slot-3' }])
    const result = await importParticipantsFromCSV({
      csv: 'name,phone,day\nAna,,2026-06-22',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.created).toEqual([])
    expect(result.errors[0].message).toContain('locuri disponibile')
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('finds the first day with capacity for the provided time', async () => {
    const { payload } = capacityPayload([{ day: 'day-1', slot: 'slot-1' }])
    const result = await importParticipantsFromCSV({
      csv: 'name,phone,slot\nAna,,10:00-12:00',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.errors).toEqual([])
    expect(payload.create.mock.calls[0][0].data).toMatchObject({ day: 'day-2', slot: 'slot-3' })
  })

  it('does not reserve places for duplicate emails or failed writes', async () => {
    const { payload } = capacityPayload(
      [{ email: 'existing@example.com', day: 'day-2', slot: 'slot-3' }],
      ['Failed'],
    )
    const result = await importParticipantsFromCSV({
      csv: 'name,phone,email\nDuplicate,,existing@example.com\nFailed,,failed@example.com\nAna,,ana@example.com',
      event: capacityEvent,
      payload,
      user: null,
    })
    expect(result.skipped).toHaveLength(1)
    expect(result.errors).toEqual([{ row: 3, message: 'Participantul nu a putut fi salvat.' }])
    expect(result.created).toHaveLength(1)
    expect(payload.create.mock.calls.map(([args]) => args.data.slot)).toEqual(['slot-1', 'slot-1'])
  })

  it('rejects invalid explicit values instead of replacing them', () => {
    const invalidDay = parseParticipantsCSV('name,phone,day\nAna,,2026-01-01', capacityEvent)
    expect(invalidDay.rows).toEqual([])
    expect(invalidDay.errors[0].message).toContain('nu există în eveniment')
    const invalidSlot = parseParticipantsCSV('name,phone,slot\nAna,,19:00-20:00', capacityEvent)
    expect(invalidSlot.rows).toEqual([])
    expect(invalidSlot.errors[0].message).toContain('nu există în eveniment')
    const explicit = parseParticipantsCSV(
      'name,phone,day,slot\nAna,,2026-06-21,12:00-14:00',
      capacityEvent,
    )
    expect(explicit.rows[0].automaticSlots).toBeUndefined()
    expect(explicit.rows[0].data.slot).toBe('slot-2')
  })

  it('reports a row error for an event without configured places', () => {
    const result = parseParticipantsCSV('name,phone\nAna,', { id: 'empty', days: [] })
    expect(result.rows).toEqual([])
    expect(result.errors).toEqual([
      { row: 2, message: expect.stringContaining('locuri disponibile') },
    ])
  })
})

describe('bulk import query scaling', () => {
  it('batches 2,000 email lookups and reads automatic slot occupancy once', async () => {
    const largeEvent = {
      ...event,
      days: event.days.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({ ...slot, capacity: 2000 })),
      })),
    }
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      count: vi.fn().mockResolvedValue({ totalDocs: 0 }),
      create: vi.fn().mockImplementation(async ({ data }) => ({ ...data, id: data.email })),
    }
    const csv = [
      'name,phone,email',
      ...Array.from({ length: 2000 }, (_, i) => `Person ${i},,person${i}@example.com`),
    ].join('\n')
    const result = await importParticipantsFromCSV({ csv, event: largeEvent, payload, user: null })
    expect(result.created).toHaveLength(2000)
    expect(result.errors).toEqual([])
    expect(payload.find).toHaveBeenCalledTimes(4)
    expect(payload.count).toHaveBeenCalledOnce()
    expect(payload.create).toHaveBeenCalledTimes(2000)
    for (const [args] of payload.find.mock.calls) {
      expect(args).toMatchObject({ depth: 0, pagination: false, select: { email: true } })
      expect(args.where.and[1].email.in).toHaveLength(500)
    }
    for (const [args] of payload.create.mock.calls) {
      expect(args.depth).toBe(0)
      expect(args.disableTransaction).toBeUndefined()
      expect(args.req).toBeUndefined()
    }
  })

  it('does no database work when every CSV row is invalid', async () => {
    const { payload } = capacityPayload()
    const result = await importParticipantsFromCSV({
      csv: 'name,phone,email\nAna,,invalid',
      event,
      payload,
      user: null,
    })
    expect(result.errors).toHaveLength(1)
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.count).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })
})
