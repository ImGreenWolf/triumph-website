import { describe, expect, it } from 'vitest'
import {
  calculateEventPayment,
  getRegistrationPaymentTotal,
  parseMoneyBani,
} from '@/utilities/eventPayment'

const event = { donation: '30', minimumConsumation: 20 }

describe('event payment split', () => {
  it('enforces both per-person minimums and allocates surplus to donation', () => {
    expect(calculateEventPayment(event, 1, '100')).toMatchObject({
      people: 2,
      minimumTotal: 100,
      consumptionAmount: 40,
      donation: 60,
      error: null,
    })
    expect(calculateEventPayment(event, 1, '100.50')).toMatchObject({ donation: 60.5, error: null })
    expect(calculateEventPayment(event, 1, '99.99').error).toContain('100 RON')
    expect(calculateEventPayment(event, 2, '100').error).toContain('150 RON')
    expect(calculateEventPayment(event, 0, '50').error).toBeNull()
  })

  it('performs decimal arithmetic in bani', () => {
    expect(
      calculateEventPayment({ donation: '0.10', minimumConsumation: 0.2 }, 2, '0.90'),
    ).toMatchObject({ donation: 0.3, consumptionAmount: 0.6, minimumTotal: 0.9, error: null })
    expect(parseMoneyBani('25,50')).toBe(2550)
  })

  it.each([
    undefined,
    null,
    '',
    ' ',
    true,
    [],
    {},
    -1,
    NaN,
    Infinity,
    '10.001',
    '1e2',
    '1000000.01',
  ])('rejects invalid total %j', (total) =>
    expect(calculateEventPayment(event, 0, total).error).toBeTruthy(),
  )

  it.each([-1, 1.5, 51, NaN])('rejects invalid companion count %s', (guests) => {
    expect(calculateEventPayment(event, guests, '100').error).toContain('însoțitori')
  })

  it('allows zero payment for a free event and consumption-only events', () => {
    expect(calculateEventPayment({}, 0, 0)).toMatchObject({
      donation: 0,
      consumptionAmount: 0,
      error: null,
    })
    expect(calculateEventPayment({ minimumConsumation: 20 }, 1, 40)).toMatchObject({
      donation: 0,
      consumptionAmount: 40,
      error: null,
    })
  })

  it('reopens split payments without subtracting consumption twice', () => {
    const registration = { donation: 60, consumptionAmount: 40, guests: 1 }
    const total = getRegistrationPaymentTotal(event, registration)
    expect(total).toBe(100)
    expect(calculateEventPayment(event, 1, total)).toMatchObject({
      donation: 60,
      consumptionAmount: 40,
    })
    expect(registration).toEqual({ donation: 60, consumptionAmount: 40, guests: 1 })
    expect(getRegistrationPaymentTotal(event, { donation: 60, guests: 1 })).toBe(100)
    expect(
      getRegistrationPaymentTotal(event, { donation: 60, guests: 1, consumptionAmount: 0 }),
    ).toBe(60)
  })
})
