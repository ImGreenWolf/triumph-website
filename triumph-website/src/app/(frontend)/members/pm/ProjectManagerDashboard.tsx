'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { Fragment, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import type { Event, EventRegistration } from '@/payload-types'
import { Media } from '@/components/Media'
import Counter from '@/components/ui/counter'
import { getEventTheme } from '@/utilities/eventTheme'

type PayloadEventDay = NonNullable<Event['days']>[number]
type PayloadEventSlot = NonNullable<NonNullable<PayloadEventDay['slots']>>[number]

export type ManagedRegistration = Pick<
  EventRegistration,
  | 'createdAt'
  | 'day'
  | 'donation'
  | 'email'
  | 'guests'
  | 'id'
  | 'name'
  | 'phone'
  | 'questions'
  | 'slot'
  | 'status'
> & {
  timeOfArrival: string | null
}

export type ManagedEventSlot = {
  capacity: NonNullable<PayloadEventSlot['capacity']>
  endTime: Exclude<PayloadEventSlot['endTime'], undefined>
  id: NonNullable<PayloadEventSlot['id']>
  label: string
  startTime: Exclude<PayloadEventSlot['startTime'], undefined>
}

export type ManagedEventDay = {
  eventDate: PayloadEventDay['eventDate']
  id: NonNullable<PayloadEventDay['id']>
  label: string
  slots: ManagedEventSlot[]
}

export type ManagedEvent = Pick<
  Event,
  | 'cardColor'
  | 'heroImage'
  | 'id'
  | 'name'
  | 'primaryColor'
  | 'secondaryColor'
  | 'slug'
  | 'useColors'
> & {
  days: ManagedEventDay[]
  endTime: string | null
  location: string | null
  registrations: ManagedRegistration[]
  startTime: string | null
  donation: number
}

type Tab = 'overview' | 'check-in' | 'report'
type CounterTab = Exclude<Tab, 'check-in'>

const tabs: Array<{ icon: typeof LayoutDashboard; label: string; value: Tab }> = [
  { icon: LayoutDashboard, label: 'Overview', value: 'overview' },
  { icon: UserCheck, label: 'Check-in', value: 'check-in' },
  { icon: BarChart3, label: 'Raport final', value: 'report' },
]

const panelVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
} satisfies Variants

