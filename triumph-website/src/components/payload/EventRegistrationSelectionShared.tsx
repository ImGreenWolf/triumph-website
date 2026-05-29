'use client'

import { useEffect, useState } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { DefaultCellComponentProps, TextFieldClientProps } from 'payload'
import type { Event } from '@/payload-types'
import { findEventSlot, formatEventDayLabel, formatEventSlotLabel } from '@/utilities/eventRegistration'

type Variant = 'day' | 'slot'

type EventSummary = Pick<Event, 'days'>

const eventCache = new Map<string, Promise<EventSummary | null>>()

function getEventId(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }

  return null
}

function getSelectionLabel(args: {
  event: EventSummary | null
  dayId?: string | null
  slotId?: string | null
  variant: Variant
}) {
  if (!args.dayId) return '-'
  if (!args.event) return args.dayId

  const { day, slot } = findEventSlot(args.event, args.dayId, args.slotId ?? '')

  if (!day?.eventDate) return args.variant === 'day' ? args.dayId : args.slotId ?? '-'
  if (args.variant === 'day') return formatEventDayLabel(day.eventDate)

  if (!slot) return args.slotId ?? '-'

  return formatEventSlotLabel(slot.startTime, slot.endTime)
}

function useEventSelectionLabel(args: { eventId: string | null; dayId?: string | null; slotId?: string | null; variant: Variant }) {
  const [event, setEvent] = useState<EventSummary | null>(null)

  useEffect(() => {
    if (!args.eventId) {
      setEvent(null)
      return
    }

    let mounted = true

    void getEventSummary(args.eventId).then((result) => {
      if (mounted) setEvent(result)
    })

    return () => {
      mounted = false
    }
  }, [args.eventId])

  return getSelectionLabel({
    dayId: args.dayId,
    event,
    slotId: args.slotId,
    variant: args.variant,
  })
}

async function getEventSummary(eventId: string) {
  const cached = eventCache.get(eventId)

  if (cached) return cached

  const request = fetch(`/api/events/${eventId}`).then(async (response) => {
    if (!response.ok) return null

    return (await response.json()) as EventSummary
  })

  eventCache.set(eventId, request)
  return request
}

function SelectionText(props: { value: string }) {
  return <span>{props.value}</span>
}

export function EventRegistrationSelectionCell(
  props: DefaultCellComponentProps & {
    variant: Variant
  },
) {
  const row = props.rowData as {
    day?: string | null
    slot?: string | null
    event?: unknown
  }

  const label = useEventSelectionLabel({
    dayId: row.day,
    eventId: getEventId(row.event),
    slotId: row.slot,
    variant: props.variant,
  })

  return <SelectionText value={label} />
}

export function EventRegistrationSelectionField(
  props: TextFieldClientProps & {
    variant: Variant
  },
) {
  const { value } = useField<string>({
    path: props.path,
  })
  const eventField = useFormFields(([fields]) => fields.event?.value)
  const dayField = useFormFields(([fields]) => fields.day?.value as string | null | undefined)
  const slotField = useFormFields(([fields]) => fields.slot?.value as string | null | undefined)

  const label = useEventSelectionLabel({
    dayId: props.variant === 'day' ? value : dayField,
    eventId: getEventId(eventField),
    slotId: props.variant === 'slot' ? value : slotField,
    variant: props.variant,
  })

  return (
    <div className="field-type">
      <label className="field-label">{getFieldLabel(props.field.label, props.field.name)}</label>
      <div
        style={{
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '6px',
          minHeight: '48px',
          padding: '12px 14px',
        }}
      >
        <SelectionText value={label} />
      </div>
    </div>
  )
}

function getFieldLabel(label: unknown, fallback: string) {
  if (typeof label === 'string') return label

  return fallback
}
