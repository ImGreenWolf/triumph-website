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
  location?: string
  start: string
}

type DayGroup = {
  availableCount: number
  date: Date
  hasCurrent: boolean
  key: string
  label: string
  slots: InterviewScheduleSlot[]
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
  const [withdrawn, setWithdrawn] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const selected = useMemo(
    () => slots.find((slot) => slot.start === selectedSlot),
    [selectedSlot, slots],
  )
  const days = useMemo(() => groupSlotsByDay(slots), [slots])
  const [selectedDayKey, setSelectedDayKey] = useState(
    () =>
      getDayKey(props.currentInterviewDate) ||
      days.find((day) => day.availableCount > 0)?.key ||
      days[0]?.key ||
      '',
  )
  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? days[0] ?? null
  const selectedDaySlots = selectedDay?.slots ?? []
  const timeline = useMemo(() => getTimelineLayout(selectedDaySlots), [selectedDaySlots])

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    const nextDays = groupSlotsByDay(slots)
    if (nextDays.some((day) => day.key === selectedDayKey)) return

    setSelectedDayKey(nextDays.find((day) => day.availableCount > 0)?.key || nextDays[0]?.key || '')
  }, [selectedDayKey, slots])

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

  async function withdraw() {
    if (!window.confirm('Esti sigur ca vrei sa te retragi din procesul de selectie?')) return

    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(
        `/aspirement/interview/${encodeURIComponent(props.token)}/withdraw`,
        { method: 'POST' },
      )
      const result = (await response.json()) as { message?: string; withdrawn?: boolean }
      if (!response.ok || !result.withdrawn) {
        throw new Error(result.message || 'Retragerea nu a putut fi salvata.')
      }

      setWithdrawn(true)
      setNotice({ kind: 'success', message: 'Retragerea a fost inregistrata.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Retragerea nu a putut fi salvata.',
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

        {props.unavailableMessage || withdrawn ? (
          <StatusPanel
            kind={withdrawn ? 'success' : 'error'}
            message={
              withdrawn
                ? 'Retragerea a fost inregistrata. Iti multumim ca ne-ai anuntat.'
                : props.unavailableMessage || ''
            }
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="grid gap-5">
              <div className="rounded-2xl border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#748094]">
                      Pasul 1
                    </p>
                    <h2 className="mt-1 text-lg font-bold">Alege ziua</h2>
                  </div>
                  <p className="text-sm font-semibold text-[#748094]">
                    {days.length} {days.length === 1 ? 'zi disponibila' : 'zile disponibile'}
                  </p>
                </div>
                <CalendarDayPicker
                  days={days}
                  selectedDayKey={selectedDay?.key ?? ''}
                  setSelectedDayKey={(key) => {
                    setSelectedDayKey(key)
                    const nextSlot = days
                      .find((day) => day.key === key)
                      ?.slots.find((slot) => slot.available || slot.isCurrent)
                    if (nextSlot) setSelectedSlot(nextSlot.start)
                  }}
                />
              </div>

              <div className="rounded-2xl border border-[#dfe5ec] bg-white p-4 shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#748094]">
                      Pasul 2
                    </p>
                    <h2 className="mt-1 text-lg font-bold">Alege ora</h2>
                  </div>
                  {selectedDay && (
                    <p className="text-sm font-semibold text-[#748094]">{selectedDay.label}</p>
                  )}
                </div>

                {selectedDaySlots.length > 0 && timeline ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-[64px_minmax(0,1fr)]">
                    <div
                      className="relative hidden border-r border-[#e5e9ef] pr-3 text-right text-xs font-bold text-[#8a94a6] sm:block"
                      style={{ height: timeline.height }}
                    >
                      {timeline.hourMarkers.map((marker) => (
                        <span
                          className="absolute right-3 -translate-y-1/2"
                          key={marker.label}
                          style={{ top: marker.top }}
                        >
                          {marker.label}
                        </span>
                      ))}
                    </div>
                    <div
                      className="relative overflow-hidden rounded-2xl bg-[#f7f9fc] ring-1 ring-[#edf0f4]"
                      style={{ height: timeline.height }}
                    >
                      {timeline.hourMarkers.map((marker) => (
                        <span
                          className="absolute inset-x-0 border-t border-dashed border-[#d7dde6]"
                          key={marker.label}
                          style={{ top: marker.top }}
                        />
                      ))}
                      {selectedDaySlots.map((slot) => {
                        const placement = timeline.placements.get(slot.id)
                        if (!placement) return null

                        return (
                          <button
                            className={`absolute left-3 right-3 flex items-center justify-between gap-3 rounded-xl border px-4 text-left text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              selectedSlot === slot.start
                                ? 'border-[#00a2e0] bg-[#00a2e0] text-white shadow-[#00a2e0]/20'
                                : slot.available || slot.isCurrent
                                  ? 'border-[#dfe5ec] bg-white text-[#152039] hover:border-[#00a2e0]'
                                  : 'border-[#dfe5ec] bg-slate-100 text-slate-500'
                            }`}
                            disabled={!slot.available && !slot.isCurrent}
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot.start)}
                            style={{
                              minHeight: placement.height,
                              top: placement.top,
                            }}
                            type="button"
                          >
                            <span>{formatTime(slot.start)}</span>
                            <span className="text-xs font-semibold opacity-75">
                              {slot.isCurrent
                                ? 'Alegerea ta'
                                : slot.available
                                  ? 'Disponibil'
                                  : 'Ocupat'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 py-10 text-center text-sm font-medium text-[#748094]">
                    Nu exista intervale disponibile pentru aceasta zi.
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
                {selected?.location && (
                  <p className="mt-1 text-sm font-medium text-[#748094]">{selected.location}</p>
                )}
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
              <button
                className="mt-5 w-full text-center text-xs font-medium text-[#8a94a6] underline-offset-2 hover:text-[#526071] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                onClick={() => void withdraw()}
                type="button"
              >
                Retrage-te din proces
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

function CalendarDayPicker(props: {
  days: DayGroup[]
  selectedDayKey: string
  setSelectedDayKey: (key: string) => void
}) {
  const { days, selectedDayKey, setSelectedDayKey } = props
  const firstDay = days[0]?.date
  const monthLabel = firstDay
    ? new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(firstDay)
    : 'Calendar'
  const cells = getCalendarCells(days)

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold capitalize">{monthLabel}</h3>
        <p className="text-xs font-semibold text-[#748094]">Selecteaza o zi disponibila</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-[#8a94a6]">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell) =>
          cell.kind === 'empty' ? (
            <span aria-hidden="true" key={cell.id} />
          ) : (
            <button
              className={`min-h-14 rounded-xl border px-1 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-35 ${
                selectedDayKey === cell.day.key
                  ? 'border-[#00a2e0] bg-[#00a2e0] text-white'
                  : 'border-[#dfe5ec] bg-white hover:border-[#00a2e0] hover:bg-[#f8fafc]'
              }`}
              disabled={cell.day.availableCount === 0 && !cell.day.hasCurrent}
              key={cell.day.key}
              onClick={() => setSelectedDayKey(cell.day.key)}
              type="button"
            >
              <span className="block text-sm font-bold">{cell.day.date.getDate()}</span>
              <span className="mt-1 block text-[10px] font-semibold opacity-70">
                {cell.day.availableCount} libere
              </span>
            </button>
          ),
        )}
      </div>
    </div>
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

function groupSlotsByDay(slots: InterviewScheduleSlot[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()

  for (const slot of slots) {
    const date = new Date(slot.start)
    if (Number.isNaN(date.getTime())) continue

    const key = getDayKey(slot.start)
    if (!key) continue

    const existing =
      groups.get(key) ??
      ({
        availableCount: 0,
        date: startOfLocalDay(date),
        hasCurrent: false,
        key,
        label: new Intl.DateTimeFormat('ro-RO', {
          day: 'numeric',
          month: 'long',
          weekday: 'long',
        }).format(date),
        slots: [],
      } satisfies DayGroup)

    existing.slots.push(slot)
    existing.availableCount += slot.available ? 1 : 0
    existing.hasCurrent ||= slot.isCurrent
    groups.set(key, existing)
  }

  return [...groups.values()]
    .map((day) => ({
      ...day,
      slots: day.slots.sort((left, right) => left.start.localeCompare(right.start)),
    }))
    .sort((left, right) => left.key.localeCompare(right.key))
}

function getCalendarCells(days: DayGroup[]) {
  if (days.length === 0) return []

  const firstDay = days[0].date
  const lastDay = days[days.length - 1].date
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7
  const daysByKey = new Map(days.map((day) => [day.key, day]))
  const cells: Array<{ id: string; kind: 'empty' } | { day: DayGroup; kind: 'day' }> = []

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({ id: `empty-${index}`, kind: 'empty' })
  }

  for (
    let date = new Date(firstDay);
    date <= lastDay;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    const key = getDayKey(date.toISOString())
    const day = daysByKey.get(key)
    cells.push(day ? { day, kind: 'day' } : { id: `gap-${key}`, kind: 'empty' })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ id: `trailing-${cells.length}`, kind: 'empty' })
  }

  return cells
}

function getTimelineLayout(slots: InterviewScheduleSlot[]) {
  if (slots.length === 0) return null

  const firstStart = new Date(slots[0].start)
  const lastEnd = new Date(slots[slots.length - 1].end)
  if (Number.isNaN(firstStart.getTime()) || Number.isNaN(lastEnd.getTime())) return null

  const timelineStart = floorToHour(firstStart)
  const timelineEnd = ceilToHour(lastEnd)
  const totalMs = Math.max(timelineEnd.getTime() - timelineStart.getTime(), 60 * 60_000)
  const totalMinutes = totalMs / 60_000
  const shortestSlotMinutes = Math.max(
    1,
    Math.min(
      ...slots.map((slot) => {
        const start = new Date(slot.start)
        const end = new Date(slot.end)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 60
        return Math.max(1, (end.getTime() - start.getTime()) / 60_000)
      }),
    ),
  )
  const minuteScale = Math.max(2.4, 48 / shortestSlotMinutes)
  const height = Math.max(360, totalMinutes * minuteScale)
  const placements = new Map<string, { height: number; top: number }>()

  for (const slot of slots) {
    const start = new Date(slot.start)
    const end = new Date(slot.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue

    const top = ((start.getTime() - timelineStart.getTime()) / totalMs) * height
    const slotHeight = Math.max(44, ((end.getTime() - start.getTime()) / totalMs) * height)
    placements.set(slot.id, { height: slotHeight, top })
  }

  const hourMarkers: Array<{ label: string; top: number }> = []
  for (
    let marker = new Date(timelineStart);
    marker <= timelineEnd;
    marker = new Date(marker.getTime() + 60 * 60_000)
  ) {
    hourMarkers.push({
      label: formatTime(marker.toISOString()),
      top: ((marker.getTime() - timelineStart.getTime()) / totalMs) * height,
    })
  }

  return {
    height,
    hourMarkers,
    placements,
  }
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

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDayKey(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function floorToHour(value: Date) {
  const date = new Date(value)
  date.setMinutes(0, 0, 0)
  return date
}

function ceilToHour(value: Date) {
  const date = new Date(value)
  if (date.getMinutes() || date.getSeconds() || date.getMilliseconds()) {
    date.setHours(date.getHours() + 1)
  }
  date.setMinutes(0, 0, 0)
  return date
}
