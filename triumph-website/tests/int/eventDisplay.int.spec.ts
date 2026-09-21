import { describe, expect, it } from 'vitest'

import type { Event } from '@/payload-types'
import {
  formatEventDateRange,
  getEventEndDate,
  getEventSlotDateRange,
  getEventStartDate,
} from '@/utilities/eventDisplay'

type EventDay = NonNullable<Event['days']>[number]
type EventSlot = NonNullable<EventDay['slots']>[number]

function localDate(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

function slot(startHour: number, startMinute: number, endHour: number, endMinute: number) {
  return {
    startTime: localDate(2020, 1, 1, startHour, startMinute),
    endTime: localDate(2020, 1, 1, endHour, endMinute),
  } satisfies EventSlot
}

function openEndedSlot(startHour: number, startMinute: number) {
  return {
    startTime: localDate(2020, 1, 1, startHour, startMinute),
    endTime: null,
  } satisfies EventSlot
}

describe('event time boundaries', () => {
  it('includes the year for every date in an event range', () => {
    const label = formatEventDateRange({
      days: [
        { eventDate: localDate(2026, 6, 21), slots: [] },
        { eventDate: localDate(2026, 6, 22), slots: [] },
      ],
    })

    expect(label.match(/2026/g)).toHaveLength(2)
  })

  it('combines Payload slot times with the event day', () => {
    const range = getEventSlotDateRange(localDate(2026, 6, 21), slot(9, 30, 12, 15))

    expect(range.start).toEqual(new Date(2026, 5, 21, 9, 30))
    expect(range.end).toEqual(new Date(2026, 5, 21, 12, 15))
  })

  it('uses the earliest slot start and latest slot end for the event', () => {
    const days = [
      {
        eventDate: localDate(2026, 6, 22),
        slots: [slot(10, 0, 14, 0)],
      },
      {
        eventDate: localDate(2026, 6, 21),
        slots: [slot(12, 0, 16, 0), slot(8, 30, 11, 0)],
      },
    ] satisfies EventDay[]

    expect(getEventStartDate({ days })).toEqual(new Date(2026, 5, 21, 8, 30))
    expect(getEventEndDate({ days })).toEqual(new Date(2026, 5, 22, 14, 0))
  })

  it('uses the start time as the boundary for a single interval with no fixed end', () => {
    const eventDate = localDate(2026, 6, 21)
    const range = getEventSlotDateRange(eventDate, openEndedSlot(18, 30))
    const days = [
      {
        eventDate,
        slots: [openEndedSlot(18, 30)],
      },
    ] satisfies EventDay[]

    expect(range.start).toEqual(new Date(2026, 5, 21, 18, 30))
    expect(range.end).toBeNull()
    expect(getEventEndDate({ days })).toEqual(new Date(2026, 5, 21, 18, 30))
  })

  it('uses the final interval start as the event end when it has no fixed end', () => {
    const days = [
      {
        eventDate: localDate(2026, 6, 21),
        slots: [slot(9, 0, 11, 0), openEndedSlot(20, 15)],
      },
    ] satisfies EventDay[]

    expect(getEventStartDate({ days })).toEqual(new Date(2026, 5, 21, 9, 0))
    expect(getEventEndDate({ days })).toEqual(new Date(2026, 5, 21, 20, 15))
  })

  it('moves an overnight slot end to the following day', () => {
    const range = getEventSlotDateRange(localDate(2026, 6, 21), slot(22, 0, 1, 30))

    expect(range.start).toEqual(new Date(2026, 5, 21, 22, 0))
    expect(range.end).toEqual(new Date(2026, 5, 22, 1, 30))
  })
})
