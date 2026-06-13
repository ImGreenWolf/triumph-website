'use client'

import { Button } from '@/components/ui/button'
import type { Event } from '@/payload-types'
import { getContrastTextColor, isEventCompleted } from '@/utilities/eventDisplay'
import type { EventSlotAvailability } from '@/utilities/eventRegistration'
import { CheckCircle2, Ticket, Users, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

type SignupFormProps = {
  accentColor: string
  event: SignupEvent
  slotAvailability: EventSlotAvailability[]
}

type SignupEvent = Pick<Event, 'capacity' | 'days' | 'id' | 'private'> & {
  participantsCount: number
}

export default function SignupForm({ accentColor, event, slotAvailability }: SignupFormProps) {
  const dialogTitleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [participantsCount, setParticipantsCount] = useState(event.participantsCount)
  const availableSlots = useMemo(
    () => slotAvailability.filter((slot) => slot.isAvailable),
    [slotAvailability],
  )
  const dayOptions = useMemo(
    () =>
      availableSlots.reduce<Array<{ dayId: string; dayLabel: string }>>((allDays, slot) => {
        if (allDays.some((day) => day.dayId === slot.dayId)) return allDays

        allDays.push({
          dayId: slot.dayId,
          dayLabel: slot.dayLabel,
        })

        return allDays
      }, []),
    [availableSlots],
  )
  const slotsForSelectedDay = useMemo(
    () => availableSlots.filter((slot) => slot.dayId === selectedDay),
    [availableSlots, selectedDay],
  )
  const eventHasEnded = isEventCompleted(event)
  const eventIsPrivate = Boolean(event.private)

  useEffect(() => {
    setParticipantsCount(event.participantsCount)
  }, [event.participantsCount])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') setIsOpen(false)
    }
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    setSelectedDay((currentDay) => {
      if (dayOptions.some((day) => day.dayId === currentDay)) return currentDay
      return dayOptions[0]?.dayId ?? ''
    })
  }, [dayOptions, isOpen])

  useEffect(() => {
    if (!isOpen) return

    setSelectedSlot((currentSlot) => {
      if (slotsForSelectedDay.some((slot) => slot.slotId === currentSlot)) return currentSlot
      return slotsForSelectedDay[0]?.slotId ?? ''
    })
  }, [isOpen, slotsForSelectedDay])

  const openDialog = () => {
    setError(null)
    setSubmitted(false)
    setIsOpen(true)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl shadow-black/15">
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: accentColor, color: getContrastTextColor(accentColor) }}
        >
          <Ticket aria-hidden className="size-5" />
        </div>
        <div>
          <p className="text-lg font-bold">Participă la eveniment</p>
          <p className="mt-1 text-sm leading-5 text-card-foreground/60">
            Alege ziua și intervalul potrivit direct din formular.
          </p>
        </div>
      </div>

      <Participants accentColor={accentColor} event={event} participantsCount={participantsCount} />

      <Button
        className="mt-4 w-full"
        disabled={eventIsPrivate || availableSlots.length === 0 || eventHasEnded}
        onClick={openDialog}
        style={{ backgroundColor: accentColor, color: getContrastTextColor(accentColor) }}
      >
        {eventIsPrivate
          ? 'Înscrierile sunt private'
          : eventHasEnded
            ? 'Eveniment încheiat'
            : availableSlots.length === 0
              ? 'Nu mai sunt locuri disponibile'
              : 'Înscrie-te acum'}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="relative max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Închide formularul"
              className="absolute right-4 top-4 rounded-full p-2 text-card-foreground/60 transition hover:bg-background/10 hover:text-card-foreground"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X aria-hidden className="size-4" />
            </button>

            {submitted ? (
              <div className="py-5 text-center">
                <CheckCircle2
                  aria-hidden
                  className="mx-auto size-12"
                  style={{ color: accentColor }}
                />
                <h3 className="mt-5 text-2xl font-bold" id={dialogTitleId}>
                  Înscriere confirmată
                </h3>
                <p className="mt-3 text-sm leading-6 text-card-foreground/65">
                  Te-ai înscris cu succes. Te așteptăm la eveniment.
                </p>
                <Button className="mt-6 w-full" onClick={() => setIsOpen(false)}>
                  Închide
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 pr-8">
                  <h3 className="text-2xl font-bold" id={dialogTitleId}>
                    Înscriere la eveniment
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-card-foreground/65">
                    Selectează ziua și intervalul, apoi introdu adresa ta de email.
                  </p>
                </div>

                <form
                  className="flex flex-col gap-4"
                  onSubmit={async (submitEvent) => {
                    submitEvent.preventDefault()
                    setIsSubmitting(true)
                    setError(null)

                    const form = submitEvent.currentTarget
                    const formData = new FormData(form)

                    try {
                      await register({
                        day: formData.get('day') as string,
                        email: formData.get('email') as string,
                        eventId: event.id,
                        slot: formData.get('slot') as string,
                      })
                      form.reset()
                      setParticipantsCount((currentCount) => currentCount + 1)
                      setSubmitted(true)
                    } catch (submitError) {
                      setError(
                        submitError instanceof Error ? submitError.message : 'Înscrierea a eșuat.',
                      )
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Zi</span>
                    <select
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      name="day"
                      onChange={(changeEvent) => setSelectedDay(changeEvent.target.value)}
                      required
                      value={selectedDay}
                    >
                      {dayOptions.map((day) => (
                        <option key={day.dayId} value={day.dayId}>
                          {day.dayLabel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Interval</span>
                    <select
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={slotsForSelectedDay.length === 0}
                      name="slot"
                      onChange={(changeEvent) => setSelectedSlot(changeEvent.target.value)}
                      required
                      value={selectedSlot}
                    >
                      {slotsForSelectedDay.map((slot) => (
                        <option key={slot.slotId} value={slot.slotId}>
                          {slot.slotLabel} ({slot.remaining} locuri rămase)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Email</span>
                    <input
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      name="email"
                      placeholder="nume@exemplu.com"
                      required
                      type="email"
                    />
                  </label>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="mt-2 flex gap-3">
                    <Button
                      className="flex-1"
                      disabled={isSubmitting || !selectedDay || !selectedSlot}
                      type="submit"
                    >
                      {isSubmitting ? 'Se trimite...' : 'Confirmă înscrierea'}
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => setIsOpen(false)}
                      type="button"
                      variant="outline"
                    >
                      Anulează
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

async function register(args: { email: string; eventId: string; day: string; slot: string }) {
  const response = await fetch('/api/event-registrations', {
    body: JSON.stringify({
      day: args.day,
      email: args.email,
      event: args.eventId,
      slot: args.slot,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  const json = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.message ?? json?.message ?? 'Înscrierea a eșuat.')
  }
}

function Participants({
  accentColor,
  event,
  participantsCount,
}: {
  accentColor: string
  event: SignupEvent
  participantsCount: number
}) {
  const capacity = event.capacity ?? 0
  const percentage = capacity > 0 ? Math.min((participantsCount / capacity) * 100, 100) : 0

  return (
    <div className="mt-5 rounded-xl bg-background/10 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-card-foreground/65">
          <Users aria-hidden className="size-4" />
          Participanți
        </span>
        <span className="font-bold">
          {participantsCount}
          {capacity > 0 && ` / ${capacity}`}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/20">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ backgroundColor: accentColor, width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
