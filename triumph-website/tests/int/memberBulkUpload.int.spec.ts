import { describe, expect, it } from 'vitest'

import { parseMembersCSV } from '@/collections/Users/bulkUpload'

describe('member CSV bulk upload parsing', () => {
  it('parses valid member rows', () => {
    const result = parseMembersCSV(
      [
        'email,password,name,phone,status,join date,birthday',
        'ana@example.com,secret123,Ana Popescu,+40 712 345 678,active,02/2026,2006-02-03',
      ].join('\n'),
      { now: new Date('2026-06-16T00:00:00.000Z') },
    )

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].data).toMatchObject({
      birthday: '2006-02-03T00:00:00.000Z',
      birthdayConfirmed: true,
      email: 'ana@example.com',
      joinedAt: '2026-02-15T00:00:00.000Z',
      name: 'Ana Popescu',
      password: 'secret123',
      phone: '+40 712 345 678',
      role: 'active',
    })
  })

  it('reports missing required headers', () => {
    const result = parseMembersCSV('name\nAna')

    expect(result.rows).toHaveLength(0)
    expect(result.errors).toEqual([
      { message: 'Missing required email column.', row: 1 },
      { message: 'Missing required password column.', row: 1 },
    ])
  })

  it('reports row-level validation errors', () => {
    const result = parseMembersCSV(
      [
        'email,password,role,joinedAt',
        'not-an-email,short,invalid-role,13/2026',
        'not-an-email,another-secret,active,06/2026',
      ].join('\n'),
    )

    expect(result.rows).toHaveLength(0)
    expect(result.errors).toEqual([
      {
        message:
          'Email is invalid. Password must be at least 8 characters. Role "invalid-role" is not valid. joinedAt is not a valid month.',
        row: 2,
      },
      {
        message: 'Email is invalid.',
        row: 3,
      },
    ])
  })

  it('handles quoted CSV fields', () => {
    const result = parseMembersCSV(
      '"email","password","name"\n"ion@example.com","secret123","Ion, Jr."',
    )

    expect(result.errors).toEqual([])
    expect(result.rows[0].data.name).toBe('Ion, Jr.')
  })
})
