import type { Event, EventRegistration } from '@/payload-types'
import { combineEventDateAndTime } from '@/utilities/eventDisplay'

type EventDay = NonNullable<Event['days']>[number]
type EventSlot = NonNullable<NonNullable<EventDay['slots']>>[number]

const MILLISECONDS_PER_MINUTE = 60_000

// Change this value to close signup this many minutes before each timed slot starts.
export const REGISTRATION_CUTOFF_MINUTES = 0

export type EventSlotAvailability = {
  dayId: string
  slotId: string
  eventDate: string
  startTime: string | null
  endTime: string | null
  capacity: number
  registrationCount: number
  remaining: number
  dayLabel: string
  slotLabel: string
  optionLabel: string
  registrationDeadline: string | null
  isRegistrationOpen: boolean
  isAvailable: boolean
}

export function formatEventDayLabel(eventDate: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(eventDate))
}

export function formatCompactEventDayLabel(eventDate: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(eventDate))
}

export function formatEventSlotLabel(startTime?: string | null, endTime?: string | null) {
  const start = formatTime(startTime)
  const end = formatTime(endTime)

  if (start && end) return `${start} - ${end}`
  if (start) return start
  if (end) return end

  return 'Interval neconfigurat'
}

export function findEventSlot(event: Pick<Event, 'days'>, dayId: string, slotId: string) {
  const day = event.days?.find((candidate) => candidate?.id === dayId)
  const slot = day?.slots?.find((candidate) => candidate?.id === slotId)

  return { day, slot }
}

export function getEventSlotAvailability(args: {
  event: Pick<Event, 'days'>
  registrations: Array<Pick<EventRegistration, 'day' | 'slot' | 'status'>>
  now?: Date
}) {
  const counts = new Map<string, number>()
  const now = args.now ?? new Date()

  for (const registration of args.registrations) {
    if (registration.status === 'cancelled') continue
    if (!registration.day || !registration.slot) continue

    const key = toAvailabilityKey(registration.day, registration.slot)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return (
    args.event.days?.flatMap((day) => {
      if (!day?.id || !day.eventDate) return []

      const dayId = day.id
      const eventDate = day.eventDate

      return (
        day.slots?.flatMap((slot) => {
          if (!slot?.id) return []

          const slotId = slot.id
          const capacity = slot.capacity ?? 0
          const registrationCount = counts.get(toAvailabilityKey(dayId, slotId)) ?? 0
          const remaining = Math.max(capacity - registrationCount, 0)
          const dayLabel = formatEventDayLabel(eventDate)
          const slotLabel = formatEventSlotLabel(slot.startTime, slot.endTime)
          const registrationDeadline = getEventSlotRegistrationDeadline({
            endTime: slot.endTime,
            eventDate,
            startTime: slot.startTime,
          })
          const isRegistrationOpen = registrationDeadline
            ? registrationDeadline.getTime() > now.getTime()
            : false

          return [
            {
              dayId,
              slotId,
              eventDate,
              startTime: slot.startTime ?? null,
              endTime: slot.endTime ?? null,
              capacity,
              registrationCount,
              remaining,
              dayLabel,
              slotLabel,
              optionLabel: `${dayLabel}, ${slotLabel}`,
              registrationDeadline: registrationDeadline?.toISOString() ?? null,
              isRegistrationOpen,
              isAvailable: remaining > 0 && isRegistrationOpen,
            },
          ] satisfies EventSlotAvailability[]
        }) ?? []
      )
    }) ?? []
  )
}

export function isEventSlotRegistrationOpen(
  args: {
    eventDate: string
    startTime?: string | null
    endTime?: string | null
  },
  now = new Date(),
) {
  const registrationDeadline = getEventSlotRegistrationDeadline(args)
  return registrationDeadline ? registrationDeadline.getTime() > now.getTime() : false
}

export function getEventSlotRegistrationDeadline(args: {
  eventDate: string
  startTime?: string | null
  endTime?: string | null
}) {
  const slotStartDate = args.startTime
    ? combineEventDateAndTime(args.eventDate, args.startTime)
    : null
  const fallbackDate = args.endTime
    ? combineEventDateAndTime(args.eventDate, args.endTime)
    : getEventDayEnd(args.eventDate)
  const deadlineBase = slotStartDate ?? fallbackDate

  if (!deadlineBase) return null

  const cutoffMinutes = slotStartDate ? normalizeRegistrationCutoff() : 0

  return new Date(deadlineBase.getTime() - cutoffMinutes * MILLISECONDS_PER_MINUTE)
}

function toAvailabilityKey(dayId: string, slotId: string) {
  return `${dayId}::${slotId}`
}

function formatTime(value?: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeRegistrationCutoff() {
  if (!Number.isFinite(REGISTRATION_CUTOFF_MINUTES)) return 0
  return Math.max(0, REGISTRATION_CUTOFF_MINUTES)
}

function getEventDayEnd(eventDate: string) {
  const date = new Date(eventDate)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(23, 59, 59, 999)
  return date
}
