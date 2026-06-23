'use client'

import { Button } from '@/components/ui/button'
import { trackEventSignup } from '@/lib/ga4/appEvents'
import type { Event } from '@/payload-types'
import { getContrastTextColor, isEventCompleted } from '@/utilities/eventDisplay'
import type { EventSlotAvailability } from '@/utilities/eventRegistration'
import { CheckCircle2, Coins, Ticket, Users, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

type SignupFormProps = {
  accentColor: string
  event: SignupEvent
  slotAvailability: EventSlotAvailability[]
  cardColor: string
  backgroundColor: string
}

type SignupEvent = Pick<Event, 'capacity' | 'days' | 'id' | 'private' | 'name'> & {
  participantsCount: number
  totalDonation: number
}

export default function SignupForm({ accentColor, backgroundColor, event, slotAvailability, cardColor }: SignupFormProps) {
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
  const hasConfiguredSlots = slotAvailability.length > 0
  const hasSlotsWithRemainingCapacity = slotAvailability.some((slot) => slot.remaining > 0)
  const hasOpenRegistrationSlots = slotAvailability.some((slot) => slot.isRegistrationOpen)
  const signupButtonLabel = getSignupButtonLabel({
    availableSlotsCount: availableSlots.length,
    eventHasEnded,
    eventIsPrivate,
    hasConfiguredSlots,
    hasOpenRegistrationSlots,
    hasSlotsWithRemainingCapacity,
  })

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
    <section className="rounded-2xl border border-border p-5 text-card-foreground shadow-xl shadow-black/15"
    style={{ backgroundColor: cardColor, color: getContrastTextColor(cardColor) }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: accentColor, color: getContrastTextColor(accentColor) }}
        >
          <Ticket aria-hidden className="size-5" />
        </div>
        <div>
          <p className="text-lg font-bold">Înscrieri {event.name}</p>
          <p className="mt-1 text-sm leading-5 opacity-60">
            Completează formularul cu ziua și intervalul dorit.
          </p>
        </div>
      </div>

      <Participants accentColor={accentColor} backgroundColor={backgroundColor} event={event} participantsCount={participantsCount} />
      
      <Button
        className="mt-4 w-full"
        disabled={eventIsPrivate || availableSlots.length === 0 || eventHasEnded}
        onClick={openDialog}
        style={{ backgroundColor: accentColor, color: getContrastTextColor(accentColor) }}
      >
        {signupButtonLabel}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="relative max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl md:p-6"
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
                    Selectează ziua și intervalul, apoi completează datele de contact.
                  </p>
                </div>

                <form
                  className="flex flex-col gap-5"
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
                        name: formData.get('name') as string,
                        phone: formData.get('phone') as string,
                        questions: formData.get('questions') as string,
                        slot: formData.get('slot') as string,
                      })
                      form.reset()
                      setParticipantsCount((currentCount) => currentCount + 1)
                      setSubmitted(true)
                      trackEventSignup({
                        day: formData.get('day') as string,
                        eventId: event.id,
                        eventName: event.name,
                        slot: formData.get('slot') as string,
                      })
                    } catch (submitError) {
                      setError(
                        submitError instanceof Error ? submitError.message : 'Înscrierea a eșuat.',
                      )
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  <input name="day" readOnly required type="hidden" value={selectedDay} />
                  <input name="slot" readOnly required type="hidden" value={selectedSlot} />

                  <fieldset className="min-w-0">
                    <legend className="mb-2 text-sm font-semibold">Zi</legend>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                      {dayOptions.map((day) => (
                        <button
                          className={`min-h-14 min-w-36 shrink-0 rounded-md border px-3 py-2 text-left text-sm font-semibold leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selectedDay === day.dayId
                              ? 'border-transparent text-white shadow-md'
                              : 'border-border bg-background/40 text-card-foreground hover:border-card-foreground/30 hover:bg-background/70'
                          }`}
                          key={day.dayId}
                          onClick={() => {
                            setSelectedDay(day.dayId)
                            setSelectedSlot(
                              availableSlots.find((slot) => slot.dayId === day.dayId)?.slotId ?? '',
                            )
                          }}
                          style={
                            selectedDay === day.dayId
                              ? {
                                  backgroundColor: accentColor,
                                  color: getContrastTextColor(accentColor),
                                }
                              : undefined
                          }
                          type="button"
                        >
                          {day.dayLabel}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Interval</legend>
                    <div className="grid grid-cols-4 gap-2">
                      {slotsForSelectedDay.map((slot) => (
                        <button
                          className={`rounded-md border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selectedSlot === slot.slotId
                              ? 'border-transparent text-white shadow-md'
                              : 'border-border bg-background/40 text-card-foreground hover:border-card-foreground/30 hover:bg-background/70'
                          }`}
                          key={slot.slotId}
                          onClick={() => setSelectedSlot(slot.slotId)}
                          style={
                            selectedSlot === slot.slotId
                              ? {
                                  backgroundColor: accentColor,
                                  color: getContrastTextColor(accentColor),
                                }
                              : undefined
                          }
                          type="button"
                        >
                          <span className="block text-sm font-bold">{slot.slotLabel}</span>
                          <span className="mt-1 block text-xs opacity-75">
                            {slot.remaining} locuri rămase
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">Nume</span>
                      <input
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        name="name"
                        placeholder="Nume complet"
                        required
                        type="text"
                      />
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

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold">Telefon</span>
                      <input
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        name="phone"
                        placeholder="+40 700 000 000"
                        required
                        type="tel"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Întrebări</span>
                    <textarea
                      className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      name="questions"
                      placeholder="Scrie aici orice întrebare pentru organizatori."
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

function getSignupButtonLabel(args: {
  availableSlotsCount: number
  eventHasEnded: boolean
  eventIsPrivate: boolean
  hasConfiguredSlots: boolean
  hasOpenRegistrationSlots: boolean
  hasSlotsWithRemainingCapacity: boolean
}) {
  if (args.eventIsPrivate) return 'Înscrierile sunt private'
  if (args.eventHasEnded) return 'Eveniment încheiat'
  if (args.availableSlotsCount > 0) return 'Înscrie-te acum'
  if (!args.hasConfiguredSlots) return 'Nu există intervale disponibile'
  if (!args.hasSlotsWithRemainingCapacity) return 'Nu mai sunt locuri disponibile'
  if (!args.hasOpenRegistrationSlots) return 'Înscrierile pentru intervale s-au închis'

  return 'Nu mai sunt intervale disponibile'
}

async function register(args: {
  email: string
  eventId: string
  day: string
  name: string
  phone: string
  questions: string
  slot: string
}) {
  const response = await fetch('/api/event-registrations', {
    body: JSON.stringify({
      day: args.day,
      email: args.email,
      event: args.eventId,
      name: args.name,
      phone: args.phone,
      questions: args.questions,
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
  backgroundColor,
  event,
  participantsCount,
}: {
  accentColor: string
  backgroundColor: string
  event: SignupEvent
  participantsCount: number
}) {
  const capacity = event.capacity ?? 0
  const percentage = capacity > 0 ? Math.min((participantsCount / capacity) * 100, 100) : 0

  return (
    <div className="mt-5 rounded-xl p-4 flex flex-col gap-4"
    style={{backgroundColor: backgroundColor, color: getContrastTextColor(backgroundColor)}}
    >
      <div> 
        <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 opacity-80">
          <Users aria-hidden className="size-4" />
          Participanți
        </span>
        <span className="font-bold text-xl">
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

      <div className="flex flex-col justify-between text-sm">
        
          <span className="flex items-center gap-2 opacity-80">
              <Coins aria-hidden className="size-4"/>
              Donații Strânse
            </span>
          <span className="font-bold text-xl text-right">
            {event.totalDonation} RON
          </span>
      </div>
    </div>
  )
}
