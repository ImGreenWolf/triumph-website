'use client'

import { CalendarClock, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useHeaderTheme } from '@/providers/HeaderTheme'

export type InterviewScheduleSlot = {
  available: boolean
  end: string
  id: string
  isCurrent: boolean
  label: string
  start: string
}

export default function ScheduleInterviewClient(props: {
  candidateName: string
  currentInterviewDate: string | null
  deadline: string | null
  slots: InterviewScheduleSlot[]
  token: string
  unavailableMessage?: string
}) {
  const { setHeaderTheme } = useHeaderTheme()
  const [slots, setSlots] = useState(props.slots)
  const [currentInterviewDate, setCurrentInterviewDate] = useState(props.currentInterviewDate)
  const [selectedSlot, setSelectedSlot] = useState(
    () => props.currentInterviewDate || props.slots.find((slot) => slot.available)?.start || '',
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const selected = useMemo(
    () => slots.find((slot) => slot.start === selectedSlot),
    [selectedSlot, slots],
  )

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  async function saveSlot() {
    if (!selectedSlot) return

    setBusy(true)
    setNotice(null)

    try {
      const response = await fetch(
        `/aspirement/interview/${encodeURIComponent(props.token)}/schedule`,
        {
          body: JSON.stringify({ slot: selectedSlot }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
      const result = (await response.json()) as {
        interviewDate?: string
        message?: string
        slots?: InterviewScheduleSlot[]
      }

      if (!response.ok) {
        throw new Error(result.message || 'Programarea nu a putut fi salvata.')
      }

      if (result.interviewDate) {
        setCurrentInterviewDate(result.interviewDate)
        setSelectedSlot(result.interviewDate)
      }
      if (result.slots) setSlots(result.slots)

      setNotice({ kind: 'success', message: 'Programarea a fost salvata.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Programarea nu a putut fi salvata.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-24 text-[#152039] sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-5xl gap-6">
        <div className="rounded-2xl bg-[#141e34] px-5 py-7 text-white shadow-xl sm:px-7">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#00a2e0]/15 text-[#56c9f5]">
            <CalendarClock className="size-6" />
          </div>
          <p className="text-sm font-semibold text-white/55">Salut, {props.candidateName}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Programeaza interview-ul
          </h1>
          {props.deadline && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Poti modifica programarea pana la {formatDate(props.deadline)}.
            </p>
          )}
        </div>

        {props.unavailableMessage ? (
          <StatusPanel kind="error" message={props.unavailableMessage} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
              <h2 className="text-lg font-bold">Alege un interval</h2>
              <div className="mt-5 grid gap-2">
                {slots.map((slot) => (
                  <button
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      selectedSlot === slot.start
                        ? 'border-[#00a2e0] bg-[#00a2e0]/10 text-[#0b5f7e]'
                        : 'border-[#dfe5ec] bg-white hover:bg-[#f8fafc]'
                    }`}
                    disabled={!slot.available && !slot.isCurrent}
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.start)}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-bold">{slot.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#748094]">
                        {slot.available || slot.isCurrent ? 'Disponibil' : 'Ocupat'}
                      </span>
                    </span>
                    {slot.isCurrent && (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    )}
                  </button>
                ))}
                {slots.length === 0 && (
                  <div className="py-10 text-center text-sm font-medium text-[#748094]">
                    Nu exista intervale disponibile.
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-2xl border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
              <h2 className="text-lg font-bold">Programarea ta</h2>
              <div className="mt-4 rounded-xl bg-[#f7f9fc] p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#748094]">
                  <Clock3 className="size-4" />
                  Interval selectat
                </p>
                <p className="mt-2 text-sm font-bold">
                  {selected?.label || 'Selecteaza un interval'}
                </p>
              </div>
              {notice && <StatusPanel kind={notice.kind} message={notice.message} />}
              <button
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00a2e0] px-4 text-sm font-bold text-white transition hover:bg-[#008fc7] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || !selectedSlot || selectedSlot === currentInterviewDate}
                onClick={() => void saveSlot()}
                type="button"
              >
                <CheckCircle2 className="size-4" />
                {busy ? 'Se salveaza...' : 'Salveaza programarea'}
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

function StatusPanel(props: { kind: 'error' | 'success'; message: string }) {
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
        props.kind === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {props.kind === 'success' ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{props.message}</span>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
