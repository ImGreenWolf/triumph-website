'use client'
import type { ManagedEvent, ManagedRegistration } from './ProjectManagerDashboard'
import { registrationPeople } from '@/utilities/eventPeople'

export function capacityIssue(
  event: ManagedEvent,
  day: string,
  slot: string,
  guests: number,
  registration?: ManagedRegistration,
) {
  const configured = event.days
    .find((item) => item.id === day)
    ?.slots.find((item) => item.id === slot)
  const summary = event.serverData?.slots.find((item) => item.day === day && item.slot === slot)
  const occupied =
    summary?.reservedPeople ??
    (event.registrations ?? [])
      .filter((item) => item.status !== 'cancelled' && item.day === day && item.slot === slot)
      .reduce((sum, item) => sum + registrationPeople(item), 0)
  const previous =
    registration &&
    registration.status !== 'cancelled' &&
    registration.day === day &&
    registration.slot === slot
      ? registrationPeople(registration)
      : 0
  const additional = 1 + guests - previous
  const closed = Boolean(
    event.serverData?.shifts.find((item) => item.day === day && item.slot === slot)?.closing,
  )
  return {
    closed,
    occupied,
    capacity: configured?.capacity ?? 0,
    exceeds: additional > 0 && occupied + additional > (configured?.capacity ?? 0),
  }
}

export function CapacityOverrideFields(props: {
  issue: ReturnType<typeof capacityIssue>
  manager: boolean
  reason: string
  onChange: (reason: string) => void
  disabled: boolean
}) {
  if (props.issue.closed)
    return (
      <p role="status" className="text-sm font-semibold text-red-700">
        Tura este închisă. Un manager trebuie să o redeschidă înainte de modificări.
      </p>
    )
  if (!props.issue.exceeds) return null
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p role="status">
        Capacitate: {props.issue.capacity} persoane. Sunt deja {props.issue.occupied} locuri
        rezervate. Grupul depășește locurile disponibile.
      </p>
      {props.manager ? (
        <label className="block font-semibold">
          Motivul depășirii (aprobare manager)
          <textarea
            required
            minLength={5}
            maxLength={500}
            disabled={props.disabled}
            value={props.reason}
            onChange={(event) => props.onChange(event.target.value)}
            className="mt-2 min-h-20 w-full rounded-lg border border-amber-300 bg-white p-3 text-[#152039] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      ) : (
        <p className="font-semibold">Doar un manager poate aproba depășirea capacității.</p>
      )}
    </div>
  )
}
