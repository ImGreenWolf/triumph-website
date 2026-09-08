'use client'

import { Banner, FieldLabel, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type Absentee = {
  email: string
  id: string
  name?: string | null
}

type AbsenteesResponse = {
  calculationOpen: boolean
  docs: Absentee[]
  totalDocs: number
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; value: AbsenteesResponse }
  | { status: 'error' }

export default function MeetingAbsenteesField() {
  const { data, id } = useDocumentInfo()
  const meetingId = id ?? data?.id
  const [state, setState] = useState<LoadState>({ status: 'idle' })

  useEffect(() => {
    if (!meetingId) return

    const controller = new AbortController()
    setState({ status: 'loading' })

    void fetch(`/api/meetings/${meetingId}/absentees`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load meeting absentees')

        setState({ status: 'loaded', value: (await response.json()) as AbsenteesResponse })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        console.error(error)
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [meetingId])

  return (
    <div className="field-type">
      <FieldLabel label="Absenți" />
      <Banner type={state.status === 'error' ? 'error' : 'info'}>
        <strong>{getSummary(state, Boolean(meetingId))}</strong>
      </Banner>

      {state.status === 'loaded' && state.value.docs.length > 0 && (
        <ul style={{ display: 'grid', gap: '0.35rem', margin: '0.75rem 0 0', padding: 0 }}>
          {state.value.docs.map((member) => (
            <li
              key={member.id}
              style={{
                borderBottom: '1px solid var(--theme-elevation-150)',
                display: 'flex',
                flexDirection: 'column',
                listStyle: 'none',
                padding: '0.35rem 0 0.6rem',
              }}
            >
              <strong>{member.name || member.email}</strong>
              {member.name && <span style={{ opacity: 0.7 }}>{member.email}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function getSummary(state: LoadState, hasMeeting: boolean) {
  if (!hasMeeting) return 'Salvează întâlnirea pentru a calcula absențele.'
  if (state.status === 'idle' || state.status === 'loading') return 'Se încarcă...'
  if (state.status === 'error') return 'Absențele nu au putut fi încărcate.'
  if (!state.value.calculationOpen) return 'Absențele se calculează după încheierea întâlnirii.'

  return `${state.value.totalDocs} ${state.value.totalDocs === 1 ? 'absent' : 'absenți'}`
}
