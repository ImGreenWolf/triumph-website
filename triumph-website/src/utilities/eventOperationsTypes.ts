import type {
  ManagedEvent,
  ManagedRegistration,
} from '@/app/(frontend)/members/projects/ProjectManagerDashboard'

export type SlotSummary = {
  day: string
  slot: string
  capacity: number
  reservedPeople: number
  presentPeople: number
  presentCount: number
  pendingPeople: number
  activeCount: number
  absentCount: number
  donation: number
  consumptionAmount: number
  totalCollected: number
  legacyConsumptionCount: number
}
export function shiftSnapshotKey(value: SlotSummary) {
  return JSON.stringify([
    value.day,
    value.slot,
    value.activeCount,
    value.reservedPeople,
    value.presentCount,
    value.presentPeople,
    value.pendingPeople,
    value.absentCount,
    Math.round(value.donation * 100),
    Math.round(value.consumptionAmount * 100),
    value.legacyConsumptionCount,
  ])
}
export type ProjectMetrics = {
  activeCount: number
  presentCount: number
  absentCount: number
  activePeople: number
  unprocessed: number
  capacity: number
  funds: number
  consumptionAmount: number
  totalCollected: number
  legacyConsumptionCount: number
  companions: number
  peoplePresent: number
  attendanceRate: number
  averageDonation: number
  averageGroupSize: number
  checkInProgress: number
  donationPerPerson: number
  missingDonations: number
  noShowRate: number
  occupancy: number
  remainingCapacity: number
  topSlotLabel: string
  days: {
    id: string
    label: string
    attendees: number
    funds: number
    consumptionAmount: number
    totalCollected: number
  }[]
}
export type ClosingSummary = {
  id: string
  actorName: string
  createdAt: string
  donation: number
  consumptionAmount: number
  totalCollected: number
  countedAmount: number
  difference: number
  people: number
  legacyConsumptionCount: number
  legacyAcknowledged?: boolean | null
  note?: string | null
  revision: number
}
export type ShiftOperation = {
  id?: string
  day: string
  slot: string
  members: { id: string; name: string }[]
  handoverNote: string
  updatedBy: string
  updatedAt: string
  closing: ClosingSummary | null
}
export type RegistrationWarnings = { duplicateReasons: string[]; belowMinimum: boolean }
export type RemoteProjectData = {
  eventId: string
  revision: number
  viewerId: string
  event: ManagedEvent
  page: number
  totalDocs: number
  totalPages: number
  registrations: ManagedRegistration[]
  warnings: Record<string, RegistrationWarnings>
  metrics: ProjectMetrics
  slots: SlotSummary[]
  recentRegistrations: ManagedRegistration[]
  shifts: ShiftOperation[]
}
export type EventActivityItem = {
  id: string
  action: string
  actorName: string
  createdAt: string
  registrationId: string
  participantName: string
  reason: string
  version: number
  canUndo: boolean
  changes: { field: string; before: unknown; after: unknown }[]
}

export function defaultEventShift(event: Pick<ManagedEvent, 'days'>, now = Date.now()) {
  const slots = event.days
    .flatMap((day) =>
      day.slots.map((slot) => ({
        value: `${day.id}:${slot.id}`,
        start: Date.parse(slot.startTime || day.eventDate),
        end: Date.parse(slot.endTime || slot.startTime || day.eventDate),
      })),
    )
    .sort((a, b) => a.start - b.start)
  return (
    (
      slots.find((slot) => slot.start <= now && slot.end > now) ??
      slots.find((slot) => slot.start > now) ??
      slots.at(-1)
    )?.value ?? 'all'
  )
}
