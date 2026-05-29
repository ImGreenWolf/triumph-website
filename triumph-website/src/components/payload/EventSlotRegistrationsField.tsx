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
  const dayId = indices ? (getFieldValue(fields, `days.${indices.dayIndex}.id`) as string | undefined) : undefined
  const slotId = indices ? (getFieldValue(fields, `days.${indices.dayIndex}.slots.${indices.slotIndex}.id`) as string | undefined) : undefined

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

        const json = (await response.json()) as { totalDocs?: number }
        setCountState({
          status: 'loaded',
          count: json.totalDocs ?? 0,
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
    <div
      className="field-type"
      style={{alignSelf: 'end'}}  
    >
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
  if (state.status === 'loading' && state.count != null) return `${state.count} inscrisi`
  if (state.count != null) return `${state.count} inscrisi`

  return '0 inscrisi'
}

function buildCountUrl(args: { eventId: string; dayId: string; slotId: string }) {
  const params = new URLSearchParams()

  params.set('limit', '0')
  params.set('where[and][0][event][equals]', args.eventId)
  params.set('where[and][1][day][equals]', args.dayId)
  params.set('where[and][2][slot][equals]', args.slotId)
  params.set('where[and][3][status][not_equals]', 'cancelled')

  return `/api/event-registrations?${params.toString()}`
}
