import type { Event, EventRegistration } from '@/payload-types'

type EventDay = NonNullable<Event['days']>[number]
type EventSlot = NonNullable<NonNullable<EventDay['slots']>>[number]

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
  isAvailable: boolean
}

export function formatEventDayLabel(eventDate: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
}) {
  const counts = new Map<string, number>()

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
              isAvailable: remaining > 0,
            },
          ] satisfies EventSlotAvailability[]
        }) ?? []
      )
    }) ?? []
  )
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
