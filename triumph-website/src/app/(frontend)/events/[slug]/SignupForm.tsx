'use client'

import { Button } from '@/components/ui/button'
import { Event } from '@/payload-types'
import type { EventSlotAvailability } from '@/utilities/eventRegistration'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

type SignupFormProps = {
  event: Event
  slotAvailability: EventSlotAvailability[]
}

export default function SignupForm({ event, slotAvailability }: SignupFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [isFinished, setIsFinished] = useState(false)
  const availableSlots = slotAvailability.filter((slot) => slot.isAvailable)
  const dayOptions = availableSlots.reduce<Array<{ dayId: string; dayLabel: string }>>((allDays, slot) => {
    if (allDays.some((day) => day.dayId === slot.dayId)) return allDays

    allDays.push({
      dayId: slot.dayId,
      dayLabel: slot.dayLabel,
    })

    return allDays
  }, [])
  const slotsForSelectedDay = availableSlots.filter((slot) => slot.dayId === selectedDay)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
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

    const firstAvailableDay = dayOptions[0]?.dayId ?? ''

    setSelectedDay((currentDay) => {
      if (dayOptions.some((day) => day.dayId === currentDay)) return currentDay
      return firstAvailableDay
    })
  }, [dayOptions, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const firstAvailableSlot = availableSlots.find((slot) => slot.dayId === selectedDay)?.slotId ?? ''

    setSelectedSlot((currentSlot) => {
      if (availableSlots.some((slot) => slot.dayId === selectedDay && slot.slotId === currentSlot)) {
        return currentSlot
      }

      return firstAvailableSlot
    })
    
  }, [availableSlots, isOpen, selectedDay])


  useEffect(() => setIsFinished(new Date(availableSlots[0].startTime!).getTime() < new Date().getTime()), [])
    console.log(isFinished)
    if(isFinished)
        return (<Participants event={event}/>)
    else
  return (
    <div>
        <Participants event={event}/>
      <Button onClick={() => setIsOpen(true)} className="w-full" disabled={availableSlots.length === 0 || isFinished}>
        {availableSlots.length === 0 ? 'Nu mai sunt locuri' : 'Inscrie-te'}
      </Button>
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 text-primary"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Inchide formularul"
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6 pr-8">
              <h3 className="text-xl font-semibold">Inscriere la eveniment</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Alege ziua si intervalul dorit, apoi lasa adresa ta de email.
              </p>
            </div>

            <form
              className="flex flex-col gap-4 text-primary"
              onSubmit={async (e) => {
                e.preventDefault()
                setIsSubmitting(true)
                setError(null)
                const form = e.currentTarget

                const formData = new FormData(form)

                try {
                  await register({
                    day: formData.get('day') as string,
                    email: formData.get('email') as string,
                    eventId: event.id,
                    slot: formData.get('slot') as string,
                  })
                  form.reset()
                  setSelectedDay(dayOptions[0]?.dayId ?? '')
                  setSelectedSlot(availableSlots.find((slot) => slot.dayId === dayOptions[0]?.dayId)?.slotId ?? '')
                  setIsOpen(false)
                  alert('Te-ai inscris cu succes.')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Inscrierea a esuat.')
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Zi</span>
                <select
                  name="day"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  required
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {dayOptions.map((day) => (
                    <option key={day.dayId} value={day.dayId}>
                      {day.dayLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Interval</span>
                <select
                  name="slot"
                  value={selectedSlot}
                  onChange={(event) => setSelectedSlot(event.target.value)}
                  required
                  disabled={slotsForSelectedDay.length === 0}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {slotsForSelectedDay.map((slot) => (
                    <option key={slot.slotId} value={slot.slotId}>
                      {slot.slotLabel} ({slot.remaining} locuri ramase)
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="nume@exemplu.com"
                  required
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || availableSlots.length === 0 || !selectedDay || !selectedSlot}
                  className="flex-1"
                >
                  {isSubmitting ? 'Se trimite...' : 'Trimite'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setIsOpen(false)}
                >
                  Anuleaza
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

async function register(args: { email: string; eventId: string; day: string; slot: string }) {
  const response = await fetch('/api/event-registrations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      day: args.day,
      email: args.email,
      event: args.eventId,
      slot: args.slot,
    }),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.errors?.[0]?.message ?? 'Inscrierea a esuat.')
  }
}

function Participants(props: {event: Event}) {
    const {event} = props

    const participants =
    typeof event.registrations === 'object' &&
    event.registrations !== null &&
    event.registrations.docs
      ? event.registrations.docs.length
      : 0

  return <div className='bg-primary text-black rounded-md my-2 p-2 py-4'>
    
    <span>{participants} participanti</span>
    
    <div className='bg-accent h-2 rounded-full' style={{width: participants/event.capacity!*100 + "%"}}></div>
    </div>
}
