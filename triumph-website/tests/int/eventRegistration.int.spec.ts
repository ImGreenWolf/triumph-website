import { describe, expect, it } from 'vitest'

import {
  formatCompactEventDayLabel,
  formatEventDayLabel,
  formatEventSlotLabel,
  getEventSlotAvailability,
  getEventSlotRegistrationDeadline,
  isEventSlotRegistrationOpen,
  REGISTRATION_CUTOFF_MINUTES,
} from '@/utilities/eventRegistration'
import {
  eventRequiresMinimumsAcknowledgement,
  validateMinimumsAcknowledgement,
} from '@/collections/Events'

describe('event registration availability', () => {
  it('includes the year in full and compact event date labels', () => {
    const eventDate = localDate(2026, 5, 15, 12).toISOString()

    expect(formatEventDayLabel(eventDate)).toContain('2026')
    expect(formatCompactEventDayLabel(eventDate)).toContain('2026')
  })

  it('closes a timed slot at the file configured cutoff before its start time', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()
    const startTime = localDate(2026, 5, 15, 10).toISOString()
    const endTime = localDate(2026, 5, 15, 11).toISOString()
    const atCutoff = localDate(2026, 5, 15, 10)
    atCutoff.setMinutes(atCutoff.getMinutes() - REGISTRATION_CUTOFF_MINUTES)
    const beforeCutoff = new Date(atCutoff)
    beforeCutoff.setMinutes(beforeCutoff.getMinutes() - 1)

    expect(
      isEventSlotRegistrationOpen(
        {
          endTime,
          eventDate,
          startTime,
        },
        beforeCutoff,
      ),
    ).toBe(true)

    expect(
      isEventSlotRegistrationOpen(
        {
          endTime,
          eventDate,
          startTime,
        },
        atCutoff,
      ),
    ).toBe(false)
  })

  it('keeps later days in a multi-day event available after earlier slots close', () => {
    const firstDay = localDate(2026, 5, 15)
    const secondDay = localDate(2026, 5, 16)
    const availability = getEventSlotAvailability({
      event: {
        days: [
          {
            eventDate: firstDay.toISOString(),
            id: 'day-1',
            slots: [
              {
                capacity: 5,
                id: 'slot-1',
                startTime: localDate(2026, 5, 15, 10).toISOString(),
              },
            ],
          },
          {
            eventDate: secondDay.toISOString(),
            id: 'day-2',
            slots: [
              {
                capacity: 5,
                id: 'slot-2',
                startTime: localDate(2026, 5, 16, 10).toISOString(),
              },
            ],
          },
        ],
      },
      now: localDate(2026, 5, 15, 12),
      registrations: [],
    })

    expect(availability).toHaveLength(2)
    expect(availability.find((slot) => slot.dayId === 'day-1')?.isAvailable).toBe(false)
    expect(availability.find((slot) => slot.dayId === 'day-2')?.isAvailable).toBe(true)
  })

  it('keeps an untimed slot open through the end of its event day', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()

    expect(
      isEventSlotRegistrationOpen(
        {
          eventDate,
        },
        localDate(2026, 5, 15, 20),
      ),
    ).toBe(true)

    expect(
      isEventSlotRegistrationOpen(
        {
          eventDate,
        },
        localDate(2026, 5, 16),
      ),
    ).toBe(false)
  })

  it('renders an interval with no fixed end as its start time only', () => {
    const startTime = localDate(2026, 5, 15, 18, 30).toISOString()

    expect(formatEventSlotLabel(startTime, null)).toBe('18:30')
  })

  it('uses the start time as the deadline for an interval with no fixed end', () => {
    const eventDate = localDate(2026, 5, 15).toISOString()
    const startTime = localDate(2026, 5, 15, 18, 30).toISOString()
    const beforeStart = localDate(2026, 5, 15, 18, 29)
    const atStart = localDate(2026, 5, 15, 18, 30)

    expect(getEventSlotRegistrationDeadline({ eventDate, startTime, endTime: null })).toEqual(
      atStart,
    )
    expect(isEventSlotRegistrationOpen({ eventDate, startTime, endTime: null }, beforeStart)).toBe(
      true,
    )
    expect(isEventSlotRegistrationOpen({ eventDate, startTime, endTime: null }, atStart)).toBe(
      false,
    )
  })

  it('requires public acknowledgement when an event has minimum donation or consumation', () => {
    const minimumDonationEvent = {
      donation: '50',
      minimumConsumation: null,
    }
    const minimumConsumationEvent = {
      donation: null,
      minimumConsumation: 25,
    }
    const freeEvent = {
      donation: '',
      minimumConsumation: 0,
    }

    expect(eventRequiresMinimumsAcknowledgement(minimumDonationEvent)).toBe(true)
    expect(eventRequiresMinimumsAcknowledgement(minimumConsumationEvent)).toBe(true)
    expect(eventRequiresMinimumsAcknowledgement(freeEvent)).toBe(false)
    expect(validateMinimumsAcknowledgement(minimumDonationEvent, false)).toBe(false)
    expect(validateMinimumsAcknowledgement(minimumDonationEvent, true)).toBe(true)
    expect(validateMinimumsAcknowledgement(freeEvent, false)).toBe(true)
  })
})

function localDate(year: number, monthIndex: number, day: number, hours = 0, minutes = 0) {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0)
}
