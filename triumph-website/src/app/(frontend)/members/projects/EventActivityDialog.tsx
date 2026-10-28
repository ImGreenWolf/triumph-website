'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { EventActivityItem } from '@/utilities/eventOperationsTypes'
import { usePaymentDialogFocus } from './EventPaymentFields'

const actions: Record<string, string> = {
  'check-in': 'Check-in confirmat',
  payment: 'Încasare modificată',
  update: 'Înscriere modificată',
  cancel: 'Înscriere anulată',
  signup: 'Înscriere publică',
  import: 'Import CSV',
  'walk-in': 'Participant fără înscriere',
  undo: 'Modificare anulată',
  'shift-handover': 'Predare tură',
  'shift-close': 'Tură închisă',
  'shift-reopen': 'Tură redeschisă',
}
const fields: Record<string, string> = {
  ageGroup: 'Vârstă',
  consumptionAmount: 'Consumație',
  donation: 'Donație',
  day: 'Zi',
  slot: 'Tură',
  email: 'Email',
  phone: 'Telefon',
  name: 'Nume',
  guests: 'Însoțitori',
  status: 'Status',
  timeOfArrival: 'Sosire',
  questions: 'Observații',
  members: 'Echipă',
  handoverNote: 'Predare',
  closing: 'Închidere',
  totalCollected: 'Total înregistrat',
  countedAmount: 'Total verificat',
  difference: 'Diferență',
}
const statuses: Record<string, string> = {
  present: 'Prezent',
  registered: 'În așteptare',
  absent: 'Absent',
  cancelled: 'Anulat',
  minor: 'Minor',
  adult: 'Major',
}
const valueText = (value: unknown) =>
  value == null || value === ''
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : statuses[String(value)] || String(value)

export function EventActivityDialog(props: {
  eventId: string
  showPersonalData: boolean
  onClose: () => void
  onUpdated: () => void
}) {
  const form = usePaymentDialogFocus()
  const [page, setPage] = useState(1),
    [generation, setGeneration] = useState(0)
  const [data, setData] = useState<{ items: EventActivityItem[]; totalPages: number } | null>(null)
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<EventActivityItem | null>(null)
  const [reason, setReason] = useState(''),
    [override, setOverride] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    fetch(
      `/members/projects/operations?eventId=${encodeURIComponent(props.eventId)}&page=${page}`,
      { signal: controller.signal, cache: 'no-store' },
    )
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Istoricul nu a putut fi încărcat.')
        if (!controller.signal.aborted) setData(result)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [props.eventId, page, generation])
  async function undo(event: React.FormEvent) {
    event.preventDefault()
    if (
      !selected ||
      busy ||
      reason.trim().length < 5 ||
      (override.trim() && override.trim().length < 5)
    )
      return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/members/projects/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: props.eventId,
          action: 'undo',
          activityId: selected.id,
          reason,
          capacityOverrideReason: override,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Modificarea nu a putut fi anulată.')
      setSelected(null)
      setReason('')
      setOverride('')
      setGeneration((n) => n + 1)
      props.onUpdated()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Modificarea nu a putut fi anulată.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-[#09101f]/65 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) props.onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          event.stopPropagation()
          props.onClose()
        }
      }}
    >
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        onSubmit={undo}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white text-[#152039] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e7ebf0] p-4 sm:px-6">
          <h2 id="activity-title" className="text-xl font-bold">
            Istoricul evenimentului
          </h2>
          <button
            type="button"
            aria-label="Închide istoricul"
            disabled={busy}
            onClick={props.onClose}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-[#f2f4f7]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-4 p-4 sm:px-6">
          <p className="text-sm leading-6">
            Fiecare modificare păstrează autorul și valorile anterioare. Poți anula ultima
            modificare a unei înscrieri; anularea se adaugă în istoric.
          </p>
          {loading && <p role="status">Se încarcă istoricul…</p>}
          {data?.items.length === 0 && <p>Nu există modificări înregistrate încă.</p>}
          <ol className="divide-y divide-[#e7ebf0]">
            {data?.items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0">
                <p className="font-bold">
                  {actions[item.action] || 'Modificare'}
                  {item.participantName && props.showPersonalData
                    ? ` · ${item.participantName}`
                    : ''}
                </p>
                <p className="mt-1 text-xs text-[#536174]">
                  {item.actorName} ·{' '}
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString('ro-RO')}
                  </time>
                </p>
                {item.reason && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason}</p>
                )}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer py-2 font-semibold">
                    Vezi valorile modificate
                  </summary>
                  <dl className="space-y-2">
                    {item.changes.map((change) => (
                      <div key={change.field} className="break-words">
                        <dt className="font-semibold">{fields[change.field] || change.field}</dt>
                        <dd>
                          {!props.showPersonalData &&
                          ['name', 'email', 'phone', 'questions'].includes(change.field)
                            ? 'Date personale ascunse'
                            : `${valueText(change.before)} → ${valueText(change.after)}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {item.canUndo && (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 text-sm font-semibold underline"
                    onClick={() => {
                      setSelected(item)
                      setReason('')
                      setOverride('')
                      setError('')
                    }}
                  >
                    Anulează această modificare…
                  </button>
                )}
              </li>
            ))}
          </ol>
          {selected && (
            <fieldset disabled={busy} className="space-y-3 rounded-lg border border-[#d7dde6] p-3">
              <legend className="px-1 font-bold">Confirmă anularea</legend>
              <p className="text-sm">
                {actions[selected.action] || 'Modificare'} · {selected.actorName}. Valorile
                anterioare vor fi restaurate, inclusiv plata și tura.
              </p>
              <label className="block text-sm font-semibold">
                Motivul anulării *
                <textarea
                  required
                  minLength={5}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 min-h-20 w-full rounded-lg border border-[#d7dde6] p-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Motiv pentru depășirea capacității, dacă este necesar
                <input
                  value={override}
                  onChange={(event) => setOverride(event.target.value)}
                  minLength={5}
                  maxLength={500}
                  className="mt-2 h-11 w-full rounded-lg border border-[#d7dde6] px-3 font-normal"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="min-h-11 px-3 font-semibold underline"
                  onClick={() => setSelected(null)}
                >
                  Renunță
                </button>
                <button
                  type="submit"
                  disabled={
                    reason.trim().length < 5 ||
                    Boolean(override.trim() && override.trim().length < 5)
                  }
                  className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Se anulează…' : 'Confirmă anularea'}
                </button>
              </div>
            </fieldset>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {!busy && (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold underline"
              onClick={() => {
                setSelected(null)
                setGeneration((n) => n + 1)
              }}
            >
              Reîncarcă istoricul
            </button>
          )}
        </div>
        <nav
          aria-label="Paginare istoric"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ebf0] p-4 text-sm"
        >
          <button
            type="button"
            disabled={loading || busy || page <= 1}
            className="min-h-11 px-3 font-semibold disabled:opacity-50"
            onClick={() => {
              setSelected(null)
              setPage((n) => n - 1)
            }}
          >
            Anterior
          </button>
          <span>
            Pagina {page} din {data?.totalPages || 1}
          </span>
          <button
            type="button"
            disabled={loading || busy || !data || page >= data.totalPages}
            className="min-h-11 px-3 font-semibold disabled:opacity-50"
            onClick={() => {
              setSelected(null)
              setPage((n) => n + 1)
            }}
          >
            Următor
          </button>
        </nav>
      </form>
    </div>
  )
}
