export type InterviewSlot = {
  end: string
  id: string
  label: string
  location?: string
  start: string
}

export type InterviewIntervalInput = {
  breaks?: Array<{ endTime?: string | null; startTime?: string | null }> | null
  endDateTime?: string | null
  interviewDuration?: number | null
  location?: unknown
  pauseBetween?: number | null
  startDateTime?: string | null
}

export function generateInterviewSlots(intervals: InterviewIntervalInput[] | null | undefined) {
  const slots: InterviewSlot[] = []

  for (const interval of intervals ?? []) {
    const intervalStart = parseDate(interval.startDateTime)
    const intervalEnd = parseDate(interval.endDateTime)
    const durationMinutes = normalizePositiveNumber(interval.interviewDuration)

    if (!intervalStart || !intervalEnd || !durationMinutes || intervalStart >= intervalEnd) continue

    const durationMs = durationMinutes * 60_000
    const pauseMs = Math.max(0, interval.pauseBetween ?? 0) * 60_000
    const breaks = (interval.breaks ?? [])
      .map((item) => ({
        end: getBreakDateForIntervalDay(intervalStart, item.endTime),
        start: getBreakDateForIntervalDay(intervalStart, item.startTime),
      }))
      .filter((item): item is { end: Date; start: Date } => Boolean(item.start && item.end))
      .map((item) =>
        item.end <= item.start
          ? { ...item, end: new Date(item.end.getTime() + 24 * 60 * 60_000) }
          : item,
      )

    for (
      let startMs = intervalStart.getTime();
      startMs + durationMs <= intervalEnd.getTime();
      startMs += durationMs + pauseMs
    ) {
      const start = new Date(startMs)
      const end = new Date(startMs + durationMs)
      if (breaks.some((item) => rangesOverlap(start, end, item.start, item.end))) continue

      const isoStart = start.toISOString()
      slots.push({
        end: end.toISOString(),
        id: isoStart,
        label: formatInterviewSlotLabel(start, end),
        location: getLocationLabel(interval.location),
        start: isoStart,
      })
    }
  }

  return slots.sort((left, right) => left.start.localeCompare(right.start))
}

export function validateInterviewIntervals(intervals: InterviewIntervalInput[] | null | undefined) {
  const errors: string[] = []
  const resolvedIntervals: Array<{ end: Date; index: number; start: Date }> = []

  for (const [index, interval] of (intervals ?? []).entries()) {
    const intervalStart = parseDate(interval.startDateTime)
    const intervalEnd = parseDate(interval.endDateTime)
    const durationMinutes = normalizePositiveNumber(interval.interviewDuration)
    const label = 'Intervalul ' + (index + 1)

    if (!intervalStart || !intervalEnd || !durationMinutes || intervalStart >= intervalEnd) {
      errors.push(label + ' are ore sau durata invalide.')
      continue
    }
    resolvedIntervals.push({ end: intervalEnd, index, start: intervalStart })

    if (!getLocationLabel(interval.location)) errors.push(label + ' nu are locatie.')

    for (const item of interval.breaks ?? []) {
      const start = getBreakDateForIntervalDay(intervalStart, item.startTime)
      const end = getBreakDateForIntervalDay(intervalStart, item.endTime)
      if (!start || !end || end <= start) {
        errors.push(label + ' contine o pauza invalida.')
        continue
      }
      if (start < intervalStart || end > intervalEnd) {
        errors.push(label + ' contine o pauza in afara programului.')
      }
    }
  }

  for (let index = 0; index < resolvedIntervals.length; index += 1) {
    const current = resolvedIntervals[index]
    for (const candidate of resolvedIntervals.slice(index + 1)) {
      if (rangesOverlap(current.start, current.end, candidate.start, candidate.end)) {
        errors.push(
          'Intervalele ' + (current.index + 1) + ' si ' + (candidate.index + 1) + ' se suprapun.',
        )
      }
    }
  }

  if ((intervals ?? []).length > 0 && generateInterviewSlots(intervals).length === 0) {
    errors.push('Programul nu produce niciun slot disponibil.')
  }

  return { errors, valid: errors.length === 0 && generateInterviewSlots(intervals).length > 0 }
}

function normalizePositiveNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.floor(value)
}

function rangesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && leftEnd > rightStart
}

function getBreakDateForIntervalDay(intervalStart: Date, value?: string | null) {
  const breakDate = parseDate(value)
  if (!breakDate) return null

  return new Date(
    intervalStart.getFullYear(),
    intervalStart.getMonth(),
    intervalStart.getDate(),
    breakDate.getHours(),
    breakDate.getMinutes(),
    breakDate.getSeconds(),
    breakDate.getMilliseconds(),
  )
}

function getLocationLabel(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name
    return typeof name === 'string' ? name.trim() : ''
  }
  return ''
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatInterviewSlotLabel(start: Date, end: Date) {
  const day = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(start)
  const time = new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' })
  return day + ', ' + time.format(start) + ' - ' + time.format(end)
}
