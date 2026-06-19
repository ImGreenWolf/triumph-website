import { describe, expect, it } from 'vitest'

import { parseParticipantsCSV } from '@/collections/Events/bulkUpload'
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
