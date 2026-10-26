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
    const result = await importParticipantsFromCSV({
      csv: [
        'name,phone,day,slot',
        'Ana,0712345678,2026-06-21,10:00-12:00',
        'Ion,0722345678,2026-06-21,10:00-12:00',
      ].join('\n'),
      event,
      payload: { create, find },
      user: null,
    })

    expect(result.errors).toEqual([])
    expect(result.created).toHaveLength(2)
    expect(find).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { eventRegistrationImport: true },
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
      'Lipsește coloana obligatorie "day".',
      'Lipsește coloana obligatorie "slot".',
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
