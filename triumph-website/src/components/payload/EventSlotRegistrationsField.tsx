'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banner, FieldLabel, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'
import { Label } from '../ui/label'

type CountState =
  | { status: 'idle'; count: number | null }
  | { status: 'loading'; count: number | null }
  | { status: 'loaded'; count: number }
  | { status: 'error'; count: null }

function getFieldValue(fields: Record<string, { value?: unknown }>, path: string) {
  return fields[path]?.value
}

export default function EventSlotRegistrationsField(props: UIFieldClientProps) {
  const fields = useFormFields(([formFields]) => formFields)
  const { data, id } = useDocumentInfo()
  const [countState, setCountState] = useState<CountState>({ status: 'idle', count: null })

  const indices = useMemo(() => {
    const match = props.path.match(/days\.(\d+)\.slots\.(\d+)\./)

    if (!match) return null

    return {
      dayIndex: Number(match[1]),
      slotIndex: Number(match[2]),
    }
  }, [props.path])

  const eventId =
    typeof id === 'string' || typeof id === 'number'
      ? String(id)
      : typeof data?.id === 'string' || typeof data?.id === 'number'
        ? String(data.id)
        : null
  const dayId = indices
    ? (getFieldValue(fields, `days.${indices.dayIndex}.id`) as string | undefined)
    : undefined
  const slotId = indices
    ? (getFieldValue(fields, `days.${indices.dayIndex}.slots.${indices.slotIndex}.id`) as
        | string
        | undefined)
    : undefined

  useEffect(() => {
    if (!eventId || !dayId || !slotId) {
      setCountState({ status: 'idle', count: 0 })
      return
    }

    const controller = new AbortController()
    setCountState((current) => ({ status: 'loading', count: current.count }))

    void fetch(buildCountUrl({ dayId, eventId, slotId }), {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load slot registrations')

        const json = (await response.json()) as { people?: number }
        setCountState({
          status: 'loaded',
          count: json.people ?? 0,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        console.error(error)
        setCountState({ status: 'error', count: null })
      })

    return () => {
      controller.abort()
    }
  }, [dayId, eventId, slotId])

  return (
    <div className="field-type" style={{ alignSelf: 'end' }}>
      <FieldLabel label={''} />
      <Banner type={countState.status === 'error' ? 'error' : 'info'}>
        <strong>{renderCountState(countState, { dayId, eventId, slotId })}</strong>
      </Banner>
    </div>
  )
}

function renderCountState(
  state: CountState,
  ids: { eventId: string | null; dayId?: string; slotId?: string },
) {
  if (!ids.eventId) return 'Salveaza evenimentul pentru a vedea inscrierile pe slot.'
  if (!ids.dayId || !ids.slotId) return 'Salveaza slotul pentru a vedea inscrierile.'
  if (state.status === 'error') return 'Nu am putut incarca inscrierile pentru acest slot.'
  if (state.status === 'loading' && state.count == null) return 'Se incarca...'
  if (state.status === 'loading' && state.count != null)
    return `${state.count} persoane (inclusiv însoțitori)`
  if (state.count != null) return `${state.count} persoane (inclusiv însoțitori)`

  return '0 persoane'
}

function buildCountUrl(args: { eventId: string; dayId: string; slotId: string }) {
  const params = new URLSearchParams()

  params.set('capacity', '1')
  params.set('eventId', args.eventId)
  params.set('day', args.dayId)
  params.set('slot', args.slotId)

  return `/members/projects/data?${params.toString()}`
}
