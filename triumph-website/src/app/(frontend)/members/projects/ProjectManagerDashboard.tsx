'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import type { Event, EventRegistration, User } from '@/payload-types'
import { Media } from '@/components/Media'
import Counter from '@/components/ui/counter'
import { useProjectPage } from './useProjectPage'
import { CapacityOverrideFields, capacityIssue } from './CapacityOverrideFields'
import {
  defaultEventShift,
  type RemoteProjectData,
  type ProjectMetrics,
  type SlotSummary,
} from '@/utilities/eventOperationsTypes'
import { registrationPeople } from '@/utilities/eventPeople'
import { getEventTheme } from '@/utilities/eventTheme'
import {
  calculateEventPayment,
  formatAgeGroup,
  getRegistrationPaymentTotal,
  isAgeGroup,
  type AgeGroup,
} from '@/utilities/eventPayment'
import { EventPaymentFields, usePaymentDialogFocus } from './EventPaymentFields'
import { CheckInActionsMenu } from './CheckInActionsMenu'
import { checkInSearchTerms, matchesCheckInSearch } from '@/utilities/eventCheckInSearch'
import { EventActivityDialog } from './EventActivityDialog'
import { ShiftOperationsPanel } from './ShiftOperationsPanel'
import { DuplicateCleanupDialog } from './DuplicateCleanupDialog'
import { CheckInPagination } from './CheckInPagination'
import {
  getDuplicateRegistrationReasons,
  isDonationBelowMinimum,
} from '@/utilities/eventCheckInWarnings'
import {
  QrScannerSurface,
  type QrScannerNotice,
  type QrScannerOverlayTone,
} from '../_components/QrScannerSurface'

type PayloadEventDay = NonNullable<Event['days']>[number]
type PayloadEventSlot = NonNullable<NonNullable<PayloadEventDay['slots']>>[number]

export type ManagedRegistration = Omit<
  Pick<
    EventRegistration,
    | 'ageGroup'
    | 'consumptionAmount'
    | 'createdAt'
    | 'operationVersion'
    | 'lastHandledName'
    | 'lastHandledAt'
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
  >,
  'email' | 'phone'
> & {
  email: string
  phone: string
  timeOfArrival: string | null
}

type WalkInParticipantInput = {
  capacityOverrideReason?: string
  ageGroup: AgeGroup
  dayId: string
  totalCollected: number
  email: string
  guests: number
  name: string
  phone: string
  slotId: string
}

type EventAccessLevel = 'manager' | 'check-in'

type CheckInMember = {
  email: string
  id: string
  name: string
  role: User['role']
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
  remote?: boolean
  serverData?: RemoteProjectData
  accessLevel: EventAccessLevel
  checkInMembers: CheckInMember[]
  days: ManagedEventDay[]
  endTime: string | null
  location: string | null
  registrations: ManagedRegistration[]
  startTime: string | null
  donation: number
  minimumConsumation: number
}

type Tab = 'overview' | 'check-in' | 'report' | 'team'
type CounterTab = 'overview' | 'report'

const tabs: Array<{ icon: typeof LayoutDashboard; label: string; value: Tab }> = [
  { icon: LayoutDashboard, label: 'Overview', value: 'overview' },
  { icon: UserCheck, label: 'Check-in', value: 'check-in' },
  { icon: BarChart3, label: 'Raport final', value: 'report' },
  { icon: ShieldCheck, label: 'Echipă check-in', value: 'team' },
]

