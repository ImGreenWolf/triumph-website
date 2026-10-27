'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { DuplicateCleanupPlan } from '@/utilities/eventCheckInWarnings'
import { usePaymentDialogFocus } from './EventPaymentFields'

export function DuplicateCleanupDialog(props: {
  eventId: string
  labels: Record<string, string>
  onClose: () => void
  onComplete: (result: {
    message: string
    incomplete?: boolean
    registrations: { id: string; status: 'cancelled'; timeOfArrival: string | null }[]
  }) => void
}) {
  const form = usePaymentDialogFocus()
  const router = useRouter()
  const [plan, setPlan] = useState<DuplicateCleanupPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setPlan(null)
    setError(null)
    async function preview() {
      try {
        const response = await fetch('/members/projects/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ action: 'preview-duplicates', eventId: props.eventId }),
        })
        const result = await response.json()
        if (!response.ok || !result.plan)
          throw new Error(result.message || 'Lista nu a putut fi încărcată.')
        if (!controller.signal.aborted) setPlan(result.plan)
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Lista nu a putut fi încărcată.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void preview()
    return () => controller.abort()
  }, [props.eventId, attempt])
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) props.onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [saving, props.onClose])
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!plan?.removals.length || saving || loading) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/members/projects/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove-duplicates',
          eventId: props.eventId,
          removals: plan.removals,
        }),
      })
      const result = await response.json()
      if (response.status === 409 && result.plan) setPlan(result.plan)
      if (!response.ok || !Array.isArray(result.registrations))
        throw new Error(result.message || 'Duplicatele nu au putut fi eliminate.')
      props.onComplete(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Duplicatele nu au putut fi eliminate.')
    } finally {
      router.refresh()
      setSaving(false)
    }
  }
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) props.onClose()
      }}
    >
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-cleanup-title"
        aria-describedby="duplicate-cleanup-description"
        onSubmit={remove}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white text-[#152039] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e7ebf0] px-4 py-4 sm:px-6">
          <h2 id="duplicate-cleanup-title" className="text-xl font-bold">
            Elimină duplicatele
          </h2>
          <button
            type="button"
            aria-label="Închide"
            disabled={saving}
            onClick={props.onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#536071] hover:bg-[#f2f4f7]"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-5 text-sm sm:px-6">
          <p id="duplicate-cleanup-description" className="leading-6">
            Se potrivesc emailul sau telefonul; numele complet se folosește doar când lipsesc ambele
            date de contact. Se păstrează înscrierile cu prezență sau plată înregistrată; în
            celelalte cazuri se păstrează cea mai veche.
          </p>
          <p className="text-[#536071]">
            Acțiunea include întregul eveniment, indiferent de filtre. Duplicatele se anulează;
            datele rămân înregistrate.
          </p>
          {loading && <p role="status">Se verifică duplicatele…</p>}
          {plan && (
            <>
              <p role="status" className="font-bold">
                {plan.removals.length
                  ? `${plan.removals.length} ${plan.removals.length === 1 ? 'duplicat' : 'duplicate'} de eliminat`
                  : 'Nu există duplicate care pot fi eliminate automat.'}
              </p>
              {plan.removals.length > 0 && (
                <ul className="max-h-60 space-y-3 overflow-y-auto rounded-lg border border-[#e7ebf0] p-3">
                  {plan.removals.map((row) => (
                    <li key={row.id} className="break-words leading-5">
                      <span className="font-semibold">
                        Se elimină: {props.labels[row.id] ?? 'Participant actualizat'}
                      </span>
                      <span className="mt-1 block text-[#536071]">
                        Se păstrează: {props.labels[row.keepId] ?? 'Participant actualizat'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {plan.protectedCount > 0 && (
                <p>{plan.protectedCount} înscrieri cu prezență sau plată sunt protejate.</p>
              )}
              {plan.remainingDuplicateCount > 0 && (
                <p className="font-semibold text-amber-800">
                  {plan.remainingDuplicateCount} înscrieri vor rămâne cu avertisment de duplicat
                  pentru verificare manuală.
                </p>
              )}
            </>
          )}
          {error && (
            <div role="alert" className="space-y-2 text-red-700">
              <p>{error}</p>
              <button
                type="button"
                disabled={saving}
                className="min-h-11 font-bold underline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Reîncarcă lista
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e7ebf0] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={saving}
            onClick={props.onClose}
            className="min-h-11 rounded-lg border border-[#d7dde6] px-4 font-bold text-[#536071]"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={saving || loading || !plan?.removals.length}
            className="min-h-11 rounded-lg bg-red-700 px-4 font-bold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {saving ? 'Se elimină…' : 'Confirmă eliminarea'}
          </button>
        </div>
      </form>
    </div>
  )
}
