'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ManagedEvent } from './ProjectManagerDashboard'
import type { RemoteProjectData, SlotSummary } from '@/utilities/eventOperationsTypes'
import { shiftSnapshotKey } from '@/utilities/eventOperationsTypes'
import { parseCountedMoneyBani } from '@/utilities/eventPayment'
import { usePaymentDialogFocus } from './EventPaymentFields'

const money = (value: number) =>
  value.toLocaleString('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
const dateTime = (value: string) => (value ? new Date(value).toLocaleString('ro-RO') : '')
type Mode = 'handover' | 'close' | 'reopen'
export function ShiftOperationsPanel(props: {
  event: ManagedEvent
  data: RemoteProjectData
  selected: string
  manager: boolean
  onUpdated: () => void
  onDialogChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<Mode | null>(null)
  useEffect(() => {
    props.onDialogChange(Boolean(mode))
    return () => props.onDialogChange(false)
  }, [mode, props.onDialogChange])
  const [dayId, slotId] = props.selected.split(':')
  const day = props.event.days.find((day) => day.id === dayId),
    slot = day?.slots.find((slot) => slot.id === slotId)
  const summary = props.data.slots.find((row) => row.day === dayId && row.slot === slotId)
  const shift = props.data.shifts.find((row) => row.day === dayId && row.slot === slotId)
  if (!slot || !day || !summary)
    return (
      <p className="text-sm opacity-80">
        Selectează o tură pentru echipă, predare și închiderea încasărilor.
      </p>
    )
  const canEdit =
    props.manager ||
    !shift?.members.length ||
    shift.members.some((member) => member.id === props.data.viewerId)
  return (
    <section
      aria-label="Tura selectată"
      className="rounded-xl border border-current/15 bg-card p-4 text-card-foreground"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">
            {day.label} · {slot.label}
          </h3>
          <p className="mt-1 text-xs opacity-80">
            Capacitatea include participanții și însoțitorii.
          </p>
        </div>
        {shift?.closing && (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
            Tură închisă
          </span>
        )}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums">
        <div>
          <dt className="text-xs opacity-80">Persoane sosite</dt>
          <dd className="mt-0.5 font-bold">
            {summary.presentPeople} / {summary.capacity}
          </dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">De sosit</dt>
          <dd className="mt-0.5 font-bold">{summary.pendingPeople}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">Locuri rezervate</dt>
          <dd className="mt-0.5 font-bold">{summary.reservedPeople}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">Locuri disponibile</dt>
          <dd className="mt-0.5 font-bold">
            {Math.max(0, summary.capacity - summary.reservedPeople)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm">
        <strong>Echipă:</strong>{' '}
        {shift?.members.length
          ? shift.members.map((member) => member.name).join(', ')
          : 'Neatribuită'}
      </p>
      {shift?.handoverNote && (
        <div className="mt-3 text-sm">
          <p className="font-semibold">Notă de predare</p>
          <p className="mt-1 whitespace-pre-wrap break-words leading-6">{shift.handoverNote}</p>
          <p className="mt-1 text-xs opacity-80">
            {shift.updatedBy} · {dateTime(shift.updatedAt)}
          </p>
        </div>
      )}
      {shift?.closing && (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            Închisă de {shift.closing.actorName} · {dateTime(shift.closing.createdAt)}
          </p>
          {props.manager && (
            <>
              <p>
                Total înregistrat: <strong>{money(shift.closing.totalCollected)}</strong> ·
                Verificat: <strong>{money(shift.closing.countedAmount)}</strong> · Diferență:{' '}
                <strong>{money(shift.closing.difference)}</strong>
              </p>
              {shift.closing.legacyConsumptionCount > 0 && (
                <p>
                  Consumație istorică nespecificată: {shift.closing.legacyConsumptionCount}{' '}
                  înscrieri.
                </p>
              )}
              {shift.closing.note && (
                <p className="whitespace-pre-wrap break-words">{shift.closing.note}</p>
              )}
              <a
                className="inline-flex min-h-9 items-center font-semibold underline"
                href={`/members/projects/operations?eventId=${encodeURIComponent(props.event.id)}&closingId=${encodeURIComponent(shift.closing.id)}`}
              >
                Exportă închiderea CSV
              </a>
            </>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {canEdit && (
          <button
            type="button"
            className="min-h-11 rounded-lg border border-current/20 px-3 text-sm font-semibold hover:bg-accent/15"
            onClick={() => setMode('handover')}
          >
            {props.manager ? 'Echipă și predare' : 'Editează predarea'}
          </button>
        )}
        {props.manager && (
          <button
            type="button"
            className="min-h-11 rounded-lg border border-current/20 px-3 text-sm font-semibold hover:bg-accent/15"
            onClick={() => setMode(shift?.closing ? 'reopen' : 'close')}
          >
            {shift?.closing ? 'Redeschide tura' : 'Închide tura'}
          </button>
        )}
      </div>
      {mode && (
        <ShiftDialog
          key={`${props.selected}:${mode}`}
          {...props}
          mode={mode}
          summary={summary}
          onClose={() => setMode(null)}
        />
      )}
    </section>
  )
}

function ShiftDialog(props: {
  event: ManagedEvent
  data: RemoteProjectData
  selected: string
  manager: boolean
  onUpdated: () => void
  mode: Mode
  summary: SlotSummary
  onClose: () => void
}) {
  const form = usePaymentDialogFocus()
  const [day, slot] = props.selected.split(':')
  const initial = props.data.shifts.find((row) => row.day === day && row.slot === slot)
  const [snapshot] = useState(props.summary)
  const [expectedUpdatedAt] = useState(initial?.updatedAt || '')
  const [closingId] = useState(initial?.closing?.id)
  const [note, setNote] = useState(props.mode === 'handover' ? initial?.handoverNote || '' : '')
  const [members, setMembers] = useState(
    (initial?.members ?? [])
      .map((row) => row.id)
      .filter((id) => props.event.checkInMembers.some((member) => member.id === id)),
  )
  const [counted, setCounted] = useState('')
  const [legacyAcknowledged, setLegacyAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const title =
    props.mode === 'handover'
      ? 'Predare tură'
      : props.mode === 'close'
        ? 'Închide tura'
        : 'Redeschide tura'
  const countedBani = parseCountedMoneyBani(counted)
  const difference =
    countedBani == null
      ? null
      : countedBani -
        Math.round(snapshot.donation * 100) -
        Math.round(snapshot.consumptionAmount * 100)
  const needsNote =
    props.mode === 'reopen' ||
    (props.mode === 'close' && (difference !== 0 || snapshot.legacyConsumptionCount > 0))
  const valid =
    !busy &&
    !stale &&
    (!needsNote || note.trim().length >= 5) &&
    (props.mode !== 'close' ||
      (countedBani !== null && (!snapshot.legacyConsumptionCount || legacyAcknowledged)))
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) props.onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [busy, props.onClose])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/members/projects/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: props.event.id,
          day,
          slot,
          action:
            props.mode === 'handover'
              ? 'save-shift'
              : props.mode === 'close'
                ? 'close-shift'
                : 'reopen-shift',
          expectedUpdatedAt,
          handoverNote: note,
          ...(props.manager && props.mode === 'handover' ? { memberIds: members } : {}),
          snapshot: shiftSnapshotKey(snapshot),
          countedAmount: counted,
          legacyAcknowledged,
          note,
          reason: note,
          closingId,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 409) setStale(true)
        throw new Error(result.message || 'Tura nu a putut fi salvată.')
      }
      props.onUpdated()
      props.onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tura nu a putut fi salvată.')
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
    >
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-dialog-title"
        noValidate
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white text-[#152039] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e7ebf0] px-4 py-4 sm:px-6">
          <h2 id="shift-dialog-title" className="text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Închide"
            disabled={busy}
            onClick={props.onClose}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-[#f2f4f7]"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-5 sm:px-6">
          {props.mode === 'close' && (
            <>
              <p className="text-sm leading-6">
                Verifică încasările acestei ture, incluzând toate metodele de plată. Închiderea
                păstrează totalurile și blochează modificarea înscrierilor până la redeschiderea de
                către un manager.
              </p>
              <dl className="space-y-2 rounded-lg bg-[#f2f9fc] p-3 text-sm tabular-nums">
                {[
                  ['Donații', snapshot.donation],
                  ['Consumație înregistrată', snapshot.consumptionAmount],
                  ['Total înregistrat', snapshot.totalCollected],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex flex-wrap justify-between gap-2">
                    <dt>{label}</dt>
                    <dd className="font-bold">{money(Number(value))}</dd>
                  </div>
                ))}
              </dl>
              <label className="block text-sm font-semibold">
                Total numărat / verificat (RON)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={counted}
                  disabled={busy || stale}
                  onChange={(event) => setCounted(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-[#d7dde6] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </label>
              <p
                role="status"
                className={`text-sm font-semibold ${difference ? 'text-red-700' : ''}`}
              >
                Diferență: {difference == null ? '—' : money(difference / 100)}
              </p>
              {snapshot.legacyConsumptionCount > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>
                    {snapshot.legacyConsumptionCount} înscrieri nu au consumația istorică
                    înregistrată separat. Această sumă nu este estimată și nu este adăugată automat.
                  </p>
                  <label className="flex items-start gap-2">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={legacyAcknowledged}
                      onChange={(event) => setLegacyAcknowledged(event.target.checked)}
                      disabled={busy || stale}
                    />
                    Am verificat încasările istorice și am explicat diferențele în notă.
                  </label>
                </div>
              )}
            </>
          )}
          {props.mode === 'handover' && props.manager && (
            <fieldset disabled={busy || stale}>
              <legend className="mb-2 text-sm font-semibold">Echipa turei</legend>
              <div className="space-y-2">
                {props.event.checkInMembers.length ? (
                  props.event.checkInMembers.map((member) => (
                    <label key={member.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={members.includes(member.id)}
                        onChange={() =>
                          setMembers((current) =>
                            current.includes(member.id)
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id],
                          )
                        }
                      />
                      {member.name}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-[#536071]">
                    Adaugă mai întâi voluntari în fila Echipă check-in.
                  </p>
                )}
              </div>
            </fieldset>
          )}
          <label className="block text-sm font-semibold">
            {props.mode === 'handover'
              ? 'Notă pentru următoarea echipă'
              : props.mode === 'reopen'
                ? 'Motivul redeschiderii'
                : 'Notă de închidere / explicația diferenței'}
            {needsNote ? ' *' : ''}
            <textarea
              required={needsNote}
              minLength={needsNote ? 5 : undefined}
              maxLength={props.mode === 'handover' ? 5000 : 2000}
              value={note}
              disabled={busy || stale}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-[#d7dde6] p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {stale && (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold underline"
              onClick={() => {
                props.onUpdated()
                props.onClose()
              }}
            >
              Reîncarcă datele și revino la tură
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e7ebf0] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={props.onClose}
            className="min-h-11 rounded-lg border border-[#d7dde6] px-4 font-semibold"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy
              ? 'Se salvează…'
              : props.mode === 'handover'
                ? 'Salvează predarea'
                : props.mode === 'close'
                  ? 'Confirmă închiderea'
                  : 'Confirmă redeschiderea'}
          </button>
        </div>
      </form>
    </div>
  )
}