export default function ProjectManagerDashboard(props: {
  events: ManagedEvent[]
  userName: string
}) {
  const { events: initialEvents, userName } = props
  const { setHeaderTheme } = useHeaderTheme()
  const [events, setEvents] = useState(initialEvents)
  const [selectedEventID, setSelectedEventID] = useState(() => getInitialEventID(initialEvents))
  const [tab, setTab] = useState<Tab>('overview')
  const [openedCounterTabs, setOpenedCounterTabs] = useState<Record<CounterTab, boolean>>({
    overview: true,
    report: false,
  })
  const [showPersonalData, setShowPersonalData] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const event = events.find((candidate) => candidate.id === selectedEventID) ?? events[0]
  const metrics = useMemo(() => (event ? calculateMetrics(event) : null), [event])

  function updateRegistration(updated: Partial<ManagedRegistration> & { id: string }) {
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id !== event?.id
          ? candidate
          : {
              ...candidate,
              registrations: candidate.registrations.map((registration) =>
                registration.id === updated.id ? { ...registration, ...updated } : registration,
              ),
            },
      ),
    )
  }

  function openTab(nextTab: Tab) {
    if (nextTab !== 'check-in') {
      setOpenedCounterTabs((current) =>
        current[nextTab] ? current : { ...current, [nextTab]: true },
      )
    }
    setTab(nextTab)
  }

  if (!event || !metrics) {
    return <EmptyState userName={userName} />
  }

  const phase = getEventPhase(event)
  const theme = getEventTheme(event, {
    accent: '#00a2e0',
    background: '#f4f6f8',
    card: '#ffffff',
  })
  const themeStyle = {
    '--accent': 'var(--pm-accent)',
    '--accent-foreground': 'var(--pm-accent-foreground)',
    '--background': 'var(--pm-background)',
    '--border': 'color-mix(in srgb, var(--pm-card-foreground) 16%, var(--pm-card))',
    '--card': 'var(--pm-card)',
    '--card-foreground': 'var(--pm-card-foreground)',
    '--foreground': 'var(--pm-background-foreground)',
    '--pm-accent': theme.accent,
    '--pm-accent-foreground': theme.accentForeground,
    '--pm-background': theme.background,
    '--pm-background-foreground': theme.backgroundForeground,
    '--pm-card': theme.card,
    '--pm-card-foreground': theme.cardForeground,
    '--halftone-color': 'var(--pm-accent)',
    backgroundColor: 'var(--pm-background)',
    color: 'var(--pm-background-foreground)',
  } as CSSProperties
  const mainVariants = {
    exit: {
      opacity: 0,
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
      y: -8,
    },
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.04,
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.075,
      },
      y: 0,
    },
  } satisfies Variants

  return (
    <div
      className="pm-dashboard min-h-screen"
      data-reduce-motion={prefersReducedMotion ? 'true' : undefined}
      style={themeStyle}
    >
      <section className="relative overflow-hidden px-4 pb-8 pt-28 sm:px-6 lg:px-8 bg-[#141e34] halftone-background text-primary">
        <div className="pointer-events-none absolute -right-32 -top-48 size-[34rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium opacity-65 transition hover:opacity-100"
              href="/members"
            >
              <ArrowLeft className="size-4" />
              Dashboard membri
            </Link>
            <p className="text-sm opacity-55">
              Conectat ca <span className="font-semibold">{userName}</span>
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full border border-accent bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  Project manager
                </span>
                <PhaseBadge phase={phase} />
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {event.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-70">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-accent" />
                  {formatEventDateRange(event)}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-accent" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>

            <div className="relative min-w-0 sm:min-w-80">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">
                Eveniment gestionat
              </label>
              {events.length > 4 ? (
                <div>
                  <select
                    className="h-12 w-full appearance-none rounded-lg border border-current/15 bg-white/[0.08] px-4 pr-10 text-sm font-semibold outline-none transition focus:border-accent"
                    onChange={(changeEvent) => setSelectedEventID(changeEvent.target.value)}
                    value={event.id}
                  >
                    {events.map((option) => (
                      <option
                        className="bg-background text-foreground"
                        key={option.id}
                        value={option.id}
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute bottom-4 right-4 size-4 opacity-55" />
                </div>
              ) : (
                <div className="inline-flex">
                  {events.map((option) => (
                    <div
                      className={`relative bg-[#101a31] rounded-lg overflow-hidden border-2 mx-2 ${selectedEventID == option.id ? 'border-accent' : 'border-border'}`}
                      key={option.id}
                      onClick={() => setSelectedEventID(option.id)}
                    >
                      <Media
                        resource={option.heroImage}
                        className="object-cover aspect-4/5"
                        imgClassName="w-40 aspect-4/5 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black to-transparent flex items-end">
                        <h4 className="leading-5 m-2">{option.name}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-current/10">
            {tabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  className={`relative inline-flex h-12 shrink-0 items-center gap-2 px-4 text-sm font-semibold transition ${
                    tab === item.value ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                  }`}
                  key={item.value}
                  onClick={() => openTab(item.value)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.value === 'check-in' && metrics.unprocessed > 0 && (
                    <span className="min-w-5 rounded-full bg-[#f7a81b] px-1.5 py-0.5 text-center text-[10px] font-bold text-[#101a31]">
                      {metrics.unprocessed}
                    </span>
                  )}
                  {tab === item.value && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </section>

      <AnimatePresence initial={false} mode="wait">
        <motion.main
          animate="visible"
          className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9"
          exit={prefersReducedMotion ? undefined : 'exit'}
          initial={prefersReducedMotion ? false : 'hidden'}
          key={event.id}
          variants={mainVariants}
        >
          {openedCounterTabs.overview && (
            <div hidden={tab !== 'overview'}>
              <Overview
                event={event}
                metrics={metrics}
                onOpenCheckIn={() => openTab('check-in')}
                onTogglePersonalData={() => setShowPersonalData((current) => !current)}
                showPersonalData={showPersonalData}
              />
            </div>
          )}
          {tab === 'check-in' && (
            <CheckIn
              event={event}
              onRegistrationUpdate={updateRegistration}
              onTogglePersonalData={() => setShowPersonalData((current) => !current)}
              showPersonalData={showPersonalData}
            />
          )}
          {openedCounterTabs.report && (
            <div hidden={tab !== 'report'}>
              <FinalReport event={event} metrics={metrics} />
            </div>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

function Overview(props: {
  event: ManagedEvent
  metrics: ReturnType<typeof calculateMetrics>
  onOpenCheckIn: () => void
  onTogglePersonalData: () => void
  showPersonalData: boolean
}) {
  const { event, metrics, onOpenCheckIn, onTogglePersonalData, showPersonalData } = props
  const recentRegistrations = [...event.registrations]
    .filter((registration) => registration.status !== 'cancelled')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6)

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="blue"
          detail={`${metrics.remainingCapacity} locuri disponibile`}
          icon={UsersRound}
          label="Înscrieri active"
          numberValue={metrics.active.length}
          value={String(metrics.active.length)}
        />
        <MetricCard
          accent="violet"
          detail={`${metrics.capacity} locuri configurate`}
          icon={TrendingUp}
          label="Grad de ocupare"
          value={`${metrics.occupancy}%`}
        />
        <MetricCard
          accent="green"
          detail={`${metrics.checkInProgress}% din listă procesată`}
          icon={UserCheck}
          label="Prezenți confirmați"
          numberValue={metrics.present.length}
          value={String(metrics.present.length)}
        />
        <MetricCard
          accent="amber"
          detail={`${formatCurrency(metrics.averageDonation)} donație medie`}
          icon={CircleDollarSign}
          label="Fonduri înregistrate"
          numberValue={metrics.funds}
          numberUnit="RON"
          value={formatCurrency(metrics.funds)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <Panel>
          <PanelHeader
            description="Ocuparea capacității pentru fiecare zi și interval orar."
            title="Înscrieri pe ture"
          />
          <div className="mt-6 space-y-7">
            {event.days.map((day) => (
              <div key={day.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold capitalize">{day.label}</h3>
                  <span className="text-xs font-medium text-[#7a8497]">
                    {sumDayRegistrations(event, day.id)} înscrieri
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {day.slots.map((slot) => {
                    const registrations = activeRegistrationsForSlot(event, day.id, slot.id).length
                    const presence = activeRegistrationsForSlot(event, day.id, slot.id).filter(
                      (reg) => reg.status == 'present',
                    ).length
                    const percentage = percentageOf(registrations, slot.capacity)
                    const presencePercentage = percentageOf(presence, slot.capacity)
                    return (
                      <div
                        className="rounded-xl border border-current/10 bg-white/5 p-4"
                        key={slot.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-semibold opacity-65">
                              <Clock3 className="size-3.5" />
                              {formatSlotTimeRange(slot)}
                            </p>
                            <p className="mt-2 text-lg font-bold">
                              {registrations}
                              <span className="text-sm font-medium opacity-55">
                                {' '}
                                / {slot.capacity}
                              </span>
                            </p>
                          </div>
                          <div className="inline-flex align-bottom items-end">
                            <span className={`rounded-md px-2 py-1 text-xs `}>
                              {presencePercentage}%
                            </span>
                            <span
                              className={`rounded-md px-3 py-1 text-md font-bold ${getFillBadgeClass(percentage)}`}
                            >
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <ProgressBar
                          percentage={percentage}
                          secondaryPercentage={presencePercentage}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {event.days.length === 0 && <InlineEmpty text="Nu există zile și ture configurate." />}
          </div>
        </Panel>

        <Panel className="h-fit">
          <div className="flex items-start justify-between gap-4">
            <PanelHeader
              description={`${recentRegistrations.length} din ${metrics.active.length} afișate`}
              title="Înscrieri recente"
            />
            <PrivacyButton active={showPersonalData} onClick={onTogglePersonalData} />
          </div>
          <div className="mt-5 divide-y divide-[#edf0f4]">
            {recentRegistrations.map((registration) => (
              <div className="flex items-center gap-3 py-3.5" key={registration.id}>
                <Avatar name={registration.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {showPersonalData ? registration.name : maskName(registration.name)}
                  </p>
                  <p className="mt-0.5 truncate text-xs opacity-55">
                    {showPersonalData ? registration.email : 'Date personale ascunse'}
                  </p>
                </div>
                <StatusBadge status={registration.status} />
              </div>
            ))}
            {recentRegistrations.length === 0 && <InlineEmpty text="Nu există încă înscrieri." />}
          </div>
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-bold text-accent-foreground transition hover:opacity-90"
            onClick={onOpenCheckIn}
            type="button"
          >
            Deschide lista de check-in
            <UserCheck className="size-4" />
          </button>
        </Panel>
      </section>
    </div>
  )
}

function CheckIn(props: {
  event: ManagedEvent
  onRegistrationUpdate: (registration: Partial<ManagedRegistration> & { id: string }) => void
  onTogglePersonalData: () => void
  showPersonalData: boolean
}) {
  const { event, onRegistrationUpdate, onTogglePersonalData, showPersonalData } = props
  const [query, setQuery] = useState('')
  const [shift, setShift] = useState('all')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<ManagedRegistration | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [savingID, setSavingID] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  const filtered = event.registrations.filter((registration) => {
    if (registration.status === 'cancelled') return false
    if (shift !== 'all' && `${registration.day}:${registration.slot}` !== shift) return false
    if (status !== 'all' && registration.status !== status) return false
    if (!query.trim()) return true

    const normalizedQuery = query.trim().toLocaleLowerCase('ro')
    return [registration.name, registration.email, registration.phone].some((value) =>
      value.toLocaleLowerCase('ro').includes(normalizedQuery),
    )
  })

  async function saveRegistration(args: {
    donation: number
    guests: number
    registration: ManagedRegistration
    status: 'registered' | 'present' | 'absent'
  }) {
    if (args.status === 'present' && args.donation < event.donation) {
      setNotice({
        kind: 'error',
        message: `Înscrierea nu se poate face deoarece donația minimă este de ${event.donation} RON.`,
      })
      setEditing(null)
      return
    }

    setSavingID(args.registration.id)
    setNotice(null)

    try {
      const response = await fetch('/members/pm/check-in', {
        body: JSON.stringify({
          donation: args.donation,
          guests: args.guests,
          registrationId: args.registration.id,
          status: args.status,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as {
        message?: string
        registration?: Pick<
          ManagedRegistration,
          'donation' | 'guests' | 'id' | 'status' | 'timeOfArrival'
        >
      }

      if (!response.ok || !result.registration) {
        throw new Error(result.message || 'Actualizarea nu a putut fi salvată.')
      }

      onRegistrationUpdate(result.registration)
      setEditing(null)
      setNotice({ kind: 'success', message: 'Înscriere actualizată.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Actualizarea nu a putut fi salvată.',
      })
    } finally {
      setSavingID(null)
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de check-in</h2>
          <p className="mt-1 text-sm text-[#748094]">
            Confirmă sosirea, donația totală și persoanele care împart donația.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground transition hover:opacity-90"
            onClick={() => setImportOpen(true)}
            type="button"
          >
            <Upload className="size-3.5" />
            Importă CSV
          </button>
          <PrivacyButton active={showPersonalData} onClick={onTogglePersonalData} wide />
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
            notice.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.kind === 'success' ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          {notice.message}
        </div>
      )}

      <Panel className="overflow-hidden p-0" stagger={false}>
        <div className="grid gap-3 border-b border-[#e5e9ef] p-4 md:grid-cols-[minmax(220px,1fr)_220px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a94a6]" />
            <input
              className="h-11 w-full rounded-lg border border-[#dce2ea] bg-white pl-10 pr-3 text-sm text-[#152039] outline-none transition placeholder:text-[#a4abba] focus:border-accent focus:ring-2 focus:ring-accent/10"
              onChange={(inputEvent) => setQuery(inputEvent.target.value)}
              placeholder="Caută nume, email sau telefon"
              type="search"
              value={query}
            />
          </div>
          <select
            className="h-11 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-medium text-[#152039] outline-none focus:border-accent"
            onChange={(selectEvent) => setShift(selectEvent.target.value)}
            value={shift}
          >
            <option value="all">Toate zilele și turele</option>
            {event.days.flatMap((day) =>
              day.slots.map((slot) => (
                <option key={`${day.id}:${slot.id}`} value={`${day.id}:${slot.id}`}>
                  {compactDay(day.eventDate)} · {slot.label}
                </option>
              )),
            )}
          </select>
          <select
            className="h-11 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-medium text-[#152039] outline-none focus:border-accent"
            onChange={(selectEvent) => setStatus(selectEvent.target.value)}
            value={status}
          >
            <option value="all">Toate statusurile</option>
            <option value="registered">În așteptare</option>
            <option value="present">Prezent</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-current/10 bg-card text-[11px] font-bold uppercase tracking-[0.09em] opacity-70">
                <th className="px-5 py-3.5">Participant</th>
                <th className="px-4 py-3.5">Tură</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Grup</th>
                <th className="px-4 py-3.5">Donație</th>
                <th className="px-5 py-3.5 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {filtered.map((registration) => {
                const slotInfo = getSlotInfo(event, registration.day, registration.slot)
                return (
                  <tr className="bg-card transition hover:opacity-90" key={registration.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={registration.name} />
                        <div className="min-w-0">
                          <p className="max-w-60 truncate text-sm font-bold">
                            {showPersonalData ? registration.name : maskName(registration.name)}
                          </p>
                          <p className="mt-0.5 max-w-60 truncate text-xs opacity-55">
                            {showPersonalData
                              ? `${registration.email} · ${registration.phone}`
                              : 'Date personale ascunse'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold">
                        {slotInfo ? formatSlotTimeRange(slotInfo.slot) : '—'}
                      </p>
                      <p className="mt-0.5 text-xs capitalize opacity-55">
                        {slotInfo ? compactDay(slotInfo.day.eventDate) : 'Tură indisponibilă'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={registration.status} />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {1 + registration.guests} pers.
                    </td>
                    <td className="px-4 py-4 text-sm font-bold">
                      {registration.donation > 0 ? formatCurrency(registration.donation) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {registration.status !== 'present' && (
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            disabled={savingID === registration.id}
                            onClick={() => setEditing(registration)}
                            type="button"
                          >
                            <Check className="size-3.5" />
                            Confirmă
                          </button>
                        )}
                        {registration.status === 'present' && (
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cfd6df] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f5f7fa]"
                            onClick={() => setEditing(registration)}
                            type="button"
                          >
                            Editează
                          </button>
                        )}
                        {registration.status === 'registered' && (
                          <button
                            aria-label="Marchează absent"
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-red-500 text-red-300 bg-red-100 transition hover:border-red-400 hover:bg-red-200 hover:text-red-500 disabled:opacity-60"
                            disabled={savingID === registration.id}
                            onClick={() =>
                              saveRegistration({
                                donation: registration.donation || 0,
                                guests: registration.guests || 0,
                                registration,
                                status: 'absent',
                              })
                            }
                            title="Marchează absent"
                            type="button"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <InlineEmpty text="Nicio înscriere nu corespunde filtrelor." />}
        </div>
        <div className="flex items-center justify-between border-t border-current/10 bg-card px-5 py-3 text-xs font-medium opacity-65">
          <span>{filtered.length} rezultate</span>
          <span>
            {event.registrations.filter((item) => item.status !== 'cancelled').length} înscrieri
            active
          </span>
        </div>
      </Panel>

      {editing && (
        <CheckInDialog
          onClose={() => setEditing(null)}
          onSave={(values) =>
            saveRegistration({ ...values, registration: editing, status: 'present' })
          }
          registration={editing}
          saving={savingID === editing.id}
          showPersonalData={showPersonalData}
          managedEvent={event}
        />
      )}
      {importOpen && <ParticipantImportDialog event={event} onClose={() => setImportOpen(false)} />}
    </div>
  )
}

function CheckInDialog(props: {
  onClose: () => void
  onSave: (values: { donation: number; guests: number }) => void
  registration: ManagedRegistration
  saving: boolean
  showPersonalData: boolean
  managedEvent: ManagedEvent
}) {
  const { onClose, onSave, registration, saving, showPersonalData, managedEvent } = props
  const [donation, setDonation] = useState(String(registration.donation || managedEvent.donation))
  const [guests, setGuests] = useState(String(registration.guests || 0))
  const parsedDonation = Number(donation || 0)
  const parsedGuests = Number(guests || 0)
  const people = 1 + (Number.isInteger(parsedGuests) && parsedGuests >= 0 ? parsedGuests : 0)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              Confirmare sosire
            </p>
            <h2 className="mt-1.5 text-xl font-bold text-[#152039]">
              {showPersonalData ? registration.name : maskName(registration.name)}
            </h2>
            {showPersonalData && (
              <p className="mt-1 text-xs text-[#7a8497]">
                {registration.email} · {registration.phone}
              </p>
            )}
          </div>
          <button
            aria-label="Închide"
            className="flex size-9 items-center justify-center rounded-lg text-[#7a8497] transition hover:bg-[#f2f4f7]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {showPersonalData && registration.questions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                Mențiune participant
              </p>
              <p className="mt-1 text-sm leading-5 text-amber-900">{registration.questions}</p>
            </div>
          )}

          <div>
            <label
              className="mb-2 block text-sm font-bold text-[#344054]"
              htmlFor="checkin-donation"
            >
              Donație totală <span className="font-medium text-[#8a94a6]">(lei)</span>
            </label>
            <div className="relative">
              <HandCoins className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-accent" />
              <input
                autoFocus
                className="h-12 w-full rounded-lg border border-[#d7dde6] pl-11 pr-4 text-lg font-bold text-[#152039] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                id="checkin-donation"
                min={managedEvent.donation.toString() || '0'}
                onChange={(event) => setDonation(event.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key == 'Enter') onSave({ donation: parsedDonation, guests: parsedGuests })
                }}
                placeholder="suma donatǎ"
                step="1"
                type="number"
                value={donation}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#7a8497]">
              Introdu suma oferită de participant și de grupul său, ca o singură donație.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#344054]" htmlFor="checkin-guests">
              Persoane însoțitoare
            </label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#7b61d1]" />
              <input
                className="h-12 w-full rounded-lg border border-[#d7dde6] pl-11 pr-4 text-lg font-bold text-[#152039] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                id="checkin-guests"
                max="50"
                min="0"
                onChange={(event) => setGuests(event.target.value)}
                step="1"
                type="number"
                value={guests}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#dceaf1] bg-[#f2f9fc] px-4 py-3">
            <span className="text-sm font-semibold text-[#536071]">Grup confirmat</span>
            <span className="text-sm font-bold text-[#152039]">
              {people} {people === 1 ? 'persoană' : 'persoane'}
              {parsedDonation > 0 && (
                <span className="ml-2 font-medium text-[#6b7688]">
                  · {formatCurrency(parsedDonation / people)}/pers.
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#e7ebf0] bg-[#fafbfc] px-6 py-4 sm:justify-end">
          <button
            className="h-11 flex-1 rounded-lg border border-[#d7dde6] bg-white px-5 text-sm font-bold text-[#536071] sm:flex-none"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Anulează
          </button>
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            disabled={
              saving ||
              !Number.isFinite(parsedDonation) ||
              parsedDonation < 0 ||
              !Number.isInteger(parsedGuests) ||
              parsedGuests < 0
            }
            onClick={() => onSave({ donation: parsedDonation, guests: parsedGuests })}
            onSubmit={() => onSave({ donation: parsedDonation, guests: parsedGuests })}
            type="button"
          >
            <CheckCircle2 className="size-4" />
            {saving ? 'Se salvează…' : 'Confirmă check-in'}
          </button>
        </div>
      </div>
    </div>
  )
}

type ParticipantImportResponse = {
  created?: Array<{ email: string; id: string; name: string; row: number }>
  errors?: Array<{ message: string; row: number }>
  message?: string
  skipped?: Array<{ email: string; reason: string; row: number }>
}

function ParticipantImportDialog(props: { event: ManagedEvent; onClose: () => void }) {
  const { event, onClose } = props
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ParticipantImportResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const createdCount = result?.created?.length ?? 0
  const skipped = result?.skipped ?? []
  const errors = result?.errors ?? []

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape' && !isUploading) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isUploading, onClose])

  async function submitImport(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!file) {
      setResult({ message: 'Selectează un fișier CSV.' })
      return
    }

    const formData = new FormData()
    formData.set('eventId', event.id)
    formData.set('file', file)
    setIsUploading(true)
    setResult(null)

    try {
      const response = await fetch('/members/pm/import', {
        body: formData,
        credentials: 'include',
        method: 'POST',
      })
      const data = (await response.json()) as ParticipantImportResponse
      setResult(data)

      if (response.ok && (data.created?.length ?? 0) > 0) {
        router.refresh()
      }
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : 'Importul nu a putut fi finalizat.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isUploading) onClose()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Import participanți
            </p>
            <h2 className="mt-1.5 text-xl font-bold text-[#152039]">{event.name}</h2>
            <p className="mt-1 text-xs text-[#7a8497]">
              Evenimentul este aplicat automat tuturor rândurilor.
            </p>
          </div>
          <button
            aria-label="Închide"
            className="flex size-9 items-center justify-center rounded-lg text-[#7a8497] transition hover:bg-[#f2f4f7]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={submitImport}>
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-xl border border-[#dceaf1] bg-[#f3f9fc] p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-bold text-[#152039]">Coloanele CSV</p>
                  <p className="mt-1 text-xs leading-5 text-[#657286]">
                    Obligatorii: <code>name,email,phone,day,slot</code>. Opțional:{' '}
                    <code>questions</code>. Ziua folosește <code>YYYY-MM-DD</code>, iar tura
                    intervalul afișat în eveniment, de exemplu <code>10:00-12:00</code>.
                  </p>
                </div>
              </div>
              <button
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-accent/30 bg-white px-3 text-xs font-bold text-accent transition hover:bg-[#f9fcfd]"
                onClick={() => downloadParticipantTemplate(event)}
                type="button"
              >
                <Download className="size-3.5" />
                Descarcă șablonul pentru acest eveniment
              </button>
            </div>

            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cfd8e3] bg-[#fafbfc] px-5 py-8 text-center transition hover:border-accent hover:bg-[#f6fbfd]"
              htmlFor="participant-csv"
            >
              <Upload className="size-7 text-accent" />
              <span className="mt-3 text-sm font-bold text-[#344054]">
                {file ? file.name : 'Alege fișierul CSV'}
              </span>
              <span className="mt-1 text-xs text-[#8a94a6]">
                Maximum 5 MB · separator virgulă sau punct și virgulă
              </span>
              <input
                accept=".csv,text/csv"
                className="sr-only"
                disabled={isUploading}
                id="participant-csv"
                onChange={(inputEvent) => {
                  setFile(inputEvent.target.files?.[0] ?? null)
                  setResult(null)
                }}
                type="file"
              />
            </label>

            {result && (
              <div
                className={`rounded-xl border p-4 ${
                  createdCount > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <p className="text-sm font-bold text-[#253148]">
                  {result.message || 'Import finalizat.'}
                </p>
                {(createdCount > 0 || skipped.length > 0 || errors.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-white/70 px-2 py-1">
                      {createdCount} importați
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1">{skipped.length} omiși</span>
                    <span className="rounded-md bg-white/70 px-2 py-1">{errors.length} erori</span>
                  </div>
                )}
                {(skipped.length > 0 || errors.length > 0) && (
                  <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto pl-4 text-xs leading-5 text-[#5b3440]">
                    {skipped.map((issue) => (
                      <li key={`skip-${issue.row}-${issue.email}`}>
                        Rândul {issue.row}: {issue.email} — {issue.reason}
                      </li>
                    ))}
                    {errors.map((issue) => (
                      <li key={`error-${issue.row}-${issue.message}`}>
                        Rândul {issue.row}: {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#e7ebf0] bg-[#fafbfc] px-6 py-4 sm:justify-end">
            <button
              className="h-11 flex-1 rounded-lg border border-[#d7dde6] bg-white px-5 text-sm font-bold text-[#536071] sm:flex-none"
              disabled={isUploading}
              onClick={onClose}
              type="button"
            >
              Închide
            </button>
            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              disabled={!file || isUploading}
              type="submit"
            >
              <Upload className="size-4" />
              {isUploading ? 'Se importă…' : 'Importă participanții'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FinalReport(props: { event: ManagedEvent; metrics: ReturnType<typeof calculateMetrics> }) {
  const { event, metrics } = props
  const reportDays = event.days.map((day) => {
    const records = metrics.present.filter((registration) => registration.day === day.id)
    return {
      attendees: records.reduce((sum, registration) => sum + 1 + (registration.guests || 0), 0),
      funds: records.reduce((sum, registration) => sum + (registration.donation || 0), 0),
      id: day.id,
      label: compactDay(day.eventDate),
    }
  })
  const maxDayFunds = Math.max(...reportDays.map((day) => day.funds), 1)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Impact & rezultate
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Raportul evenimentului</h2>
          <p className="mt-1 text-sm text-[#748094]">
            Metricile se actualizează imediat după fiecare check-in.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-4 text-sm font-bold text-[#344054] shadow-sm transition hover:bg-[#f8fafc]"
          onClick={() => exportReport(event)}
          type="button"
        >
          <Download className="size-4" />
          Exportă CSV
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="amber"
          detail="donații confirmate"
          icon={WalletCards}
          label="Fonduri strânse"
          numberUnit="RON"
          numberValue={metrics.funds}
          value={formatCurrency(metrics.funds)}
        />
        <MetricCard
          accent="green"
          detail={`${metrics.companions} însoțitori`}
          icon={Users}
          label="Persoane prezente"
          numberValue={metrics.peoplePresent}
          value={String(metrics.peoplePresent)}
        />
        <MetricCard
          accent="blue"
          detail="per înscriere prezentă"
          icon={HandCoins}
          label="Donație medie"
          numberValue={metrics.averageDonation}
          numberUnit="RON"
          value={formatCurrency(metrics.averageDonation)}
        />
        <MetricCard
          accent="violet"
          detail={`${metrics.noShowRate}% rată no-show`}
          icon={TrendingUp}
          label="Rată de participare"
          value={`${metrics.attendanceRate}%`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
        <Panel>
          <PanelHeader
            description="Doar înscrierile care au un rezultat final."
            title="Prezență vs. absență"
          />
          <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center xl:flex-col 2xl:flex-row">
            <div
              className="relative flex size-44 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#10b981 0 ${metrics.attendanceRate}%, #ef6a6a ${metrics.attendanceRate}% 100%)`,
              }}
            >
              <div className="flex size-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <span className="text-3xl font-bold text-[#152039]">{metrics.attendanceRate}%</span>
                <span className="text-xs font-semibold text-[#8a94a6]">participare</span>
              </div>
            </div>
            <div className="w-full max-w-60 space-y-3">
              <Legend color="bg-emerald-500" label="Au venit" value={metrics.present.length} />
              <Legend color="bg-[#ef6a6a]" label="Nu au ajuns" value={metrics.absent.length} />
              <Legend color="bg-[#d8dee7]" label="Neprocesați" value={metrics.unprocessed} />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            description="Donații confirmate și numărul real de persoane, pe zile."
            title="Performanță pe zile"
          />
          <div className="mt-7 space-y-5">
            {reportDays.map((day) => (
              <div key={day.id}>
                <div className="mb-2.5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold capitalize">{day.label}</p>
                    <p className="mt-0.5 text-xs text-[#8a94a6]">
                      {day.attendees} persoane prezente
                    </p>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(day.funds)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f4]">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${percentageOf(day.funds, maxDayFunds)}%` }}
                  />
                </div>
              </div>
            ))}
            {reportDays.length === 0 && <InlineEmpty text="Nu există zile configurate." />}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          detail="include persoana înscrisă și însoțitorii"
          icon={UsersRound}
          label="Dimensiune medie grup"
          value={`${metrics.averageGroupSize.toFixed(1)} pers.`}
        />
        <InsightCard
          detail="calculat pentru toate persoanele prezente"
          icon={CircleDollarSign}
          label="Donație per persoană"
          value={formatCurrency(metrics.donationPerPerson)}
        />
        <InsightCard
          detail="prezenți fără sumă introdusă"
          icon={Sparkles}
          label="Donații de completat"
          value={String(metrics.missingDonations)}
        />
        <InsightCard
          detail="intervalul cu cei mai mulți participanți"
          icon={Clock3}
          label="Cea mai activă tură"
          value={metrics.topSlotLabel}
        />
      </section>
    </div>
  )
}

function EmptyState({ userName }: { userName: string }) {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101a31] px-5 pt-20 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#00a2e0]/15 text-[#56c9f5]">
          <CalendarDays className="size-7" />
        </div>
        <p className="mt-6 text-sm font-semibold text-white/55">Salut, {userName}</p>
        <h1 className="mt-2 text-3xl font-bold">Nu ai evenimente asignate</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Când ești adăugat ca project manager la un eveniment, acesta va apărea automat aici.
        </p>
        <Link
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#101a31]"
          href="/members"
        >
          <ArrowLeft className="size-4" />
          Înapoi la dashboard
        </Link>
      </div>
    </div>
  )
}

function Panel(props: { children: ReactNode; className?: string; stagger?: boolean }) {
  const stagger = props.stagger !== false

  return (
    <motion.section
      className={`pm-dashboard-card rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-6 ${props.className ?? ''}`}
      initial={stagger ? undefined : false}
      variants={stagger ? panelVariants : undefined}
    >
      {props.children}
    </motion.section>
  )
}

function PanelHeader(props: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{props.title}</h2>
      <p className="mt-1 text-sm opacity-60">{props.description}</p>
    </div>
  )
}

function MetricCard(props: {
  accent: 'amber' | 'blue' | 'green' | 'violet'
  detail: string
  icon: typeof Users
  label: string
  value: string
  numberValue?: number
  numberUnit?: string
}) {
  const Icon = props.icon
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-accent/15 text-accent',
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <motion.article
      className="pm-dashboard-card rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_8px_30px_rgba(22,34,57,0.04)]"
      variants={panelVariants}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-60">{props.label}</p>
          {props.numberValue == undefined && (
            <p className="mt-3 text-3xl font-bold tracking-tight">{props.value}</p>
          )}
          {props.numberValue != undefined && (
            <span className="inline-flex align-bottom items-bottom mt-3 ">
              <Counter
                animateChanges={false}
                animateOnMount
                value={Math.round(props.numberValue)}
                fontSize={42}
                className="text-3xl font-bold"
                gap={0}
                topGradientStyle={{}}
                bottomGradientStyle={{}}
              />
              <p className="pb-1 text-3xl font-bold tracking-tight">{props.numberUnit}</p>
            </span>
          )}
          <p className="mt-1.5 text-xs font-medium opacity-60">{props.detail}</p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors[props.accent]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </motion.article>
  )
}

function InsightCard(props: { detail: string; icon: typeof Users; label: string; value: string }) {
  const Icon = props.icon
  return (
    <motion.article
      className="pm-dashboard-card rounded-xl border border-border bg-card p-5 text-card-foreground"
      variants={panelVariants}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Icon className="size-4.5" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.07em] opacity-60">{props.label}</p>
      <p className="mt-1.5 truncate text-xl font-bold" title={props.value}>
        {props.value}
      </p>
      <p className="mt-1 text-xs leading-5 opacity-60">{props.detail}</p>
    </motion.article>
  )
}

function ProgressBar({
  percentage,
  secondaryPercentage,
}: {
  percentage: number
  secondaryPercentage?: number
}) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e6ebf1] relative">
      <div
        className={`h-full rounded-full relative ${getFillBadgeClass(percentage, false)}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
      {secondaryPercentage && (
        <div
          className={`h-full rounded-full absolute left-0 top-0 bottom-0  ${getFillBadgeClass(percentage, true)}`}
          style={{ width: `${Math.min(secondaryPercentage, 100)}%` }}
        />
      )}
    </div>
  )
}

function PrivacyButton(props: { active: boolean; onClick: () => void; wide?: boolean }) {
  const Icon = props.active ? EyeOff : Eye
  return (
    <button
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dbe1e8] bg-white px-3 text-xs font-bold text-[#586477] transition hover:bg-[#f7f9fb] ${props.wide ? 'h-10' : ''}`}
      onClick={props.onClick}
      type="button"
    >
      <Icon className="size-3.5" />
      {props.active ? 'Ascunde datele' : 'Arată datele participanților'}
    </button>
  )
}

function Avatar({ name }: { name?: string | null }) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('ro'))
    .join('')

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
      {initials || <UserRound className="size-4" />}
    </div>
  )
}

function StatusBadge({ status }: { status: EventRegistration['status'] }) {
  const config = {
    absent: { className: 'bg-red-50 text-red-700 ring-red-100', label: 'Absent' },
    cancelled: { className: 'bg-slate-100 text-slate-500 ring-slate-200', label: 'Anulat' },
    present: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', label: 'Prezent' },
    registered: { className: 'bg-amber-50 text-amber-700 ring-amber-100', label: 'În așteptare' },
  }[status]

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function PhaseBadge({ phase }: { phase: ReturnType<typeof getEventPhase> }) {
  const config = {
    ended: { className: 'border-white/10 bg-white/[0.06] text-white/55', label: 'Încheiat' },
    live: {
      className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      label: 'În desfășurare',
    },
    upcoming: { className: 'border-amber-400/25 bg-amber-400/10 text-amber-300', label: 'Urmează' },
  }[phase]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}
    >
      {phase === 'live' && <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />}
      {config.label}
    </span>
  )
}

function Legend(props: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#edf0f4] px-3 py-2.5">
      <span className={`size-2.5 rounded-full ${props.color}`} />
      <span className="flex-1 text-sm font-medium opacity-65">{props.label}</span>
      <span className="text-sm font-bold">{props.value}</span>
    </div>
  )
}

function InlineEmpty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm font-medium opacity-60">{text}</div>
}

function calculateMetrics(event: ManagedEvent) {
  const active = event.registrations.filter((registration) => registration.status !== 'cancelled')
  const present = active.filter((registration) => registration.status === 'present')
  const absent = active.filter((registration) => registration.status === 'absent')
  const unprocessed = active.filter((registration) => registration.status === 'registered').length
  const capacity = event.days.reduce(
    (daySum, day) => daySum + day.slots.reduce((slotSum, slot) => slotSum + slot.capacity, 0),
    0,
  )
  const funds = present.reduce((sum, registration) => sum + (registration.donation || 0), 0)
  const companions = present.reduce((sum, registration) => sum + (registration.guests || 0), 0)
  const peoplePresent = present.length + companions
  const processed = present.length + absent.length
  const slotAttendance = new Map<string, number>()

  for (const registration of present) {
    const key = `${registration.day}:${registration.slot}`
    slotAttendance.set(key, (slotAttendance.get(key) ?? 0) + 1 + (registration.guests || 0))
  }
  const topSlot = [...slotAttendance.entries()].sort((left, right) => right[1] - left[1])[0]
  const [topDayID, topSlotID] = topSlot?.[0].split(':') ?? []
  const topSlotInfo = topDayID && topSlotID ? getSlotInfo(event, topDayID, topSlotID) : null

  return {
    absent,
    active,
    attendanceRate: percentageOf(present.length, processed),
    averageDonation: present.length ? funds / present.length : 0,
    averageGroupSize: present.length ? peoplePresent / present.length : 0,
    capacity,
    checkInProgress: percentageOf(processed, active.length),
    companions,
    donationPerPerson: peoplePresent ? funds / peoplePresent : 0,
    funds,
    missingDonations: present.filter((registration) => registration.donation <= 0).length,
    noShowRate: percentageOf(absent.length, processed),
    occupancy: percentageOf(active.length, capacity),
    peoplePresent,
    present,
    remainingCapacity: Math.max(capacity - active.length, 0),
    topSlotLabel: topSlotInfo
      ? `${compactDay(topSlotInfo.day.eventDate)}, ${topSlotInfo.slot.label}`
      : '—',
    unprocessed,
  }
}

function getInitialEventID(events: ManagedEvent[]) {
  return (
    events.find((event) => getEventPhase(event) === 'live')?.id ??
    events.find((event) => getEventPhase(event) === 'upcoming')?.id ??
    events.at(-1)?.id ??
    ''
  )
}

export function getStartDate(event: ManagedEvent) {
  return parseDate(event.startTime)
}

export function getEndDate(event: ManagedEvent) {
  return parseDate(event.endTime)
}

function getEventPhase(event: ManagedEvent): 'ended' | 'live' | 'upcoming' {
  const now = Date.now()
  const start = getStartDate(event)?.getTime()
  const end = getEndDate(event)?.getTime()

  if (start !== undefined && now < start) return 'upcoming'
  if (end !== undefined && now > end) return 'ended'
  return 'live'
}

function getSlotInfo(event: ManagedEvent, dayID: string, slotID: string) {
  const day = event.days.find((candidate) => candidate.id === dayID)
  const slot = day?.slots.find((candidate) => candidate.id === slotID)
  return day && slot ? { day, slot } : null
}

function activeRegistrationsForSlot(event: ManagedEvent, dayID: string, slotID: string) {
  return event.registrations.filter(
    (registration) =>
      registration.status !== 'cancelled' &&
      registration.day === dayID &&
      registration.slot === slotID,
  )
}

function sumDayRegistrations(event: ManagedEvent, dayID: string) {
  return event.registrations.filter(
    (registration) => registration.status !== 'cancelled' && registration.day === dayID,
  ).length
}

function formatEventDateRange(event: ManagedEvent) {
  const start = getStartDate(event)
  const end = getEndDate(event)

  if (!start) return 'Dată neconfigurată'
  if (!end || isSameCalendarDay(start, end)) {
    const dateLabel = new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(start)
    const startTime = formatTime(start)
    const endTime = end ? formatTime(end) : null

    return endTime ? `${dateLabel}, ${startTime} – ${endTime}` : `${dateLabel}, ${startTime}`
  }

  return `${formatDateAndTime(start, false)} – ${formatDateAndTime(end, true)}`
}

function formatSlotTimeRange(slot: Pick<ManagedEventSlot, 'endTime' | 'label' | 'startTime'>) {
  const start = parseDate(slot.startTime)
  const end = parseDate(slot.endTime)

  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`
  if (start) return formatTime(start)
  if (end) return formatTime(end)
  return slot.label
}

function parseDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatDateAndTime(value: Date, includeYear: boolean) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(value)
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function compactDay(date: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(new Date(date))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ro-RO', {
    currency: 'RON',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0)
}

function percentageOf(value: number, total: number) {
  if (!total || !Number.isFinite(value) || !Number.isFinite(total)) return 0
  return Math.round((value / total) * 100)
}

function getFillBadgeClass(percentage: number, invert: boolean = false) {
  if (percentage >= 100)
    return invert ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-700'
  if (percentage >= 50)
    return invert ? 'bg-amber-500 text-amber-100' : 'bg-amber-100 text-amber-500'
  return invert ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-700'
}

function maskName(name?: string | null) {
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  if (!normalizedName) return 'Participant fără nume'

  return normalizedName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0] ?? ''}${'•'.repeat(Math.max(Math.min(part.length - 1, 5), 1))}`)
    .join(' ')
}

function downloadParticipantTemplate(event: ManagedEvent) {
  const firstDay = event.days[0]
  const firstSlot = firstDay?.slots[0]
  const rows = [
    ['name', 'email', 'phone', 'day', 'slot', 'questions'],
    [
      'Ana Popescu',
      'ana@example.com',
      '0712345678',
      firstDay ? formatCSVDate(firstDay.eventDate) : 'YYYY-MM-DD',
      firstSlot?.label ?? '10:00-12:00',
      'Opțional: alergii sau alte observații',
    ],
  ]
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${event.slug || 'eveniment'}-participanti-model.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatCSVDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'YYYY-MM-DD'

  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
  }).format(date)
}

function exportReport(event: ManagedEvent) {
  const header = [
    'Nume',
    'Email',
    'Telefon',
    'Zi',
    'Tură',
    'Status',
    'Donație RON',
    'Însoțitori',
    'Ora sosirii',
  ]
  const rows = event.registrations.map((registration) => {
    const slot = getSlotInfo(event, registration.day, registration.slot)
    return [
      registration.name,
      registration.email,
      registration.phone,
      slot ? compactDay(slot.day.eventDate) : '',
      slot?.slot.label ?? '',
      registration.status,
      registration.donation,
      registration.guests,
      registration.timeOfArrival
        ? new Date(registration.timeOfArrival).toLocaleString('ro-RO')
        : '',
    ]
  })
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${event.slug || 'eveniment'}-raport.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
