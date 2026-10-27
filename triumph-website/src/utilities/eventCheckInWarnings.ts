import type { EventRegistration } from '@/payload-types'
import { getEventPaymentMinimums } from '@/utilities/eventPayment'

type DuplicateCandidate = Pick<EventRegistration, 'id' | 'name' | 'email' | 'phone' | 'status'>
type CleanupCandidate = DuplicateCandidate &
  Partial<Pick<EventRegistration, 'createdAt' | 'donation' | 'consumptionAmount' | 'timeOfArrival'>>

export type DuplicateCleanupPlan = {
  removals: { id: string; keepId: string }[]
  protectedCount: number
  remainingDuplicateCount: number
}

function normalizePhone(value: string | null | undefined) {
  let digits = (value ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  // Match Romanian local and international representations of the same number.
  if (/^0\d{9}$/.test(digits)) digits = `40${digits.slice(1)}`
  return digits
}

export function getDuplicateRegistrationReasons(registrations: DuplicateCandidate[]) {
  const groups = new Map<string, { reason: string; ids: Set<string> }>()
  function add(key: string, value: string, reason: string, id: string) {
    if (!value) return
    const groupKey = `${key}:${value}`
    const group = groups.get(groupKey) ?? { reason, ids: new Set<string>() }
    group.ids.add(id)
    groups.set(groupKey, group)
  }
  for (const registration of registrations) {
    if (registration.status === 'cancelled') continue
    for (const match of duplicateKeys(registration))
      add(match.key, match.value, match.reason, registration.id)
  }
  const reasons = new Map<string, string[]>()
  for (const group of groups.values()) {
    if (group.ids.size < 2) continue
    for (const id of group.ids) reasons.set(id, [...(reasons.get(id) ?? []), group.reason])
  }
  return reasons
}

function duplicateKeys(registration: DuplicateCandidate) {
  const email = registration.email?.trim().toLocaleLowerCase('ro') ?? ''
  const phone = normalizePhone(registration.phone)
  if (email || phone)
    return [
      { key: 'email', value: email, reason: 'Aceeași adresă de email' },
      { key: 'phone', value: phone, reason: 'Același număr de telefon' },
    ].filter((match) => match.value)
  return [
    {
      key: 'name',
      value: registration.name
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase('ro')
        .replace(/\s+/g, ' '),
      reason: 'Același nume, fără date de contact',
    },
  ].filter((match) => match.value)
}

function isProtected(registration: CleanupCandidate) {
  return (
    registration.status === 'present' ||
    Boolean(registration.timeOfArrival) ||
    (registration.donation ?? 0) !== 0 ||
    (registration.consumptionAmount ?? 0) !== 0
  )
}

/** Remove only unpaid rows that directly match a record which is being kept. */
export function getDuplicateCleanupPlan(registrations: CleanupCandidate[]): DuplicateCleanupPlan {
  const active = [
    ...new Map(
      registrations.filter((row) => row.status !== 'cancelled').map((row) => [row.id, row]),
    ).values(),
  ]
  active.sort((a, b) => {
    const priority = Number(isProtected(b)) - Number(isProtected(a))
    if (priority) return priority
    const created = (value: string | undefined) => {
      const time = Date.parse(value ?? '')
      return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER
    }
    return created(a.createdAt) - created(b.createdAt) || a.id.localeCompare(b.id, 'en')
  })
  const keepers = new Map<string, string>()
  const removals: DuplicateCleanupPlan['removals'] = []
  const kept: CleanupCandidate[] = []
  const duplicateReasons = getDuplicateRegistrationReasons(active)
  let protectedCount = 0
  for (const row of active) {
    const keys = duplicateKeys(row).map((match) => `${match.key}:${match.value}`)
    const keepId = keys.map((key) => keepers.get(key)).find(Boolean)
    if (!isProtected(row) && keepId) {
      removals.push({ id: row.id, keepId })
      continue
    }
    kept.push(row)
    if (isProtected(row) && duplicateReasons.has(row.id)) protectedCount += 1
    for (const key of keys) if (!keepers.has(key)) keepers.set(key, row.id)
  }
  return {
    removals,
    protectedCount,
    remainingDuplicateCount: getDuplicateRegistrationReasons(kept).size,
  }
}

export function isDonationBelowMinimum(
  registration: Pick<EventRegistration, 'donation' | 'guests' | 'status'>,
  minimumDonation: number,
) {
  if (registration.status !== 'present') return false
  const minimum = getEventPaymentMinimums({ donation: minimumDonation }, registration.guests)
  return Math.round(registration.donation * 100) < minimum.minimumTotalBani
}
