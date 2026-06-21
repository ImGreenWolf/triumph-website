import type { Event } from '@/payload-types'
import type { LocationValue } from '@/fields/location-selector'

type EventDay = NonNullable<Event['days']>[number]
type EventSlot = NonNullable<EventDay['slots']>[number]

const longDateFormatter = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'short',
})

export function getEventDays(event: Pick<Event, 'days'>) {
  return (event.days ?? [])
    .filter((day): day is EventDay & { eventDate: string } => Boolean(day?.eventDate))
    .sort((firstDay, secondDay) => {
      return new Date(firstDay.eventDate).getTime() - new Date(secondDay.eventDate).getTime()
    })
}

export function getEventStartDate(event: Pick<Event, 'days'>) {
  const starts = getEventDays(event).flatMap((day) => {
    const slotStarts = day.slots.flatMap((slot) => {
      const start = getEventSlotDateRange(day.eventDate, slot).start
      return start ? [start] : []
    })

    return slotStarts.length > 0 ? slotStarts : compactDate(toDayBoundary(day.eventDate, false))
  })

  return getDateBoundary(starts, 'earliest')
}

export function getEventEndDate(event: Pick<Event, 'days'>) {
  const ends = getEventDays(event).flatMap((day) => {
    const slotEnds = day.slots.flatMap((slot) => {
      const range = getEventSlotDateRange(day.eventDate, slot)
      const end = range.end ?? range.start
      return end ? [end] : []
    })

    return slotEnds.length > 0 ? slotEnds : compactDate(toDayBoundary(day.eventDate, true))
  })

  return getDateBoundary(ends, 'latest')
}

export function isEventCompleted(event: Pick<Event, 'days'>, now = new Date()) {
  const endDate = getEventEndDate(event)
  return endDate ? endDate.getTime() < now.getTime() : false
}

export function formatEventDateRange(event: Pick<Event, 'days'>) {
  const days = getEventDays(event)
  const firstDate = days[0] ? toDayBoundary(days[0].eventDate, false) : null
  const lastDate = days[days.length - 1]
    ? toDayBoundary(days[days.length - 1].eventDate, false)
    : null

  if (!firstDate || !lastDate) return 'Data va fi anunțată'
  if (days.length === 1) return longDateFormatter.format(firstDate)

  return `${shortDateFormatter.format(firstDate)} - ${longDateFormatter.format(lastDate)}`
}

export function getEventStatus(event: Pick<Event, 'days'>, now = new Date()) {
  if (isEventCompleted(event, now)) {
    return {
      label: 'Încheiat',
      tone: 'muted' as const,
    }
  }

  const startDate = getEventStartDate(event)
  if (!startDate) {
    return {
      label: 'Data urmează',
      tone: 'muted' as const,
    }
  }

  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / 86_400_000)
  if (daysUntilStart <= 14) {
    return {
      label: 'În curând',
      tone: 'accent' as const,
    }
  }

  return {
    label: 'Înscrieri deschise',
    tone: 'accent' as const,
  }
}

export function getEventLocation(location: Event['location']) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return null
  if (!('name' in location)) return null

  return location as LocationValue
}

export function getGoogleMapsURL(location?: LocationValue | null) {
  if (!location) return null
  const query = location.formattedAddress || location.name

  if (location.placeId && query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${location.placeId}`
  }

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null
}

export function getContrastTextColor(hexColor?: string | null) {
  if (!hexColor) return undefined

  const normalized = hexColor.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return undefined

  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000

  return luminance > 145 ? '#111827' : '#ffffff'
}

export function combineEventDateAndTime(eventDate: string, time?: string | null) {
  const combinedDate = new Date(eventDate)
  if (Number.isNaN(combinedDate.getTime())) return null

  if (time) {
    const parsedTime = new Date(time)
    if (!Number.isNaN(parsedTime.getTime())) {
      combinedDate.setHours(
        parsedTime.getHours(),
        parsedTime.getMinutes(),
        parsedTime.getSeconds(),
        parsedTime.getMilliseconds(),
      )
    }
  }

  return combinedDate
}

export function getEventSlotDateRange(
  eventDate: string,
  slot: Pick<EventSlot, 'endTime' | 'startTime'>,
) {
  const start = slot.startTime ? combineEventDateAndTime(eventDate, slot.startTime) : null
  const end = slot.endTime ? combineEventDateAndTime(eventDate, slot.endTime) : null

  if (start && end && end.getTime() < start.getTime()) {
    end.setDate(end.getDate() + 1)
  }

  return { end, start }
}

export function isEventSlotUpcoming(eventDate: string, time?: string | null, now = new Date()) {
  const slotDate = combineEventDateAndTime(eventDate, time)
  return slotDate ? slotDate.getTime() >= now.getTime() : false
}

function toDayBoundary(value: string, endOfDay: boolean) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  if (endOfDay) date.setHours(23, 59, 59, 999)
  else date.setHours(0, 0, 0, 0)

  return date
}

function compactDate(value: Date | null) {
  return value ? [value] : []
}

function getDateBoundary(values: Date[], boundary: 'earliest' | 'latest') {
  if (values.length === 0) return null

  const timestamps = values
    .map((value) => value.getTime())
    .filter((value) => Number.isFinite(value))
  if (timestamps.length === 0) return null

  const timestamp = boundary === 'earliest' ? Math.min(...timestamps) : Math.max(...timestamps)
  return new Date(timestamp)
}
