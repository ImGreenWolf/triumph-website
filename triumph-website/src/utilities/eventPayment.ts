export type AgeGroup = 'minor' | 'adult'

export const AGE_GROUP_ERROR = 'Selectează Minor (sub 18 ani) sau Major (18+).'

export function isAgeGroup(value: unknown): value is AgeGroup {
  return value === 'minor' || value === 'adult'
}

export function formatAgeGroup(value: unknown) {
  return value === 'minor'
    ? 'Minor — sub 18 ani'
    : value === 'adult'
      ? 'Major — 18+'
      : 'Nespecificat'
}

type PaymentEvent = { donation?: unknown; minimumConsumation?: unknown }

// Parse money once, then perform all calculations in integer bani.
export function parseMoneyBani(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const bani = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(bani) && bani <= 100_000_000 ? bani : null
}

export function getEventPaymentMinimums(event: PaymentEvent, guests: number) {
  const people = 1 + (Number.isInteger(guests) && guests >= 0 && guests <= 50 ? guests : 0)
  const donationBani = (parseMoneyBani(event.donation) ?? 0) * people
  const consumptionBani = (parseMoneyBani(event.minimumConsumation) ?? 0) * people
  return {
    people,
    consumptionAmount: consumptionBani / 100,
    minimumDonation: donationBani / 100,
    minimumTotal: (donationBani + consumptionBani) / 100,
    consumptionBani,
    minimumTotalBani: donationBani + consumptionBani,
  }
}

export function calculateEventPayment(event: PaymentEvent, guests: number, total: unknown) {
  const minimums = getEventPaymentMinimums(event, guests)
  const totalBani = parseMoneyBani(total)
  let error: string | null = null
  if (!Number.isInteger(guests) || guests < 0 || guests > 50) {
    error = 'Numărul de însoțitori trebuie să fie între 0 și 50.'
  } else if (totalBani === null) {
    error = 'Introdu totalul încasat, între 0 și 1.000.000 RON, cu cel mult două zecimale.'
  } else if (totalBani < minimums.minimumTotalBani) {
    error = `Totalul minim pentru ${minimums.people} ${minimums.people === 1 ? 'persoană' : 'persoane'} este ${minimums.minimumTotal.toLocaleString('ro-RO')} RON, cu consumația inclusă.`
  }
  return {
    ...minimums,
    error,
    totalCollected: totalBani === null ? null : totalBani / 100,
    donation: totalBani === null ? null : (totalBani - minimums.consumptionBani) / 100,
  }
}

export function getRegistrationPaymentTotal(
  event: PaymentEvent,
  registration: {
    donation?: number | null
    consumptionAmount?: number | null
    guests?: number | null
  },
) {
  const consumption =
    registration.consumptionAmount ??
    getEventPaymentMinimums(event, registration.guests ?? 0).consumptionAmount
  return (
    ((parseMoneyBani(registration.donation ?? 0) ?? 0) + (parseMoneyBani(consumption) ?? 0)) / 100
  )
}
