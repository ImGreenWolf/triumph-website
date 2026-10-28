export function registrationPeople(registration: { guests?: number | null }) {
  return 1 + Math.max(0, Math.floor(registration.guests || 0))
}

export function activePeople(registrations: { guests?: number | null; status?: string | null }[]) {
  return registrations.reduce(
    (sum, row) => (row.status === 'cancelled' ? sum : sum + registrationPeople(row)),
    0,
  )
}