const memberRoleLabels: Record<User['role'], string> = {
  active: 'Membru Activ',
  aspirer: 'Membru Aspirant',
  'hr-director': 'HR Director',
  passive: 'Membru Pasiv',
  'past-president': 'Past President',
  president: 'Președinte',
  'pr-director': 'PR Director',
  secretary: 'Secretar',
  treasurer: 'Trezorier',
  'vice-president': 'Vice Președinte',
}

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
  const [showPersonalData, setShowPersonalData] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const selectedEvent = events.find((candidate) => candidate.id === selectedEventID) ?? events[0]
  const detail = useProjectPage(
    selectedEvent?.id || '',
    { page: 1, query: '', shift: 'all', status: 'all' },
    Boolean(selectedEvent?.remote && tab !== 'check-in'),
  )
  const [receivedData, setReceivedData] = useState<RemoteProjectData | null>(null)
  const receiveData = useCallback((data: RemoteProjectData) => setReceivedData(data), [])
  useEffect(() => {
    if (detail.data) setReceivedData(detail.data)
  }, [detail.data])
  const data = receivedData?.eventId === selectedEvent?.id ? receivedData : detail.data
  const event =
    selectedEvent && data && selectedEvent.remote
      ? { ...selectedEvent, ...data.event, registrations: data.registrations, serverData: data }
      : selectedEvent
  const metrics = useMemo(
    () => event?.serverData?.metrics ?? (event ? calculateMetrics(event) : null),
    [event],
  )
  const canManageEvent = event?.accessLevel === 'manager'

  useEffect(() => {
    if (!event || event.accessLevel === 'manager') return
    if (tab === 'report' || tab === 'team') setTab('check-in')
  }, [event, tab])

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

  function addRegistration(registration: ManagedRegistration) {
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === event?.id
          ? { ...candidate, registrations: [registration, ...candidate.registrations] }
          : candidate,
      ),
    )
  }

  const updateCheckInMembers = useCallback((eventID: string, members: CheckInMember[]) => {
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === eventID ? { ...candidate, checkInMembers: members } : candidate,
      ),
    )
  }, [])

  function openTab(nextTab: Tab) {
    if (!canManageEvent && (nextTab === 'report' || nextTab === 'team')) return

    if (nextTab === 'overview' || nextTab === 'report') {
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
      <section className="halftone-background relative overflow-hidden bg-[#141e34] px-4 pb-6 pt-24 text-primary sm:px-6 sm:pb-8 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-32 -top-48 size-[34rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:mb-7 sm:flex-row sm:items-center sm:gap-4">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium opacity-65 transition hover:opacity-100"
              href="/members"
            >
              <ArrowLeft className="size-4" />
              Dashboard membri
            </Link>
            <p className="text-xs opacity-55 sm:text-sm">
              Conectat ca <span className="font-semibold">{userName}</span>
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  {canManageEvent ? 'Project manager' : 'Echipă check-in'}
                </span>
                <PhaseBadge phase={phase} />
              </div>
              <h1 className="max-w-3xl break-words text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {event.name}
              </h1>
              <div className="mt-3 grid gap-2 text-sm opacity-70 sm:mt-4 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <CalendarDays className="size-4 text-accent" />
                  <span className="min-w-0 break-words">{formatEventDateRange(event)}</span>
                </span>
                {event.location && (
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <MapPin className="size-4 text-accent" />
                    <span className="min-w-0 break-words">{event.location}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full min-w-0 lg:w-auto lg:min-w-80">
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
                <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                  <div className="flex gap-3">
                    {events.map((option) => (
                      <button
                        className={`relative aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-lg border-2 bg-[#101a31] text-left transition sm:w-40 ${
                          selectedEventID === option.id ? 'border-accent' : 'border-border'
                        }`}
                        key={option.id}
                        onClick={() => setSelectedEventID(option.id)}
                        type="button"
                      >
                        <Media
                          resource={option.heroImage}
                          className="h-full w-full object-cover"
                          imgClassName="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex min-h-16 items-end bg-linear-to-t from-black to-transparent">
                          <h4 className="m-2 line-clamp-2 text-sm font-bold leading-4">
                            {option.name}
                          </h4>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-current/10 px-4 sm:mx-0 sm:mt-8 sm:px-0">
            {tabs
              .filter(
                (item) => canManageEvent || (item.value !== 'report' && item.value !== 'team'),
              )
              .map((item) => {
                const Icon = item.icon
                return (
                  <button
                    className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition sm:h-12 sm:px-4 ${
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
          className="mx-auto max-w-[1440px] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9"
          exit={prefersReducedMotion ? undefined : 'exit'}
          initial={prefersReducedMotion ? false : 'hidden'}
          key={event.id}
          variants={mainVariants}
        >
          {event.remote && !event.serverData && tab !== 'check-in' && (
            <p role="status" className="mb-4 text-sm">
              {detail.error || 'Se încarcă evenimentul…'}
              {detail.error && (
                <button type="button" className="ml-3 underline" onClick={detail.refresh}>
                  Reîncearcă
                </button>
              )}
            </p>
          )}
          {openedCounterTabs.overview && (!event.remote || event.serverData) && (
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
              canManageEvent={canManageEvent}
              event={event}
              onRemoteData={receiveData}
              onRegistrationCreate={addRegistration}
              onRegistrationUpdate={updateRegistration}
              onTogglePersonalData={() => setShowPersonalData((current) => !current)}
              showPersonalData={showPersonalData}
            />
          )}
          {openedCounterTabs.report && (!event.remote || event.serverData) && (
            <div hidden={tab !== 'report'}>
              <FinalReport event={event} metrics={metrics} />
            </div>
          )}
          {canManageEvent && tab === 'team' && (
            <CheckInTeam event={event} onMembersUpdate={updateCheckInMembers} />
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

function Overview(props: {
  event: ManagedEvent
  metrics: ProjectMetrics
  onOpenCheckIn: () => void
  onTogglePersonalData: () => void
  showPersonalData: boolean
}) {
  const { event, metrics, onOpenCheckIn, showPersonalData } = props
  const recentRegistrations =
    event.serverData?.recentRegistrations ??
    [...event.registrations]
      .filter((registration) => registration.status !== 'cancelled')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 6)

  return (
    <div className="grid gap-4 sm:gap-6">
      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          accent="blue"
          detail={`${metrics.remainingCapacity} locuri disponibile`}
          icon={UsersRound}
          label="Înscrieri active"
          numberValue={metrics.activeCount}
          value={String(metrics.activeCount)}
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
          numberValue={metrics.presentCount}
          value={String(metrics.presentCount)}
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

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <Panel>
          <PanelHeader
            description="Ocuparea capacității pentru fiecare zi și interval orar."
            title="Înscrieri pe ture"
          />
          <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-7">
            {event.days.map((day) => (
              <div key={day.id}>
                <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
                  <h3 className="text-sm font-bold capitalize">{day.label}</h3>
                  <span className="text-xs font-medium text-[#7a8497]">
                    {sumDayRegistrations(event, day.id)} persoane înscrise
                  </span>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
                  {day.slots.map((slot) => {
                    const registrations =
                      event.serverData?.slots.find(
                        (item) => item.day === day.id && item.slot === slot.id,
                      )?.reservedPeople ??
                      activeRegistrationsForSlot(event, day.id, slot.id).reduce(
                        (sum, row) => sum + registrationPeople(row),
                        0,
                      )
                    const presence =
                      event.serverData?.slots.find(
                        (item) => item.day === day.id && item.slot === slot.id,
                      )?.presentPeople ??
                      activeRegistrationsForSlot(event, day.id, slot.id)
                        .filter((reg) => reg.status === 'present')
                        .reduce((sum, row) => sum + registrationPeople(row), 0)
                    const percentage = percentageOf(registrations, slot.capacity)
                    const presencePercentage = percentageOf(presence, slot.capacity)
                    return (
                      <div
                        className="rounded-lg border border-current/10 bg-white/5 p-3 sm:rounded-xl sm:p-4"
                        key={slot.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold opacity-65 sm:text-xs">
                              <Clock3 className="size-3.5" />
                              {formatSlotTimeRange(slot)}
                            </p>
                            <p className="mt-1.5 text-base font-bold sm:mt-2 sm:text-lg">
                              {registrations}
                              <span className="text-sm font-medium opacity-55">
                                {' '}
                                / {slot.capacity}
                              </span>
                            </p>
                          </div>
                          <div className="inline-flex shrink-0 items-end align-bottom">
                            <span className="rounded-md px-1.5 py-0.5 text-[11px] sm:px-2 sm:py-1 sm:text-xs">
                              {presencePercentage}%
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-sm font-bold sm:px-3 sm:py-1 sm:text-base ${getFillBadgeClass(percentage)}`}
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
              description={`${recentRegistrations.length} din ${metrics.activeCount} afișate`}
              title="Înscrieri recente"
            />
          </div>
          <div className="mt-4 divide-y divide-[#edf0f4] sm:mt-5">
            {recentRegistrations.map((registration) => (
              <div className="flex items-center gap-3 py-3" key={registration.id}>
                <Avatar name={registration.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {showPersonalData ? registration.name : maskName(registration.name)}
                  </p>
                  <p className="mt-0.5 truncate text-xs opacity-55">
                    {showPersonalData
                      ? formatParticipantContact(registration)
                      : 'Date personale ascunse'}
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

const checkInSortColumns = [
  { key: 'participant', label: 'Participant' },
  { key: 'slot', label: 'Tură' },
  { key: 'status', label: 'Status' },
  { key: 'group', label: 'Grup' },
  { key: 'donation', label: 'Donație' },
] as const
type CheckInSortKey = (typeof checkInSortColumns)[number]['key']
type CheckInSort = { key: CheckInSortKey; direction: 'ascending' | 'descending' }
const checkInCollator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true })
const SEARCH_SHORTCUT_DELAY_MS = 250

function getCheckInSortValue(
  registration: ManagedRegistration,
  key: CheckInSortKey,
  event: ManagedEvent,
) {
  switch (key) {
    case 'participant':
      return registration.name
    case 'group':
      return 1 + registration.guests
    case 'donation':
      return registration.donation
    case 'status':
      return {
        absent: 'Absent',
        cancelled: 'Anulat',
        registered: 'În așteptare',
        present: 'Prezent',
      }[registration.status]
    case 'slot': {
      const info = getSlotInfo(event, registration.day, registration.slot)
      return info ? (parseDate(info.slot.startTime ?? info.day.eventDate)?.getTime() ?? null) : null
    }
  }
}

export function CheckIn(props: {
  onRemoteData?: (data: RemoteProjectData) => void
  canManageEvent: boolean
  event: ManagedEvent
  onRegistrationCreate: (registration: ManagedRegistration) => void
  onRegistrationUpdate: (registration: Partial<ManagedRegistration> & { id: string }) => void
  onTogglePersonalData: () => void
  showPersonalData: boolean
}) {
  const router = useRouter()
  const { canManageEvent, event, onRegistrationCreate, onRegistrationUpdate, showPersonalData } =
    props
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [readySearchKey, setReadySearchKey] = useState<string | null>(null)
  const [shift, setShift] = useState(() => (event.remote ? defaultEventShift(event) : 'all'))
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const paginationTopRef = useRef<HTMLDivElement>(null)
  const [sort, setSort] = useState<CheckInSort | null>(null)
  const [editing, setEditing] = useState<ManagedRegistration | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [resumeScannerAfterCheckIn, setResumeScannerAfterCheckIn] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [creatingWalkIn, setCreatingWalkIn] = useState(false)
  const [deletingID, setDeletingID] = useState<string | null>(null)
  const [savingID, setSavingID] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const remote = useProjectPage(
    event.id,
    { page, query, shift, status, sort: sort?.key, direction: sort?.direction },
    Boolean(event.remote),
  )
  useEffect(() => {
    if (remote.data) props.onRemoteData?.(remote.data)
  }, [remote.data, props.onRemoteData])
  useEffect(() => {
    if (remote.matches && remote.data && remote.data.page !== page) setPage(remote.data.page)
  }, [remote.matches, remote.data, page])

  const duplicateReasons = useMemo(
    () =>
      event.remote && remote.data
        ? new Map(
            Object.entries(remote.data.warnings)
              .filter(([, value]) => value.duplicateReasons.length)
              .map(([id, value]) => [id, value.duplicateReasons]),
          )
        : getDuplicateRegistrationReasons(event.registrations),
    [event.registrations, event.remote, remote.data],
  )
  const checkedInAttendance = useMemo(() => {
    if (event.remote && remote.data)
      return { people: remote.data.metrics.peoplePresent, capacity: remote.data.metrics.capacity }
    const people = event.registrations.reduce(
      (sum, registration) =>
        registration.status === 'present' ? sum + 1 + (registration.guests || 0) : sum,
      0,
    )
    const capacity = event.days.reduce(
      (sum, day) =>
        sum + day.slots.reduce((total, slot) => total + Math.max(0, slot.capacity || 0), 0),
      0,
    )
    return { people, capacity }
  }, [event.registrations, event.days, event.remote, remote.data])

  useEffect(() => {
    setSort(null)
    setPage(1)
    setShift(event.remote ? defaultEventShift(event) : 'all')
  }, [event.id])

  function toggleSort(key: CheckInSortKey) {
    setPage(1)
    setSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
  }

  const searchTerms = checkInSearchTerms(query)
  const filtered = event.remote
    ? remote.matches
      ? (remote.data?.registrations ?? [])
      : []
    : event.registrations.filter((registration) => {
        if (registration.status === 'cancelled') return false
        if (shift !== 'all' && `${registration.day}:${registration.slot}` !== shift) return false
        if (status === 'warnings') {
          if (
            !duplicateReasons.has(registration.id) &&
            !isDonationBelowMinimum(registration, event.donation)
          )
            return false
        } else if (status !== 'all' && registration.status !== status) return false
        return matchesCheckInSearch(
          [registration.name, registration.email, registration.phone],
          searchTerms,
        )
      })
  if (sort && !event.remote) {
    filtered.sort((left, right) => {
      const a = getCheckInSortValue(left, sort.key, event)
      const b = getCheckInSortValue(right, sort.key, event)
      // Keep unavailable shifts at the end in either direction.
      if (a === null) return b === null ? 0 : 1
      if (b === null) return -1
      const comparison =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : checkInCollator.compare(String(a), String(b))
      return sort.direction === 'ascending' ? comparison : -comparison
    })
  }

  const pageSize = 100
  const resultCount = event.remote ? (remote.data?.totalDocs ?? 0) : filtered.length
  const pages = event.remote
    ? (remote.data?.totalPages ?? 1)
    : Math.max(1, Math.ceil(resultCount / pageSize))
  const currentPage = event.remote ? page : Math.min(page, pages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleRegistrations = event.remote
    ? filtered
    : filtered.slice(pageStart, pageStart + pageSize)
  const resultRange =
    resultCount > pageSize
      ? `${pageStart + 1}–${Math.min(pageStart + pageSize, resultCount)} din ${resultCount} rezultate`
      : `${resultCount} rezultate`
  useEffect(() => {
    if (!event.remote) setPage((current) => Math.min(current, pages))
  }, [pages, event.remote])

  function changePage(next: number, fromBottom = false) {
    setPage(Math.max(1, Math.min(next, pages)))
    if (fromBottom) {
      paginationTopRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      paginationTopRef.current?.querySelector('select')?.focus({ preventScroll: true })
    }
  }

  const canOpenSearchShortcut =
    (!event.remote || (remote.matches && !remote.loading && !remote.error)) &&
    !editing &&
    !walkInOpen &&
    !scannerOpen &&
    !importOpen &&
    !cleanupOpen &&
    !historyOpen &&
    !shiftDialogOpen &&
    !creatingWalkIn &&
    !savingID &&
    !deletingID
  const singleSearchResult =
    canOpenSearchShortcut && query.trim() && resultCount === 1 && filtered.length === 1
      ? filtered[0]
      : null
  const emptySearchResult = canOpenSearchShortcut && resultCount === 0 && filtered.length === 0
  // Bind readiness to the current query, filters, event and result so an old timer
  // can never enable Enter for an earlier result or a request that is still loading.
  const searchResultKey =
    singleSearchResult || emptySearchResult
      ? JSON.stringify([
          event.id,
          query,
          shift,
          status,
          singleSearchResult?.id ?? 'add-participant',
        ])
      : null
  const searchShortcutReady = searchResultKey !== null && readySearchKey === searchResultKey

  useEffect(() => {
    setReadySearchKey(null)
    if (!searchResultKey) return
    const timer = window.setTimeout(
      () => setReadySearchKey(searchResultKey),
      SEARCH_SHORTCUT_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [searchResultKey])

  function openSearchShortcut() {
    if (!searchShortcutReady || (!singleSearchResult && !emptySearchResult)) return
    // The dialog restores focus here after closing, including when its shortcut is tapped.
    searchInputRef.current?.focus()
    setReadySearchKey(null)
    setResumeScannerAfterCheckIn(false)
    if (singleSearchResult) setEditing(singleSearchResult)
    else setWalkInOpen(true)
  }

  async function saveRegistration(args: {
    ageGroup?: AgeGroup
    capacityOverrideReason?: string
    totalCollected?: number
    guests: number
    registration: ManagedRegistration
    status: 'registered' | 'present' | 'absent'
  }) {
    setSavingID(args.registration.id)
    setNotice(null)

    try {
      const response = await fetch('/members/projects/check-in', {
        body: JSON.stringify({
          ageGroup: args.ageGroup,
          totalCollected: args.totalCollected,
          guests: args.guests,
          registrationId: args.registration.id,
          expectedVersion: args.registration.operationVersion || 0,
          capacityOverrideReason: args.capacityOverrideReason,
          status: args.status,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as {
        message?: string
        registration?: Pick<
          ManagedRegistration,
          | 'operationVersion'
          | 'lastHandledName'
          | 'lastHandledAt'
          | 'ageGroup'
          | 'consumptionAmount'
          | 'donation'
          | 'guests'
          | 'id'
          | 'status'
          | 'timeOfArrival'
        >
      }

      if (response.status === 409 && result.registration) {
        onRegistrationUpdate(result.registration)
        setEditing((current) =>
          current?.id === result.registration!.id
            ? { ...current, ...result.registration }
            : current,
        )
      }
      if (!response.ok || !result.registration) {
        remote.refresh()
        throw new Error(result.message || 'Actualizarea nu a putut fi salvată.')
      }

      onRegistrationUpdate(result.registration)
      remote.refresh()
      router.refresh()
      setEditing(null)
      if (args.status === 'present' && resumeScannerAfterCheckIn) {
        setScannerOpen(true)
      }
      setResumeScannerAfterCheckIn(false)
      setNotice({ kind: 'success', message: 'Înscriere actualizată.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Actualizarea nu a putut fi salvată.',
      })
      if (args.status === 'present') throw error
    } finally {
      setSavingID(null)
    }
  }

  async function createWalkInParticipant(values: WalkInParticipantInput) {
    setCreatingWalkIn(true)
    setNotice(null)

    try {
      const response = await fetch('/members/projects/check-in', {
        body: JSON.stringify({ ...values, eventId: event.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as {
        message?: string
        registration?: ManagedRegistration
      }

      if (!response.ok || !result.registration) {
        throw new Error(result.message || 'Participantul nu a putut fi adăugat.')
      }

      onRegistrationCreate(result.registration)
      remote.refresh()
      router.refresh()
      setWalkInOpen(false)
      setNotice({ kind: 'success', message: 'Participant adăugat și marcat prezent.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Participantul nu a putut fi adăugat.',
      })
      throw error
    } finally {
      setCreatingWalkIn(false)
    }
  }

  async function deleteRegistration(registration: ManagedRegistration) {
    setDeletingID(registration.id)
    setNotice(null)

    try {
      const response = await fetch('/members/projects/check-in', {
        body: JSON.stringify({
          registrationId: registration.id,
          expectedVersion: registration.operationVersion || 0,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      })
      const result = (await response.json()) as {
        message?: string
        registration?: ManagedRegistration
      }

      if (response.status === 409 && result.registration) {
        onRegistrationUpdate(result.registration)
        setEditing((current) =>
          current?.id === result.registration!.id
            ? { ...current, ...result.registration }
            : current,
        )
      }
      if (!response.ok || !result.registration) {
        remote.refresh()
        throw new Error(result.message || 'Participantul nu a putut fi șters.')
      }

      onRegistrationUpdate(result.registration)
      remote.refresh()
      router.refresh()
      setEditing(null)
      setResumeScannerAfterCheckIn(false)
      setNotice({ kind: 'success', message: 'Participant șters din lista de check-in.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Participantul nu a putut fi șters.',
      })
    } finally {
      setDeletingID(null)
    }
  }

  function hasDonationIssue(registration: ManagedRegistration) {
    return isDonationBelowMinimum(registration, event.donation)
  }

  function renderRegistrationWarnings(registration: ManagedRegistration) {
    const reasons = duplicateReasons.get(registration.id)
    const belowMinimum = hasDonationIssue(registration)
    if (!reasons && !belowMinimum) return null
    return (
      <div className="mt-2 flex max-w-60 flex-wrap gap-1.5">
        {reasons && (
          <span
            title={reasons.join(' · ')}
            className="inline-flex max-w-full items-start gap-1 rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold leading-4 text-amber-900"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
            Posibil duplicat
          </span>
        )}
        {belowMinimum && (
          <span className="inline-flex max-w-full items-start gap-1 rounded bg-red-100 px-2 py-1 text-[11px] font-semibold leading-4 text-red-700">
            <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
            Sub donația minimă
          </span>
        )}
      </div>
    )
  }

  function renderDonationSummary(registration: ManagedRegistration) {
    const hasDonationError = hasDonationIssue(registration)

    return (
      <>
        <span>{registration.donation > 0 ? formatCurrency(registration.donation) : '—'}</span>
        {hasDonationError && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-700">
            <XCircle className="size-3.5" />
            Minim {formatCurrency(event.donation * (1 + registration.guests))} / grup
          </p>
        )}
      </>
    )
  }

  function renderRegistrationActions(registration: ManagedRegistration, compact = false) {
    const confirmClass = compact
      ? 'inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-bold leading-4 text-white transition hover:bg-emerald-700 disabled:opacity-60'
      : 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60'
    const editClass = compact
      ? 'inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#cfd6df] bg-white px-3 py-2 text-center text-xs font-bold leading-4 text-[#344054] transition hover:bg-[#f5f7fa]'
      : 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cfd6df] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f5f7fa]'

    return (
      <>
        {registration.status !== 'present' && (
          <button
            className={confirmClass}
            disabled={savingID === registration.id}
            onClick={() => setEditing(registration)}
            type="button"
          >
            <Check className="size-3.5" />
            Confirmă
          </button>
        )}
        {registration.status === 'present' && (
          <button className={editClass} onClick={() => setEditing(registration)} type="button">
            Editează
          </button>
        )}
        {registration.status === 'registered' && (
          <button
            aria-label="Marchează absent"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-500 bg-red-100 text-red-300 transition hover:border-red-400 hover:bg-red-200 hover:text-red-500 disabled:opacity-60 md:size-9"
            disabled={savingID === registration.id}
            onClick={() =>
              saveRegistration({
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
      </>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de check-in</h2>
          <p className="mt-1 text-sm text-[#748094]">
            Confirmă sosirea, donația totală și persoanele care împart donația.
          </p>
          <div
            role="status"
            aria-label="Prezență la eveniment"
            aria-atomic="true"
            className="mt-3 text-sm tabular-nums"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck aria-hidden className="size-4 shrink-0" />
                <strong>{checkedInAttendance.people.toLocaleString('ro-RO')}</strong>{' '}
                {checkedInAttendance.people === 1 ? 'persoană prezentă' : 'persoane prezente'}
              </span>
              <span>
                {checkedInAttendance.capacity > 0 ? (
                  <>
                    <strong>
                      {(
                        (checkedInAttendance.people / checkedInAttendance.capacity) *
                        100
                      ).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}
                      %
                    </strong>{' '}
                    din capacitate ({checkedInAttendance.people.toLocaleString('ro-RO')} /{' '}
                    {checkedInAttendance.capacity.toLocaleString('ro-RO')})
                  </>
                ) : (
                  'Capacitate neconfigurată'
                )}
              </span>
            </div>
            <p className="mt-1 text-xs opacity-70">Total eveniment · include însoțitorii.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 sm:w-auto sm:px-4"
            onClick={() => setWalkInOpen(true)}
            type="button"
          >
            <UserPlus className="size-3.5" />
            Adaugă participant
          </button>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfd6df] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#f5f7fa] sm:w-auto sm:px-4"
            onClick={() => {
              setResumeScannerAfterCheckIn(false)
              setScannerOpen(true)
            }}
            type="button"
          >
            <QrCode className="size-3.5" />
            Scanează QR
          </button>
          {canManageEvent && (
            <CheckInActionsMenu
              onImport={() => setImportOpen(true)}
              onRemoveDuplicates={() => setCleanupOpen(true)}
              onHistory={event.remote ? () => setHistoryOpen(true) : undefined}
            />
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
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

      {event.remote && (
        <div
          className="flex flex-wrap items-center gap-3 text-xs"
          data-sync={
            remote.error ? 'error' : remote.loading || !remote.matches ? 'pending' : 'current'
          }
        >
          <span>
            {remote.error
              ? `Actualizarea este întreruptă: ${remote.error}`
              : remote.loading || !remote.matches
                ? 'Se actualizează lista…'
                : 'Conectat · actualizare automată la 5 secunde'}
          </span>
          {remote.lastSynced && (
            <time dateTime={new Date(remote.lastSynced).toISOString()}>
              Ultima actualizare: {new Date(remote.lastSynced).toLocaleTimeString('ro-RO')}
            </time>
          )}
          <button
            type="button"
            className="min-h-9 font-semibold underline"
            onClick={remote.refresh}
          >
            Actualizează
          </button>
        </div>
      )}
      {event.remote && remote.data && (
        <ShiftOperationsPanel
          event={event}
          data={remote.data}
          selected={shift}
          manager={canManageEvent}
          onUpdated={remote.refresh}
          onDialogChange={setShiftDialogOpen}
        />
      )}
      <Panel className="overflow-hidden p-0" stagger={false}>
        <div className="grid gap-3 border-b border-[#e5e9ef] p-3 sm:p-4 md:grid-cols-[minmax(220px,1fr)_220px_180px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a94a6]" />
            <input
              ref={searchInputRef}
              aria-label="Caută participanți"
              aria-describedby="checkin-search-hint"
              aria-keyshortcuts={searchShortcutReady ? 'Enter' : undefined}
              enterKeyHint="go"
              className="h-11 w-full rounded-lg border border-[#dce2ea] bg-white pl-10 pr-3 text-sm text-[#152039] outline-none transition placeholder:text-[#a4abba] focus:border-accent focus:ring-2 focus:ring-accent/10"
              onChange={(inputEvent) => {
                setQuery(inputEvent.target.value)
                setPage(1)
              }}
              onKeyDown={(keyEvent) => {
                if (
                  keyEvent.key !== 'Enter' ||
                  keyEvent.repeat ||
                  keyEvent.nativeEvent.isComposing ||
                  keyEvent.nativeEvent.keyCode === 229 ||
                  keyEvent.altKey ||
                  keyEvent.ctrlKey ||
                  keyEvent.metaKey ||
                  keyEvent.shiftKey
                )
                  return
                keyEvent.preventDefault()
                openSearchShortcut()
              }}
              placeholder="Caută nume, email sau telefon"
              type="search"
              value={query}
            />
          </div>
          <select
            aria-label="Filtrează după tură"
            className="h-11 w-full min-w-0 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-medium text-[#152039] outline-none focus:border-accent"
            onChange={(selectEvent) => {
              setShift(selectEvent.target.value)
              setPage(1)
            }}
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
            aria-label="Filtrează după status"
            className="h-11 w-full min-w-0 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-medium text-[#152039] outline-none focus:border-accent"
            onChange={(selectEvent) => {
              setStatus(selectEvent.target.value)
              setPage(1)
            }}
            value={status}
          >
            <option value="all">Toate statusurile</option>
            <option value="registered">În așteptare</option>
            <option value="present">Prezent</option>
            <option value="absent">Absent</option>
            <option value="warnings">Cu avertismente</option>
          </select>
        </div>

        <div
          id="checkin-search-hint"
          aria-live="polite"
          aria-atomic="true"
          className="border-b border-current/10 px-3 py-2 sm:px-4"
        >
          {searchShortcutReady && (singleSearchResult || emptySearchResult) ? (
            <button
              type="button"
              onClick={openSearchShortcut}
              aria-keyshortcuts="Enter"
              className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-left text-sm font-semibold text-card-foreground outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <kbd className="shrink-0 rounded border border-current/30 bg-card px-1.5 py-0.5 text-xs">
                Enter
              </kbd>
              <span className="min-w-0 break-words">
                {singleSearchResult ? (
                  <>
                    Deschide confirmarea pentru{' '}
                    {showPersonalData ? singleSearchResult.name : maskName(singleSearchResult.name)}
                  </>
                ) : (
                  'Adaugă participant nou'
                )}
              </span>
            </button>
          ) : (
            <p className="flex min-h-9 items-center text-xs leading-5 text-card-foreground/80">
              Caută un participant. Enter deschide confirmarea când rămâne un singur rezultat. Fără
              rezultate, Enter deschide adăugarea unui participant.
            </p>
          )}
        </div>

        {pages > 1 && (
          <div
            ref={paginationTopRef}
            className="flex flex-col gap-3 border-b border-current/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
          >
            <p aria-live="polite" aria-atomic="true" className="text-sm">
              {resultRange}
            </p>
            <CheckInPagination
              page={currentPage}
              pages={pages}
              position="sus"
              onChange={changePage}
            />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-b border-[#e5e9ef] p-3 md:hidden">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-card-foreground">
            Sortează după
            <select
              className="h-11 w-full min-w-0 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm text-[#152039] outline-none focus-visible:ring-2 focus-visible:ring-accent"
              value={sort?.key ?? ''}
              onChange={(e) => {
                setPage(1)
                setSort(
                  e.target.value
                    ? { key: e.target.value as CheckInSortKey, direction: 'ascending' }
                    : null,
                )
              }}
            >
              <option value="">Ordinea inițială</option>
              {checkInSortColumns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!sort}
            aria-label={`Sortează ${sort?.direction === 'ascending' ? 'descrescător' : 'crescător'}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dce2ea] bg-white px-3 text-sm font-semibold text-[#344054] outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            onClick={() => {
              if (sort) toggleSort(sort.key)
            }}
          >
            {sort?.direction === 'descending' ? (
              <ArrowDown aria-hidden className="size-4" />
            ) : (
              <ArrowUp aria-hidden className="size-4" />
            )}
            {sort?.direction === 'descending' ? 'Descrescător' : 'Crescător'}
          </button>
        </div>

        <div className="grid gap-2 p-2 sm:gap-3 sm:p-3 md:hidden">
          {visibleRegistrations.map((registration) => {
            const slotInfo = getSlotInfo(event, registration.day, registration.slot)
            const hasDonationError = hasDonationIssue(registration)
            const hasDuplicate = duplicateReasons.has(registration.id)

            return (
              <article
                aria-invalid={hasDonationError || undefined}
                className={`min-w-0 rounded-xl border p-3 text-[#152039] shadow-sm sm:p-4 ${
                  hasDonationError
                    ? 'border-red-200 bg-red-50'
                    : hasDuplicate
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-[#e4e8ef] bg-white'
                }`}
                key={registration.id}
              >
                <div className="grid min-w-0 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_auto] min-[360px]:items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={registration.name} />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold leading-5">
                        {showPersonalData ? registration.name : maskName(registration.name)}
                      </p>
                      <p className="mt-0.5 min-w-0 break-words text-xs leading-4 text-[#536071]">
                        {showPersonalData
                          ? formatParticipantContact(registration)
                          : 'Date personale ascunse'}
                      </p>
                      {renderRegistrationWarnings(registration)}
                    </div>
                  </div>
                  <div className="min-[360px]:justify-self-end">
                    <StatusBadge status={registration.status} />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm min-[390px]:grid-cols-2 sm:mt-4 sm:gap-3">
                  <div className="min-w-0 rounded-lg bg-[#f7f9fc] p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a8497]">
                      Tură
                    </p>
                    <p className="mt-1 break-words font-bold">
                      {slotInfo ? formatSlotTimeRange(slotInfo.slot) : '—'}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-[#7a8497]">
                      {slotInfo ? compactDay(slotInfo.day.eventDate) : 'Indisponibilă'}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#f7f9fc] p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a8497]">
                      Grup
                    </p>
                    <p className="mt-1 font-bold">{1 + registration.guests} pers.</p>
                  </div>
                  <div
                    className={`min-w-0 rounded-lg p-3 min-[390px]:col-span-2 ${
                      hasDonationError ? 'bg-red-100 text-red-700' : 'bg-[#f7f9fc]'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a8497]">
                      Donație
                    </p>
                    <div className="mt-1 break-words text-sm font-bold">
                      {renderDonationSummary(registration)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex min-w-0 gap-2 sm:mt-4">
                  {renderRegistrationActions(registration, true)}
                </div>
              </article>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-current/10 bg-card text-[11px] font-bold uppercase tracking-[0.09em] opacity-70">
                {checkInSortColumns.map((column) => {
                  const active = sort?.key === column.key
                  const Icon = active
                    ? sort.direction === 'ascending'
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? sort.direction : 'none'}
                      className={`${column.key === 'participant' ? 'px-5' : 'px-4'} py-2`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        aria-label={`Sortează după ${column.label}, ${active && sort.direction === 'ascending' ? 'descrescător' : 'crescător'}`}
                        className="-ml-1 inline-flex min-h-9 items-center gap-2 rounded px-1 text-inherit uppercase outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {column.label}
                        <Icon aria-hidden className="size-3.5 shrink-0" />
                      </button>
                    </th>
                  )
                })}
                <th scope="col" className="px-5 py-3.5 text-right">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {visibleRegistrations.map((registration) => {
                const slotInfo = getSlotInfo(event, registration.day, registration.slot)
                const hasDonationError = hasDonationIssue(registration)
                const hasDuplicate = duplicateReasons.has(registration.id)

                return (
                  <tr
                    aria-invalid={hasDonationError || undefined}
                    className={
                      hasDonationError
                        ? 'bg-red-50/90 text-[#152039] ring-1 ring-inset ring-red-200 transition hover:bg-red-50'
                        : hasDuplicate
                          ? 'bg-amber-50 text-amber-950 transition hover:bg-amber-100'
                          : 'bg-card transition hover:opacity-90'
                    }
                    key={registration.id}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={registration.name} />
                        <div className="min-w-0">
                          <p className="max-w-60 truncate text-sm font-bold">
                            {showPersonalData ? registration.name : maskName(registration.name)}
                          </p>
                          <p
                            className={`mt-0.5 max-w-60 truncate text-xs ${hasDonationError || hasDuplicate ? 'text-[#536071]' : 'opacity-55'}`}
                          >
                            {showPersonalData
                              ? formatParticipantContact(registration)
                              : 'Date personale ascunse'}
                          </p>
                          {renderRegistrationWarnings(registration)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold">
                        {slotInfo ? formatSlotTimeRange(slotInfo.slot) : '—'}
                      </p>
                      <p
                        className={`mt-0.5 text-xs capitalize ${hasDonationError || hasDuplicate ? 'text-[#536071]' : 'opacity-55'}`}
                      >
                        {slotInfo ? compactDay(slotInfo.day.eventDate) : 'Tură indisponibilă'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={registration.status} />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {1 + registration.guests} pers.
                    </td>
                    <td
                      className={`px-4 py-4 text-sm font-bold ${
                        hasDonationError ? 'text-red-700' : ''
                      }`}
                    >
                      {renderDonationSummary(registration)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {renderRegistrationActions(registration)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <InlineEmpty
              text={
                event.remote && !remote.matches
                  ? 'Se încarcă înscrierile…'
                  : 'Nicio înscriere nu corespunde filtrelor.'
              }
            />
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-current/10 bg-card px-4 py-3 text-xs font-medium sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-col gap-1 opacity-65">
            <span>{resultRange}</span>
            <span>
              {event.remote
                ? (remote.data?.metrics.activeCount ?? 0)
                : event.registrations.filter((item) => item.status !== 'cancelled').length}{' '}
              înscrieri active
            </span>
          </div>
          {pages > 1 && (
            <CheckInPagination
              page={currentPage}
              pages={pages}
              position="jos"
              onChange={(next) => changePage(next, true)}
            />
          )}
        </div>
      </Panel>

      {historyOpen && (
        <EventActivityDialog
          eventId={event.id}
          showPersonalData={showPersonalData}
          onClose={() => setHistoryOpen(false)}
          onUpdated={remote.refresh}
        />
      )}
      {editing && (
        <CheckInDialog
          onClose={() => {
            setEditing(null)
            setResumeScannerAfterCheckIn(false)
          }}
          onDelete={() => deleteRegistration(editing)}
          onSave={(values) =>
            saveRegistration({ ...values, registration: editing, status: 'present' })
          }
          deleting={deletingID === editing.id}
          registration={editing}
          saving={savingID === editing.id}
          showPersonalData={showPersonalData}
          managedEvent={event.remote && remote.data ? { ...event, serverData: remote.data } : event}
          canDelete={canManageEvent}
        />
      )}
      {walkInOpen && (
        <WalkInParticipantDialog
          event={event.remote && remote.data ? { ...event, serverData: remote.data } : event}
          canManageEvent={canManageEvent}
          initialShift={event.remote ? shift : undefined}
          onClose={() => setWalkInOpen(false)}
          onSave={createWalkInParticipant}
          saving={creatingWalkIn}
        />
      )}
      {scannerOpen && (
        <EventRegistrationScannerDialog
          event={event}
          onClose={() => {
            setScannerOpen(false)
            setResumeScannerAfterCheckIn(false)
          }}
          onRegistrationFound={(registration) => {
            setScannerOpen(false)
            setResumeScannerAfterCheckIn(true)
            setEditing(registration)
          }}
          showPersonalData={showPersonalData}
        />
      )}
      {canManageEvent && importOpen && (
        <ParticipantImportDialog event={event} onClose={() => setImportOpen(false)} />
      )}
      {canManageEvent && cleanupOpen && (
        <DuplicateCleanupDialog
          eventId={event.id}
          labels={Object.fromEntries(
            event.registrations.map((row) => [
              row.id,
              showPersonalData ? row.name : maskName(row.name),
            ]),
          )}
          onClose={() => setCleanupOpen(false)}
          onComplete={(result) => {
            for (const registration of result.registrations) onRegistrationUpdate(registration)
            setCleanupOpen(false)
            setNotice({ kind: result.incomplete ? 'error' : 'success', message: result.message })
            remote.refresh()
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function CheckInTeam(props: {
  event: ManagedEvent
  onMembersUpdate: (eventID: string, members: CheckInMember[]) => void
}) {
  const router = useRouter()
  const { event, onMembersUpdate } = props
  const [candidates, setCandidates] = useState<CheckInMember[]>([])
  const [selectedIDs, setSelectedIDs] = useState<string[]>(
    event.checkInMembers.map((member) => member.id),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadMembers() {
      setLoading(true)
      setNotice(null)

      try {
        const response = await fetch(
          `/members/projects/access?eventId=${encodeURIComponent(event.id)}`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        )
        const result = (await response.json()) as {
          candidates?: CheckInMember[]
          members?: CheckInMember[]
          message?: string
        }

        if (!response.ok || !result.candidates) {
          throw new Error(result.message || 'Echipa de check-in nu a putut fi încărcată.')
        }

        setCandidates(result.candidates)
        setSelectedIDs((result.members ?? []).map((member) => member.id))
        onMembersUpdate(event.id, result.members ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return

        setNotice({
          kind: 'error',
          message:
            error instanceof Error ? error.message : 'Echipa de check-in nu a putut fi încărcată.',
        })
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadMembers()

    return () => controller.abort()
  }, [event.id, onMembersUpdate])

  function toggleMember(memberID: string) {
    setSelectedIDs((current) =>
      current.includes(memberID)
        ? current.filter((candidateID) => candidateID !== memberID)
        : [...current, memberID],
    )
  }

  async function saveMembers() {
    setSaving(true)
    setNotice(null)

    try {
      const response = await fetch('/members/projects/access', {
        body: JSON.stringify({ eventId: event.id, memberIds: selectedIDs }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      const result = (await response.json()) as {
        members?: CheckInMember[]
        message?: string
      }

      if (!response.ok || !result.members) {
        throw new Error(result.message || 'Echipa de check-in nu a putut fi salvată.')
      }

      onMembersUpdate(event.id, result.members)
      router.refresh()
      setSelectedIDs(result.members.map((member) => member.id))
      setNotice({ kind: 'success', message: 'Echipa de check-in a fost actualizată.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Echipa de check-in nu a putut fi salvată.',
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedSet = new Set(selectedIDs)

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Acces eveniment
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Echipă check-in</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#748094]">
            Membrii adăugați aici pot vedea evenimentul și pot procesa check-in-ul, fără acces la
            raportul final sau importuri.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || saving}
          onClick={saveMembers}
          type="button"
        >
          <Check className="size-4" />
          {saving ? 'Se salvează…' : 'Salvează echipa'}
        </button>
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
        <div className="border-b border-[#e5e9ef] p-4 sm:p-5">
          <PanelHeader
            description={`${selectedIDs.length} membri selectați pentru ${event.name}`}
            title="Membri eligibili"
          />
        </div>

        {loading ? (
          <InlineEmpty text="Se încarcă membrii eligibili…" />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {candidates.map((member) => (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  selectedSet.has(member.id)
                    ? 'border-accent bg-accent/10'
                    : 'border-[#e4e8ef] bg-white hover:border-accent/45'
                }`}
                key={member.id}
              >
                <input
                  checked={selectedSet.has(member.id)}
                  className="mt-1 size-4 accent-[#00a2e0]"
                  disabled={saving}
                  onChange={() => toggleMember(member.id)}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#152039]">
                    {member.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[#6b7688]">
                    {member.email}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-bold text-[#536071]">
                    {formatMemberRole(member.role)}
                  </span>
                </span>
              </label>
            ))}
            {candidates.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3">
                <InlineEmpty text="Nu există membri non-board disponibili." />
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}

export function WalkInParticipantDialog(props: {
  canManageEvent?: boolean
  initialShift?: string
  event: ManagedEvent
  onClose: () => void
  onSave: (values: WalkInParticipantInput) => Promise<void>
  saving: boolean
}) {
  const { event, onClose, onSave, saving } = props
  const formRef = usePaymentDialogFocus()
  const shiftOptions = event.days.flatMap((day) =>
    day.slots.map((slot) => ({
      dayId: day.id,
      label: `${compactDay(day.eventDate)} · ${slot.label}`,
      slotId: slot.id,
      value: `${day.id}:${slot.id}`,
    })),
  )
  const [shift, setShift] = useState(() =>
    shiftOptions.some((option) => option.value === props.initialShift)
      ? props.initialShift!
      : event.remote
        ? defaultEventShift(event)
        : (shiftOptions[0]?.value ?? ''),
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [totalCollected, setTotalCollected] = useState('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('')
  const [guests, setGuests] = useState('0')
  const [overrideReason, setOverrideReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selectedShift = shiftOptions.find((option) => option.value === shift)
  const parsedGuests = Number(guests)
  const payment = calculateEventPayment(event, guests.trim() ? parsedGuests : NaN, totalCollected)
  const issue = capacityIssue(
    event,
    selectedShift?.dayId || '',
    selectedShift?.slotId || '',
    parsedGuests,
  )
  const capacityValid =
    !issue.closed && (!issue.exceeds || (props.canManageEvent && overrideReason.trim().length >= 5))
  const canSubmit =
    capacityValid && Boolean(selectedShift && name.trim() && isAgeGroup(ageGroup) && !payment.error)

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!canSubmit || !selectedShift || !isAgeGroup(ageGroup)) return

    setError(null)

    try {
      await onSave({
        capacityOverrideReason: overrideReason.trim(),
        dayId: selectedShift.dayId,
        ageGroup,
        totalCollected: payment.totalCollected!,
        email: email.trim(),
        guests: parsedGuests,
        name: name.trim(),
        phone: phone.trim(),
        slotId: selectedShift.slotId,
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Participantul nu a putut fi adăugat.',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !saving) onClose()
      }}
    >
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkin-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white text-[#152039] shadow-2xl sm:rounded-2xl"
        onSubmit={submit}
      >
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              Participant neînregistrat
            </p>
            <h2 id="walkin-title" className="mt-1.5 break-words text-xl font-bold">
              Adaugă participant la eveniment
            </h2>
            <p className="mt-1 text-xs text-[#7a8497]">
              Va fi înregistrat direct ca prezent, cu ora sosirii curentă.
            </p>
          </div>
          <button
            aria-label="Închide"
            className="flex size-9 items-center justify-center rounded-lg text-[#7a8497] transition hover:bg-[#f2f4f7]"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-6 sm:py-6">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-bold">Zi și tură</span>
            <select
              className="h-11 rounded-lg border border-[#d7dde6] bg-white px-3 text-sm outline-none focus:border-accent"
              disabled={saving || shiftOptions.length === 0}
              onChange={(selectEvent) => setShift(selectEvent.target.value)}
              required
              value={shift}
            >
              {shiftOptions.length === 0 && <option value="">Nu există ture configurate</option>}
              {shiftOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-bold">Nume *</span>
            <input
              className="h-11 rounded-lg border border-[#d7dde6] px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              disabled={saving}
              maxLength={160}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
              placeholder="Nume complet"
              required
              type="text"
              value={name}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">
              Email <span className="font-medium text-[#8a94a6]">(opțional)</span>
            </span>
            <input
              className="h-11 rounded-lg border border-[#d7dde6] px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              disabled={saving}
              onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              placeholder="nume@exemplu.com"
              type="email"
              value={email}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">
              Telefon <span className="font-medium text-[#8a94a6]">(opțional)</span>
            </span>
            <input
              className="h-11 rounded-lg border border-[#d7dde6] px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              disabled={saving}
              maxLength={50}
              onChange={(inputEvent) => setPhone(inputEvent.target.value)}
              placeholder="+40 700 000 000"
              type="tel"
              value={phone}
            />
          </label>

          <div className="sm:col-span-2">
            <EventPaymentFields
              event={event}
              ageGroup={ageGroup}
              onAgeGroupChange={setAgeGroup}
              totalCollected={totalCollected}
              onTotalChange={setTotalCollected}
              guests={guests}
              onGuestsChange={setGuests}
              disabled={saving}
            />
          </div>

          <div className="sm:col-span-2">
            <CapacityOverrideFields
              issue={issue}
              manager={Boolean(props.canManageEvent)}
              reason={overrideReason}
              onChange={setOverrideReason}
              disabled={saving}
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2"
            >
              {error}
            </p>
          )}
        </div>

        <div className="grid gap-3 border-t border-[#e7ebf0] bg-[#fafbfc] px-4 py-4 sm:flex sm:px-6 sm:justify-end">
          <button
            className="h-11 rounded-lg border border-[#d7dde6] bg-white px-5 text-sm font-bold text-[#536071] sm:flex-none"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Anulează
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold leading-5 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
            disabled={saving || !canSubmit}
            type="submit"
          >
            <UserPlus className="size-4" />
            {saving ? 'Se adaugă…' : 'Adaugă și marchează prezent'}
          </button>
        </div>
      </form>
    </div>
  )
}

const EVENT_SCANNER_READY_NOTICE: QrScannerNotice = {
  message: 'Camera este pregătită pentru codurile participanților.',
  title: 'Pregătit pentru scanare',
  tone: 'idle',
}

function EventRegistrationScannerDialog(props: {
  event: ManagedEvent
  onClose: () => void
  onRegistrationFound: (registration: ManagedRegistration) => void
  showPersonalData: boolean
}) {
  const { event, onClose, onRegistrationFound, showPersonalData } = props
  const [notice, setNotice] = useState<QrScannerNotice>(EVENT_SCANNER_READY_NOTICE)

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const handleScan = useCallback(
    async (value: string): Promise<QrScannerOverlayTone> => {
      const registrationID = extractEventRegistrationID(value)

      if (!registrationID) {
        setNotice({
          message: 'Codul scanat nu conține o înscriere validă.',
          title: 'Scanare respinsă',
          tone: 'error',
        })
        return 'error'
      }

      let registration = event.registrations.find((candidate) => candidate.id === registrationID)
      if (event.remote) {
        const response = await fetch(
          `/members/projects/data?eventId=${encodeURIComponent(event.id)}&registrationId=${encodeURIComponent(registrationID)}`,
          { cache: 'no-store' },
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Înscrierea nu a putut fi încărcată.')
        registration = result.registration
      }

      if (!registration) {
        setNotice({
          message: 'Înscrierea scanată nu aparține acestui eveniment.',
          title: 'Participant negăsit',
          tone: 'error',
        })
        return 'error'
      }

      if (registration.status === 'cancelled') {
        setNotice({
          message: 'Înscrierea anulată nu poate fi procesată la check-in.',
          title: 'Înscriere anulată',
          tone: 'warning',
        })
        return 'warning'
      }

      setNotice({
        message: showPersonalData ? registration.name : maskName(registration.name),
        title:
          registration.status === 'present'
            ? 'Participant deja confirmat'
            : 'Participant identificat',
        tone: registration.status === 'present' ? 'warning' : 'success',
      })
      onRegistrationFound(registration)

      return registration.status === 'present' ? 'warning' : 'success'
    },
    [event.id, event.remote, event.registrations, onRegistrationFound, showPersonalData],
  )

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose()
      }}
    >
      <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Scanner QR
            </p>
            <h2 className="mt-1.5 break-words text-xl font-bold text-[#152039]">{event.name}</h2>
            <p className="mt-1 text-xs text-[#7a8497]">
              Codul deschide confirmarea pentru înscrierea scanată.
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

        <div className="bg-[#f8fafc] p-3 sm:p-5">
          <QrScannerSurface
            busyLabel="Se caută înscrierea"
            className="sm:aspect-[4/5] lg:aspect-video xl:aspect-video"
            notice={notice}
            onCameraError={(message) =>
              setNotice({
                message,
                title: 'Camera indisponibilă',
                tone: 'error',
              })
            }
            onScan={handleScan}
            onScanError={(message) =>
              setNotice({
                message,
                title: 'Eroare la scanare',
                tone: 'error',
              })
            }
            onScanStart={() =>
              setNotice({
                message: 'Se caută înscrierea participantului.',
                title: 'Scanare în curs',
                tone: 'idle',
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

export function CheckInDialog(props: {
  canDelete: boolean
  deleting: boolean
  onClose: () => void
  onDelete: () => void | Promise<void>
  onSave: (values: {
    capacityOverrideReason?: string
    ageGroup: AgeGroup
    totalCollected: number
    guests: number
  }) => void | Promise<void>
  registration: ManagedRegistration
  saving: boolean
  showPersonalData: boolean
  managedEvent: ManagedEvent
}) {
  const formRef = usePaymentDialogFocus()
  const {
    canDelete,
    deleting,
    onClose,
    onDelete,
    onSave,
    registration,
    saving,
    showPersonalData,
    managedEvent,
  } = props
  const [totalCollected, setTotalCollected] = useState(
    registration.consumptionAmount != null || registration.status === 'present'
      ? String(getRegistrationPaymentTotal(managedEvent, registration))
      : '',
  )
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>(registration.ageGroup ?? '')
  const [overrideReason, setOverrideReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteRequested, setDeleteRequested] = useState(false)
  const [guests, setGuests] = useState(String(registration.guests || 0))
  const parsedGuests = Number(guests || 0)
  const payment = calculateEventPayment(
    managedEvent,
    guests.trim() ? parsedGuests : NaN,
    totalCollected,
  )
  const issue = capacityIssue(
    managedEvent,
    registration.day,
    registration.slot,
    parsedGuests,
    registration,
  )
  const capacityValid =
    !issue.closed && (!issue.exceeds || (canDelete && overrideReason.trim().length >= 5))
  const canSubmit = capacityValid && isAgeGroup(ageGroup) && !payment.error
  useEffect(() => {
    setAgeGroup(registration.ageGroup || '')
    setGuests(String(registration.guests || 0))
    setTotalCollected(
      registration.consumptionAmount != null || registration.status === 'present'
        ? String(getRegistrationPaymentTotal(managedEvent, registration))
        : '',
    )
  }, [registration.operationVersion])
  const busy = saving || deleting

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (busy) return
    if (!isAgeGroup(ageGroup)) {
      setError('Selectează categoria de vârstă.')
      return
    }
    if (!capacityValid) {
      setError('Verifică disponibilitatea turei și aprobarea managerului.')
      return
    }
    if (payment.error) {
      setError(payment.error)
      return
    }
    setError(null)
    try {
      await onSave({
        capacityOverrideReason: overrideReason.trim(),
        ageGroup,
        totalCollected: payment.totalCollected!,
        guests: parsedGuests,
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Confirmarea nu a putut fi salvată.',
      )
    }
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#09101f]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        noValidate
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              Confirmare sosire
            </p>
            <h2 id="checkin-title" className="mt-1.5 break-words text-xl font-bold text-[#152039]">
              {showPersonalData ? registration.name : maskName(registration.name)}
            </h2>
            {showPersonalData && (
              <p className="mt-1 text-xs text-[#7a8497]">
                {formatParticipantContact(registration)}
              </p>
            )}
            <p className="mt-2 text-sm text-[#536071]">{formatAgeGroup(registration.ageGroup)}</p>
            {registration.status === 'present' && (
              <p className="mt-2 text-sm font-semibold text-emerald-800">
                Deja prezent
                {registration.lastHandledName
                  ? ` · ultima modificare de ${registration.lastHandledName}`
                  : ''}
                {registration.lastHandledAt
                  ? `, ${new Date(registration.lastHandledAt).toLocaleString('ro-RO')}`
                  : ''}
                .
              </p>
            )}
          </div>
          <button
            aria-label="Închide"
            className="flex size-9 items-center justify-center rounded-lg text-[#7a8497] transition hover:bg-[#f2f4f7]"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">
          {showPersonalData && registration.questions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                Mențiune participant
              </p>
              <p className="mt-1 text-sm leading-5 text-amber-900">{registration.questions}</p>
            </div>
          )}

          {deleteRequested && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">
                Participantul va fi eliminat din lista activă de check-in.
              </p>
            </div>
          )}

          <EventPaymentFields
            event={managedEvent}
            ageGroup={ageGroup}
            onAgeGroupChange={setAgeGroup}
            totalCollected={totalCollected}
            onTotalChange={setTotalCollected}
            guests={guests}
            onGuestsChange={setGuests}
            disabled={busy}
            legacy={registration.consumptionAmount == null && registration.status === 'present'}
          />
          <CapacityOverrideFields
            issue={issue}
            manager={canDelete}
            reason={overrideReason}
            onChange={setOverrideReason}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e7ebf0] bg-[#fafbfc] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {canDelete ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                if (deleteRequested) {
                  void onDelete()
                  return
                }

                setDeleteRequested(true)
              }}
              type="button"
            >
              <Trash2 className="size-4" />
              {deleting ? 'Se șterge…' : deleteRequested ? 'Confirmă ștergerea' : 'Șterge'}
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="h-11 rounded-lg border border-[#d7dde6] bg-white px-5 text-sm font-bold text-[#536071] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Anulează
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || !canSubmit}
              type="submit"
            >
              <CheckCircle2 className="size-4" />
              {saving ? 'Se salvează…' : 'Confirmă check-in'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

type ParticipantImportResponse = {
  created?: Array<{ email?: string; id: string; name: string; row: number }>
  errors?: Array<{ message: string; row: number }>
  message?: string
  skipped?: Array<{ email?: string; reason: string; row: number }>
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
      const response = await fetch('/members/projects/import', {
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
        <div className="flex items-start justify-between border-b border-[#e7ebf0] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Import participanți
            </p>
            <h2 className="mt-1.5 break-words text-xl font-bold text-[#152039]">{event.name}</h2>
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
          <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">
            <div className="rounded-xl border border-[#dceaf1] bg-[#f3f9fc] p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-bold text-[#152039]">Coloanele CSV</p>
                  <p className="mt-1 break-words text-xs leading-5 text-[#657286]">
                    Obligatorii: <code>name,phone</code>. Opționale:{' '}
                    <code>day,slot,email,donation,ageGroup,questions</code>. Dacă ziua sau tura
                    lipsesc, se alege primul interval cronologic cu locuri disponibile, respectând
                    ziua sau tura completată. Categoria de vârstă acceptă minor, adult sau major.
                    Donația exclude consumația. Fără donație sau cu donație 0, participantul rămâne
                    în așteptare; cu donație pozitivă, este marcat prezent. Ziua folosește{' '}
                    <code>YYYY-MM-DD</code>, iar tura intervalul afișat în eveniment, de exemplu{' '}
                    <code>10:00-12:00</code>.
                  </p>
                </div>
              </div>
              <button
                className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-white px-3 py-2 text-center text-xs font-bold leading-4 text-accent transition hover:bg-[#f9fcfd] sm:w-auto"
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

          <div className="grid gap-3 border-t border-[#e7ebf0] bg-[#fafbfc] px-4 py-4 sm:flex sm:px-6 sm:justify-end">
            <button
              className="h-11 rounded-lg border border-[#d7dde6] bg-white px-5 text-sm font-bold text-[#536071] sm:flex-none"
              disabled={isUploading}
              onClick={onClose}
              type="button"
            >
              Închide
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-bold leading-5 text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
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

function FinalReport(props: { event: ManagedEvent; metrics: ProjectMetrics }) {
  const { event, metrics } = props
  const reportDays = metrics.days
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d9dfe7] bg-white px-4 text-sm font-bold text-[#344054] shadow-sm transition hover:bg-[#f8fafc] sm:w-auto"
          onClick={() => exportReport(event)}
          type="button"
        >
          <Download className="size-4" />
          Exportă CSV
        </button>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
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

      <div className="rounded-xl border border-[#d9dfe7] bg-white p-4 text-sm text-[#344054]">
        <dl className="flex flex-wrap gap-x-8 gap-y-3 tabular-nums">
          <div>
            <dt>Consumație înregistrată</dt>
            <dd className="mt-1 font-bold">{formatCurrency(metrics.consumptionAmount)}</dd>
          </div>
          <div>
            <dt>Total încasat înregistrat</dt>
            <dd className="mt-1 font-bold">{formatCurrency(metrics.totalCollected)}</dd>
          </div>
        </dl>
        {metrics.legacyConsumptionCount > 0 && (
          <p className="mt-3">
            {metrics.legacyConsumptionCount} înscrieri prezente au consumația istorică
            nespecificată. Totalul include doar sumele înregistrate.
          </p>
        )}
      </div>
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
              <Legend color="bg-emerald-500" label="Au venit" value={metrics.presentCount} />
              <Legend color="bg-[#ef6a6a]" label="Nu au ajuns" value={metrics.absentCount} />
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
      className={`pm-dashboard-card rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:rounded-2xl sm:p-6 ${props.className ?? ''}`}
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
      <h2 className="text-base font-bold sm:text-lg">{props.title}</h2>
      <p className="mt-0.5 text-xs leading-5 opacity-60 sm:mt-1 sm:text-sm">{props.description}</p>
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
      className="pm-dashboard-card min-w-0 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:rounded-2xl sm:p-5"
      variants={panelVariants}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase leading-3 tracking-[0.08em] opacity-60 sm:text-xs sm:leading-4">
            {props.label}
          </p>
          {props.numberValue == undefined && (
            <p className="mt-2 break-words text-xl font-bold leading-none tracking-tight sm:mt-3 sm:text-3xl sm:leading-none">
              {props.value}
            </p>
          )}
          {props.numberValue != undefined && (
            <span className="mt-2 inline-flex items-center gap-1 align-bottom text-xl font-bold leading-none tracking-tight sm:mt-3 sm:text-3xl sm:leading-none">
              <Counter
                animateChanges={false}
                animateOnMount
                value={Math.round(props.numberValue * 100) / 100}
                decimalSeparator=","
                className="font-bold"
                counterStyle={{ fontSize: 'inherit' }}
                horizontalPadding={0}
                gap={0}
                topGradientStyle={{}}
                bottomGradientStyle={{}}
              />
              {props.numberUnit && <span>{props.numberUnit}</span>}
            </span>
          )}
          <p className="mt-1 text-[11px] font-medium leading-4 opacity-60 sm:mt-1.5 sm:text-xs">
            {props.detail}
          </p>
        </div>
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10 sm:rounded-xl ${colors[props.accent]}`}
        >
          <Icon className="size-4 sm:size-5" />
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

export function PrivacyButton(props: { active: boolean; onClick: () => void; wide?: boolean }) {
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
    activeCount: active.length,
    presentCount: present.length,
    absentCount: absent.length,
    activePeople: active.reduce((sum, row) => sum + registrationPeople(row), 0),
    attendanceRate: percentageOf(present.length, processed),
    averageDonation: present.length ? funds / present.length : 0,
    averageGroupSize: present.length ? peoplePresent / present.length : 0,
    capacity,
    checkInProgress: percentageOf(processed, active.length),
    companions,
    donationPerPerson: peoplePresent ? funds / peoplePresent : 0,
    funds,
    consumptionAmount: present.reduce((sum, row) => sum + (row.consumptionAmount || 0), 0),
    totalCollected:
      present.reduce(
        (sum, row) =>
          sum + Math.round(row.donation * 100) + Math.round((row.consumptionAmount || 0) * 100),
        0,
      ) / 100,
    legacyConsumptionCount: present.filter((row) => row.consumptionAmount == null).length,
    days: event.days.map((day) => {
      const rows = present.filter((row) => row.day === day.id)
      const donation = rows.reduce((sum, row) => sum + Math.round(row.donation * 100), 0)
      const consumption = rows.reduce(
        (sum, row) => sum + Math.round((row.consumptionAmount || 0) * 100),
        0,
      )
      return {
        id: day.id,
        label: compactDay(day.eventDate),
        attendees: rows.reduce((sum, row) => sum + registrationPeople(row), 0),
        funds: donation / 100,
        consumptionAmount: consumption / 100,
        totalCollected: (donation + consumption) / 100,
      }
    }),
    missingDonations: present.filter((registration) => registration.donation <= 0).length,
    noShowRate: percentageOf(absent.length, processed),
    occupancy: percentageOf(
      active.reduce((sum, row) => sum + registrationPeople(row), 0),
      capacity,
    ),
    peoplePresent,
    present,
    remainingCapacity: Math.max(
      capacity - active.reduce((sum, row) => sum + registrationPeople(row), 0),
      0,
    ),
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
  if (event.serverData)
    return event.serverData.slots
      .filter((slot) => slot.day === dayID)
      .reduce((sum, slot) => sum + slot.reservedPeople, 0)
  return event.registrations
    .filter((row) => row.status !== 'cancelled' && row.day === dayID)
    .reduce((sum, row) => sum + registrationPeople(row), 0)
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
    const endTime = end && end.getTime() !== start.getTime() ? formatTime(end) : null

    return endTime ? `${dateLabel}, ${startTime} – ${endTime}` : `${dateLabel}, ${startTime}`
  }

  return `${formatDateAndTime(start)} – ${formatDateAndTime(end)}`
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

function formatDateAndTime(value: Date) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
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
    year: 'numeric',
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

function formatParticipantContact(registration: Pick<ManagedRegistration, 'email' | 'phone'>) {
  return (
    [registration.email, registration.phone].filter(Boolean).join(' · ') || 'Fără date de contact'
  )
}

function extractEventRegistrationID(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const queryID =
      url.searchParams.get('registrationId') ||
      url.searchParams.get('registration') ||
      url.searchParams.get('id')

    if (queryID) return queryID

    const lastSegment = url.pathname.split('/').filter(Boolean).at(-1)

    return lastSegment || trimmed
  } catch {
    const queryMatch = trimmed.match(/[?&](?:registrationId|registration|id)=([^&]+)/)

    return queryMatch?.[1] ? decodeURIComponent(queryMatch[1]) : trimmed
  }
}

function formatMemberRole(role: User['role']) {
  return memberRoleLabels[role] ?? role
}

function downloadParticipantTemplate(event: ManagedEvent) {
  const rows = [
    ['name', 'email', 'phone', 'day', 'slot', 'donation', 'ageGroup', 'questions'],
    [
      'Ana Popescu',
      'ana@example.com',
      '0712345678',
      '',
      '',
      '',
      '',
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

function exportReport(event: ManagedEvent) {
  if (event.remote) {
    const anchor = document.createElement('a')
    anchor.href = `/members/projects/data?eventId=${encodeURIComponent(event.id)}&export=1`
    anchor.click()
    return
  }
  const header = [
    'Nume',
    'Email',
    'Telefon',
    'Zi',
    'Tură',
    'Status',
    'Donație RON',
    'Categorie de vârstă',
    'Consumație RON',
    'Total încasat RON',
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
      formatAgeGroup(registration.ageGroup),
      registration.consumptionAmount ?? '',
      registration.consumptionAmount == null
        ? ''
        : getRegistrationPaymentTotal(event, registration),
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
