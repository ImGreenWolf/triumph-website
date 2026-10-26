import type { EventRegistration } from '@/payload-types'

export function countActiveRegistrations(records: Pick<EventRegistration, 'status'>[]) {
  return records.filter((record) => record.status !== 'cancelled').length
}

export function registrationCountLabel(count: number) {
  return `${count.toLocaleString('ro-RO')} ${count === 1 ? 'înscriere' : 'înscrieri'}`
}
