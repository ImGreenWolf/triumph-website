'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { DatePicker, usePayloadAPI } from '@payloadcms/ui'

import type { Attendance, Meeting, User } from '@/payload-types'
import './index.scss'

type AttendanceWithRelations = Omit<Attendance, 'member' | 'meeting'> & {
  member: User | string
  meeting: Meeting | string
}

type AttendanceListResponse = {
  docs?: AttendanceWithRelations[]
}

type StatusCounts = {
  absent: number
  late: number
  motivated: number
  present: number
  total: number
}

type SummaryStats = StatusCounts & {
  attendanceRate: number
}

type MeetingRow = SummaryStats & {
  id: string
  label: string
  meetingDate: string | null
}

type MemberRow = SummaryStats & {
  email?: string | null
  id: string
  name: string
}

type LineChartPoint = {
  detail?: string
  label: string
  status?: Attendance['status']
  value: number
}

type CompactCard = {
  helper: string
  label: string
  tone?: string
  value: string
}

type SortOption = 'attendance' | 'latest' | 'name' | 'records'
type TabKey = 'graphs' | 'overview'
type PanelKey = 'memberGraphPicker' | 'meetings' | 'members'

const statusCards: Attendance['status'][] = ['present', 'late', 'motivated', 'absent']

const labelByStatus: Record<Attendance['status'], string> = {
  absent: 'Absent',
  late: 'Întârziat',
  motivated: 'Motivat',
  present: 'Prezent',
}

const accentByStatus: Record<Attendance['status'], string> = {
  absent: '#dc2626',
  late: '#2563eb',
  motivated: '#d97706',
  present: '#16a34a',
}

const tabOptions: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Prezentare generală' },
  { key: 'graphs', label: 'Grafice' },
]

const createEmptySummary = (): SummaryStats => ({
  absent: 0,
  attendanceRate: 0,
  late: 0,
  motivated: 0,
  present: 0,
  total: 0,
})

const finalizeSummary = (summary: StatusCounts): SummaryStats => {
  const attended = summary.present + summary.late

  return {
    ...summary,
    attendanceRate: summary.total ? (attended / summary.total) * 100 : 0,
  }
}

const isMeeting = (value: AttendanceWithRelations['meeting']): value is Meeting =>
  typeof value === 'object' && value !== null

const isMember = (value: AttendanceWithRelations['member']): value is User =>
  typeof value === 'object' && value !== null

const formatPercent = (value: number) => `${Math.round(value)}%`

const formatShare = (value: number, total: number) => {
  if (!total) return '0%'

  return `${Math.round((value / total) * 100)}%`
}

const formatMeetingDate = (meetingDate: string | null) => {
  if (!meetingDate) return 'Data întâlnirii este necunoscută'

  const parsed = new Date(meetingDate)

  if (Number.isNaN(parsed.getTime())) return 'Data întâlnirii este necunoscută'

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

const getLocalDateKey = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getStoredDateKey = (value: string | null) => {
  if (!value) return ''

  const directKey = value.slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(directKey)) {
    return directKey
  }

  return getLocalDateKey(value)
}

const getRotaryYearStart = (date: Date) => {
  const month = date.getMonth()
  const year = date.getFullYear()

  return month >= 6 ? year : year - 1
}

const formatRotaryYearLabel = (startYear: number) => `Anul Rotary ${startYear}-${startYear + 1}`

const getMeetingRotaryYear = (record: AttendanceWithRelations) => {
  if (!isMeeting(record.meeting)) return null

  const parsed = new Date(record.meeting.meetingDate)

  if (Number.isNaN(parsed.getTime())) return null

  return getRotaryYearStart(parsed)
}

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize

  return {
    page: safePage,
    totalPages,
    items: items.slice(startIndex, startIndex + pageSize),
  }
}

const getMeetingTime = (meetingDate: string | null) => {
  if (!meetingDate) return 0

  const parsed = new Date(meetingDate)

  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

const getLineChartGeometry = ({
  height,
  points,
  width,
}: {
  height: number
  points: LineChartPoint[]
  width: number
}) => {
  const padding = {
    bottom: 34,
    left: 14,
    right: 28,
    top: 16,
  }
  const plotHeight = height - padding.top - padding.bottom
  const plotWidth = width - padding.left - padding.right

  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (points.length - 1)) * plotWidth
    const value = Math.max(0, Math.min(100, point.value))
    const y = padding.top + plotHeight - (value / 100) * plotHeight

    return {
      ...point,
      x,
      y,
    }
  })

  const path = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return {
    chartPoints,
    padding,
    path,
    plotHeight,
    plotWidth,
  }
}

export default function AttendanceBeforeList() {
  const [{ data, isError, isLoading }] = usePayloadAPI('/api/attendance', {
    initialParams: {
      depth: 1,
      limit: 1000,
      sort: '-createdAt',
      where: {},
    },
  })

  const docs = useMemo(
    () => ((data as AttendanceListResponse | undefined)?.docs ?? []) as AttendanceWithRelations[],
    [data],
  )

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedRotaryYear, setSelectedRotaryYear] = useState<number | 'all'>('all')
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    meetings: true,
    members: false,
    memberGraphPicker: true,
  })
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<Date | undefined>(undefined)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')
  const [memberSearch, setMemberSearch] = useState('')
  const [meetingSort, setMeetingSort] = useState<SortOption>('latest')
  const [memberSort, setMemberSort] = useState<SortOption>('attendance')
  const [meetingPage, setMeetingPage] = useState(1)
  const [memberPage, setMemberPage] = useState(1)
  const [selectedGraphMemberId, setSelectedGraphMemberId] = useState<string>('')

  const rotaryYears = useMemo(() => {
    const years = new Set<number>()

    for (const record of docs) {
      const rotaryYear = getMeetingRotaryYear(record)

      if (rotaryYear !== null) years.add(rotaryYear)
    }

    return [...years].sort((left, right) => right - left)
  }, [docs])

  const filteredDocs = useMemo(() => {
    if (selectedRotaryYear === 'all') return docs

    return docs.filter((record) => getMeetingRotaryYear(record) === selectedRotaryYear)
  }, [docs, selectedRotaryYear])

  const yearStats = useMemo(() => {
    const summary = createEmptySummary()

    for (const record of filteredDocs) {
      summary.total += 1
      summary[record.status] += 1
    }

    return finalizeSummary(summary)
  }, [filteredDocs])

  const meetingRows = useMemo<MeetingRow[]>(() => {
    const byMeeting = new Map<string, MeetingRow>()

    for (const record of filteredDocs) {
      const meetingId = isMeeting(record.meeting) ? record.meeting.id : record.meeting

      if (!meetingId) continue

      const meetingDate = isMeeting(record.meeting) ? record.meeting.meetingDate : null
      const existing = byMeeting.get(meetingId)

      if (existing) {
        existing.total += 1
        existing[record.status] += 1
        continue
      }

      byMeeting.set(meetingId, {
        absent: record.status === 'absent' ? 1 : 0,
        attendanceRate: 0,
        id: meetingId,
        label: formatMeetingDate(meetingDate),
        late: record.status === 'late' ? 1 : 0,
        meetingDate,
        motivated: record.status === 'motivated' ? 1 : 0,
        present: record.status === 'present' ? 1 : 0,
        total: 1,
      })
    }

    return [...byMeeting.values()].map((row) => ({
      ...row,
      ...finalizeSummary(row),
    }))
  }, [filteredDocs])

  const meetingDateMap = useMemo(() => {
    const dates = new Map<string, MeetingRow[]>()

    for (const meeting of meetingRows) {
      if (!meeting.meetingDate) continue

      const key = getStoredDateKey(meeting.meetingDate)
      const list = dates.get(key) || []
      list.push(meeting)
      dates.set(key, list)
    }

    return dates
  }, [meetingRows])

  const memberRows = useMemo<MemberRow[]>(() => {
    const byMember = new Map<string, MemberRow>()

    for (const record of filteredDocs) {
      const memberId = isMember(record.member) ? record.member.id : record.member

      if (!memberId) continue

      const existing = byMember.get(memberId)

      if (existing) {
        existing.total += 1
        existing[record.status] += 1
        continue
      }

      byMember.set(memberId, {
        absent: record.status === 'absent' ? 1 : 0,
        attendanceRate: 0,
        email: isMember(record.member) ? record.member.email : undefined,
        id: memberId,
        late: record.status === 'late' ? 1 : 0,
        motivated: record.status === 'motivated' ? 1 : 0,
        name: isMember(record.member)
          ? record.member.name || record.member.email
          : `Membru ${memberId}`,
        present: record.status === 'present' ? 1 : 0,
        total: 1,
      })
    }

    return [...byMember.values()].map((row) => ({
      ...row,
      ...finalizeSummary(row),
    }))
  }, [filteredDocs])

  const sortedMeetings = useMemo(() => {
    const selectedDateKey = selectedMeetingDate ? getLocalDateKey(selectedMeetingDate) : null

    const filtered = meetingRows.filter((meeting) => {
      if (!selectedDateKey) return true
      if (!meeting.meetingDate) return false
      if (getStoredDateKey(meeting.meetingDate) !== selectedDateKey) return false
      if (selectedMeetingId && meeting.id !== selectedMeetingId) return false

      return true
    })

    return filtered.sort((left, right) => {
      switch (meetingSort) {
        case 'attendance':
          return right.attendanceRate - left.attendanceRate
        case 'records':
          return right.total - left.total
        case 'latest':
        default:
          return (
            new Date(right.meetingDate || 0).getTime() - new Date(left.meetingDate || 0).getTime()
          )
      }
    })
  }, [meetingRows, meetingSort, selectedMeetingDate, selectedMeetingId])

  const sortedMembers = useMemo(() => {
    const normalized = memberSearch.trim().toLowerCase()
    const filtered = memberRows.filter((member) => {
      return (
        member.name.toLowerCase().includes(normalized) ||
        member.email?.toLowerCase().includes(normalized)
      )
    })

    return filtered.sort((left, right) => {
      switch (memberSort) {
        case 'name':
          return left.name.localeCompare(right.name)
        case 'records':
          return right.total - left.total
        case 'attendance':
        default:
          return right.attendanceRate - left.attendanceRate
      }
    })
  }, [memberRows, memberSearch, memberSort])

  useEffect(() => {
    if (!sortedMembers.length) {
      setSelectedGraphMemberId('')
      return
    }

    const hasSelectedMember = sortedMembers.some((member) => member.id === selectedGraphMemberId)

    if (!hasSelectedMember) {
      setSelectedGraphMemberId(sortedMembers[0]?.id || '')
    }
  }, [selectedGraphMemberId, sortedMembers])

  useEffect(() => {
    if (!selectedMeetingDate) {
      setSelectedMeetingId('')
      return
    }

    const selectedDateKey = getLocalDateKey(selectedMeetingDate)
    const meetingsOnDate = meetingDateMap.get(selectedDateKey) || []

    if (!meetingsOnDate.length) {
      setSelectedMeetingId('')
      return
    }

    const stillValid = meetingsOnDate.some((meeting) => meeting.id === selectedMeetingId)
    if (!stillValid) {
      setSelectedMeetingId(meetingsOnDate[0]?.id || '')
    }
  }, [meetingDateMap, selectedMeetingDate, selectedMeetingId])

  const paginatedMeetings = useMemo(
    () => paginate(sortedMeetings, meetingPage, 6),
    [sortedMeetings, meetingPage],
  )
  const paginatedMembers = useMemo(
    () => paginate(sortedMembers, memberPage, 6),
    [sortedMembers, memberPage],
  )

  const compactCards: CompactCard[] = [
    {
      helper: 'Înregistrări în intervalul selectat',
      label: 'Înregistrări',
      value: String(yearStats.total),
    },
    {
      helper: 'Prezent + întârziat',
      label: 'Prezență',
      value: formatPercent(yearStats.attendanceRate),
    },
    ...statusCards.map((status) => ({
      helper: `${formatShare(yearStats[status], yearStats.total)} din înregistrări`,
      label: labelByStatus[status],
      value: String(yearStats[status]),
      tone: accentByStatus[status],
    })),
  ]

  const selectedYearLabel =
    selectedRotaryYear === 'all' ? 'Toți anii Rotary' : formatRotaryYearLabel(selectedRotaryYear)
  const selectedDateMeetings = selectedMeetingDate
    ? meetingDateMap.get(getLocalDateKey(selectedMeetingDate)) || []
    : []
  const topMember = sortedMembers[0]
  const averageMemberAttendance = memberRows.length
    ? memberRows.reduce((sum, member) => sum + member.attendanceRate, 0) / memberRows.length
    : 0
  const selectedGraphMember =
    sortedMembers.find((member) => member.id === selectedGraphMemberId) || null

  const rotaryYearTrend = useMemo<LineChartPoint[]>(() => {
    const meetings = [...meetingRows].sort(
      (left, right) => getMeetingTime(left.meetingDate) - getMeetingTime(right.meetingDate),
    )

    let cumulativeAttendance = 0

    return meetings.map((meeting, index) => {
      cumulativeAttendance += meeting.attendanceRate

      return {
        detail: `${formatPercent(meeting.attendanceRate)} prezență la întâlnire`,
        label: meeting.label,
        value: cumulativeAttendance / (index + 1),
      }
    })
  }, [meetingRows])

  const memberTrend = useMemo<LineChartPoint[]>(() => {
    if (!selectedGraphMemberId) return []

    const memberRecords = filteredDocs
      .filter((record) => {
        const memberId = isMember(record.member) ? record.member.id : record.member
        return memberId === selectedGraphMemberId && isMeeting(record.meeting)
      })
      .sort((left, right) => {
        const leftMeeting = isMeeting(left.meeting) ? left.meeting : null
        const rightMeeting = isMeeting(right.meeting) ? right.meeting : null

        return (
          getMeetingTime(leftMeeting?.meetingDate || null) -
          getMeetingTime(rightMeeting?.meetingDate || null)
        )
      })

    let attended = 0
    let total = 0

    return memberRecords.map((record) => {
      const meeting = isMeeting(record.meeting) ? record.meeting : null

      total += 1

      if (record.status === 'present' || record.status === 'late') {
        attended += 1
      }

      return {
        detail: labelByStatus[record.status],
        label: formatMeetingDate(meeting?.meetingDate || null),
        status: record.status,
        value: (attended / total) * 100,
      }
    })
  }, [filteredDocs, selectedGraphMemberId])

  const latestMemberPoint = memberTrend[memberTrend.length - 1]

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  return (
    <div className="attendance-before-list">
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Prezentare generală a prezenței</h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--theme-text-dim)' }}>
          Analiza prezenței pe ani Rotary, cu detalii care pot fi căutate și grafice de evoluție.
        </p>
      </div>

      {isLoading ? (
        <p style={{ margin: 0 }}>Se încarcă statisticile de prezență…</p>
      ) : isError ? (
        <p style={{ margin: 0, color: 'var(--theme-error-500)' }}>
          Statisticile de prezență nu au putut fi încărcate.
        </p>
      ) : yearStats.total === 0 ? (
        <p style={{ margin: 0 }}>
          Nu există încă înregistrări de prezență. Adăugați înregistrări pentru a urmări evoluția
          clubului.
        </p>
      ) : (
        <>
          <div className="attendance-before-list__tabs">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`attendance-before-list__tab${
                  activeTab === tab.key ? ' attendance-before-list__tab--active' : ''
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="attendance-before-list__toolbar">
            <div>
              <label
                htmlFor="rotary-year-select"
                style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}
              >
                An Rotary
              </label>
              <select
                id="rotary-year-select"
                className="attendance-before-list__select"
                value={String(selectedRotaryYear)}
                onChange={(event) => {
                  const value = event.target.value
                  setSelectedRotaryYear(value === 'all' ? 'all' : Number(value))
                  setMeetingPage(1)
                  setMemberPage(1)
                }}
              >
                <option value="all">Toți anii</option>
                {rotaryYears.map((year) => (
                  <option key={year} value={year}>
                    {formatRotaryYearLabel(year)}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'end',
                color: 'var(--theme-text-dim)',
                fontSize: '0.9rem',
                minHeight: '100%',
              }}
            >
              {selectedYearLabel} · Anii Rotary sunt cuprinși între 1 iulie și 30 iunie
            </div>
          </div>

          {activeTab === 'overview' ? (
            <>
              <div className="attendance-before-list__cards">
                {compactCards.map((card) => (
                  <div
                    key={card.label}
                    className="attendance-before-list__card"
                    style={card.tone ? { borderLeft: `4px solid ${card.tone}` } : undefined}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {card.label}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--theme-text-dim)' }}>
                      {card.helper}
                    </div>
                  </div>
                ))}
              </div>

              {/* <DropdownPanel
                isOpen={openPanels.meetings}
                title="Prezența la întâlniri"
                subtitle={`${sortedMeetings.length} întâlniri găsite`}
                onToggle={() => togglePanel('meetings')}
              >
                <div className="attendance-before-list__controls">
                  <div>
                    <label htmlFor="meeting-calendar" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Calendarul întâlnirilor
                    </label>
                    <div className="attendance-before-list__calendarWrap">
                      <DatePicker
                        id="meeting-calendar"
                        onChange={(value) => {
                          setSelectedMeetingDate(value)
                          setMeetingPage(1)
                        }}
                        pickerAppearance="dayOnly"
                        value={selectedMeetingDate}
                        placeholder="Alegeți data unei întâlniri"
                        overrides={{
                          dayClassName: (date: Date) => {
                            const key = getLocalDateKey(date)
                            return meetingDateMap.has(key) ? 'react-datepicker__day--has-meeting' : ''
                          },
                        }}
                      />
                    </div>
                    <div className="attendance-before-list__hint">
                      Datele cu întâlniri sunt marcate. Alegeți o dată, apoi selectați mai jos cercul unei întâlniri.
                    </div>
                  </div>
                  <div>
                    <label htmlFor="meeting-sort" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Sortați întâlnirile
                    </label>
                    <select
                      id="meeting-sort"
                      className="attendance-before-list__select"
                      value={meetingSort}
                      onChange={(event) => {
                        setMeetingSort(event.target.value as SortOption)
                        setMeetingPage(1)
                      }}
                    >
                      <option value="latest">Cele mai recente mai întâi</option>
                      <option value="attendance">Rata de prezență</option>
                      <option value="records">Cele mai multe înregistrări</option>
                    </select>
                    {selectedMeetingDate && selectedDateMeetings.length > 1 ? (
                      <>
                        <div className="attendance-before-list__meetingChips">
                          {selectedDateMeetings.map((meeting, index) => (
                            <button
                              key={meeting.id}
                              type="button"
                              className={`attendance-before-list__meetingChip${
                                meeting.id === selectedMeetingId
                                  ? ' attendance-before-list__meetingChip--active'
                                  : ''
                              }`}
                              onClick={() => {
                                setSelectedMeetingId(meeting.id)
                                setMeetingPage(1)
                              }}
                              title={meeting.label}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                        <div className="attendance-before-list__hint">
                          {selectedMeetingId
                            ? 'Este afișată întâlnirea selectată.'
                            : 'Selectați cercul unei întâlniri pentru a afișa o anumită întâlnire.'}
                        </div>
                      </>
                    ) : selectedMeetingDate ? (
                      <div className="attendance-before-list__hint">
                        La această dată există o singură întâlnire, așa că este selectată automat.
                      </div>
                    ) : (
                      <div className="attendance-before-list__hint">
                        Nu este selectată nicio dată. Sunt afișate toate întâlnirile din anul Rotary.
                      </div>
                    )}
                  </div>
                </div>

                <SimpleTable
                  headers={['Întâlnire', 'Înregistrări', 'Prezență', 'Prezent', 'Absent']}
                  rows={paginatedMeetings.items.map((meeting) => [
                    meeting.label,
                    String(meeting.total),
                    formatPercent(meeting.attendanceRate),
                    `${meeting.present} + ${meeting.late} întârziați`,
                    String(meeting.absent),
                  ])}
                  emptyMessage="Nicio întâlnire nu corespunde filtrelor actuale."
                />

                <Pager
                  currentPage={paginatedMeetings.page}
                  totalPages={paginatedMeetings.totalPages}
                  onPrevious={() => setMeetingPage((page) => Math.max(1, page - 1))}
                  onNext={() => setMeetingPage((page) => Math.min(paginatedMeetings.totalPages, page + 1))}
                />
              </DropdownPanel> */}

              {/* <DropdownPanel
                isOpen={openPanels.members}
                title="Prezența membrilor"
                subtitle={`${sortedMembers.length} membri găsiți`}
                onToggle={() => togglePanel('members')}
              >
                <div className="attendance-before-list__controls">
                  <div>
                    <label htmlFor="member-search" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Căutați membri
                    </label>
                    <input
                      id="member-search"
                      className="attendance-before-list__input"
                      value={memberSearch}
                      onChange={(event) => {
                        setMemberSearch(event.target.value)
                        setMemberPage(1)
                      }}
                      placeholder="Căutați după nume sau e-mail"
                    />
                  </div>
                  <div>
                    <label htmlFor="member-sort" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Sortați membrii
                    </label>
                    <select
                      id="member-sort"
                      className="attendance-before-list__select"
                      value={memberSort}
                      onChange={(event) => {
                        setMemberSort(event.target.value as SortOption)
                        setMemberPage(1)
                      }}
                    >
                      <option value="attendance">Rata de prezență</option>
                      <option value="records">Cele mai multe înregistrări</option>
                      <option value="name">Nume A-Z</option>
                    </select>
                  </div>
                </div>

                <SimpleTable
                  headers={['Membru', 'Înregistrări', 'Prezență', 'Prezent', 'Motivat']}
                  rows={paginatedMembers.items.map((member) => [
                    member.name,
                    String(member.total),
                    formatPercent(member.attendanceRate),
                    `${member.present} + ${member.late} întârzieri`,
                    String(member.motivated),
                  ])}
                  emptyMessage="Niciun membru nu corespunde filtrelor actuale."
                />

                <Pager
                  currentPage={paginatedMembers.page}
                  totalPages={paginatedMembers.totalPages}
                  onPrevious={() => setMemberPage((page) => Math.max(1, page - 1))}
                  onNext={() => setMemberPage((page) => Math.min(paginatedMembers.totalPages, page + 1))}
                />
              </DropdownPanel> */}
            </>
          ) : (
            <div className="attendance-before-list__graphGrid">
              <GraphCard
                title="Prezența medie în anul Rotary"
                subtitle={`${rotaryYearTrend.length} întâlniri contribuie la media cumulată din ${selectedYearLabel.toLowerCase()}`}
              >
                <LineChart
                  points={rotaryYearTrend}
                  emptyMessage="Nu există date de prezență la întâlniri pentru acest an Rotary."
                  lineColor="#16a34a"
                />

                <div className="attendance-before-list__summaryStrip">
                  <div className="attendance-before-list__summaryItem">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Întâlniri monitorizate
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{meetingRows.length}</div>
                  </div>
                  <div className="attendance-before-list__summaryItem">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Media anului Rotary
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {formatPercent(yearStats.attendanceRate)}
                    </div>
                  </div>
                  <div className="attendance-before-list__summaryItem">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Cea mai recentă întâlnire
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {meetingRows[0]
                        ? `${meetingRows[0].label} · ${formatPercent(meetingRows[0].attendanceRate)}`
                        : 'Nu există date'}
                    </div>
                  </div>
                </div>
              </GraphCard>

              <GraphCard
                title="Prezența individuală a membrului"
                subtitle={
                  selectedGraphMember
                    ? `${selectedGraphMember.name} · prezență cumulată la ${memberTrend.length} întâlniri din ${selectedYearLabel.toLowerCase()}`
                    : `Alegeți un membru pentru a-i vedea prezența în ${selectedYearLabel.toLowerCase()}`
                }
              >
                <div className="attendance-before-list__graphHeader">
                  <div>
                    <label
                      htmlFor="member-graph-select"
                      style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}
                    >
                      Membru
                    </label>
                    <select
                      id="member-graph-select"
                      className="attendance-before-list__select"
                      value={selectedGraphMemberId}
                      onChange={(event) => setSelectedGraphMemberId(event.target.value)}
                    >
                      {sortedMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    style={{
                      color: 'var(--theme-text-dim)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'end',
                    }}
                  >
                    {selectedGraphMember
                      ? `${formatPercent(selectedGraphMember.attendanceRate)} prezență · ${selectedGraphMember.total} înregistrări în total`
                      : 'Niciun membru selectat'}
                  </div>
                </div>

                <LineChart
                  points={memberTrend}
                  emptyMessage="Nu există un istoric al prezenței pentru acest membru în anul Rotary selectat."
                  lineColor="#2563eb"
                />

                <div className="attendance-before-list__summaryStrip">
                  <div className="attendance-before-list__summaryItem">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Prezența membrului
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {selectedGraphMember
                        ? formatPercent(selectedGraphMember.attendanceRate)
                        : 'Nu există date'}
                    </div>
                  </div>
                  <div className="attendance-before-list__summaryItem">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--theme-text-dim)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Cel mai recent statut
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {latestMemberPoint?.detail || 'Nu există date'}
                    </div>
                  </div>
                </div>
              </GraphCard>

              <DropdownPanel
                isOpen={openPanels.memberGraphPicker}
                title="Filtrele graficului membrilor"
                subtitle={`${sortedMembers.length} membri găsiți`}
                onToggle={() => togglePanel('memberGraphPicker')}
              >
                <div className="attendance-before-list__controls">
                  <div>
                    <label
                      htmlFor="member-search-graph"
                      style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}
                    >
                      Căutați membri
                    </label>
                    <input
                      id="member-search-graph"
                      className="attendance-before-list__input"
                      value={memberSearch}
                      onChange={(event) => {
                        setMemberSearch(event.target.value)
                        setMemberPage(1)
                      }}
                      placeholder="Căutați după nume sau e-mail"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="member-sort-graph"
                      style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}
                    >
                      Sortați membrii
                    </label>
                    <select
                      id="member-sort-graph"
                      className="attendance-before-list__select"
                      value={memberSort}
                      onChange={(event) => {
                        setMemberSort(event.target.value as SortOption)
                        setMemberPage(1)
                      }}
                    >
                      <option value="attendance">Rata de prezență</option>
                      <option value="records">Cele mai multe înregistrări</option>
                      <option value="name">Nume A-Z</option>
                    </select>
                  </div>
                </div>

                <SimpleTable
                  headers={['Membru', 'Înregistrări', 'Prezență', 'Selectare']}
                  rows={paginatedMembers.items.map((member) => [
                    member.name,
                    String(member.total),
                    formatPercent(member.attendanceRate),
                    member.id === selectedGraphMemberId ? 'Selectat' : 'Vizualizare',
                  ])}
                  emptyMessage="Niciun membru nu corespunde filtrelor actuale."
                  onRowClick={(rowIndex) => {
                    const member = paginatedMembers.items[rowIndex]
                    if (member) setSelectedGraphMemberId(member.id)
                  }}
                  selectedRowIndex={paginatedMembers.items.findIndex(
                    (member) => member.id === selectedGraphMemberId,
                  )}
                />

                <Pager
                  currentPage={paginatedMembers.page}
                  totalPages={paginatedMembers.totalPages}
                  onPrevious={() => setMemberPage((page) => Math.max(1, page - 1))}
                  onNext={() =>
                    setMemberPage((page) => Math.min(paginatedMembers.totalPages, page + 1))
                  }
                />
              </DropdownPanel>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DropdownPanel({
  children,
  isOpen,
  onToggle,
  subtitle,
  title,
}: {
  children: ReactNode
  isOpen: boolean
  onToggle: () => void
  subtitle: string
  title: string
}) {
  return (
    <div className="attendance-before-list__panel">
      <button
        type="button"
        className={`attendance-before-list__panelButton${
          isOpen ? ' attendance-before-list__panelButton--open' : ''
        }`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="attendance-before-list__panelHeading">
          <span>{title}</span>
          <span style={{ color: 'var(--theme-text-dim)', fontWeight: 400 }}>{subtitle}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`attendance-before-list__panelChevron${
            isOpen ? ' attendance-before-list__panelChevron--open' : ''
          }`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen ? <div className="attendance-before-list__panelContent">{children}</div> : null}
    </div>
  )
}

function GraphCard({
  children,
  subtitle,
  title,
}: {
  children: ReactNode
  subtitle: string
  title: string
}) {
  return (
    <div className="attendance-before-list__graphCard">
      <div style={{ marginBottom: '0.75rem' }}>
        <div className="attendance-before-list__graphCardTitle">{title}</div>
        <div className="attendance-before-list__graphCardSubtitle">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function LineChart({
  emptyMessage,
  lineColor,
  points,
}: {
  emptyMessage: string
  lineColor: string
  points: LineChartPoint[]
}) {
  if (!points.length) {
    return <p style={{ margin: 0 }}>{emptyMessage}</p>
  }

  const width = 720
  const height = 260
  const { chartPoints, padding, path, plotHeight, plotWidth } = getLineChartGeometry({
    height,
    points,
    width,
  })
  const labelIndexes = new Set(
    [0, Math.floor((chartPoints.length - 1) / 2), chartPoints.length - 1].filter(
      (index) => index >= 0,
    ),
  )

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="attendance-before-list__lineChart"
        role="img"
        aria-label="Grafic liniar al prezenței"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          rx="12"
          fill="var(--theme-elevation-0)"
          stroke="var(--theme-elevation-100)"
        />
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + plotHeight - (tick / 100) * plotHeight

          return (
            <g key={tick}>
              <line
                x1={String(padding.left)}
                x2={String(width - padding.right)}
                y1={String(y)}
                y2={String(y)}
                stroke="var(--theme-elevation-150)"
                strokeDasharray={tick === 0 ? '0' : '4 4'}
              />
              <text
                x={String(width - padding.right + 6)}
                y={String(y + 4)}
                fill="var(--theme-base-0)"
                fontSize="11"
              >
                {tick}%
              </text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
        {chartPoints.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            cx={String(point.x)}
            cy={String(point.y)}
            r="4"
            fill={point.status ? accentByStatus[point.status] : lineColor}
            stroke="var(--theme-base-0)"
            strokeWidth="2"
          />
        ))}
        {chartPoints.map((point, index) =>
          labelIndexes.has(index) ? (
            <text
              key={`label-${point.label}-${index}`}
              x={String(point.x)}
              y={String(height - 10)}
              textAnchor="middle"
              fill="var(--theme-base-0)"
              fontSize="11"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}

function SimpleTable({
  emptyMessage,
  headers,
  onRowClick,
  rows,
  selectedRowIndex,
}: {
  emptyMessage: string
  headers: string[]
  onRowClick?: (rowIndex: number) => void
  rows: string[][]
  selectedRowIndex?: number
}) {
  if (!rows.length) {
    return <p style={{ margin: 0 }}>{emptyMessage}</p>
  }

  return (
    <div className="attendance-before-list__tableWrap">
      <table className="attendance-before-list__table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`${row[0]}-${rowIndex}`}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              style={
                onRowClick
                  ? {
                      cursor: 'pointer',
                      background:
                        selectedRowIndex === rowIndex ? 'var(--theme-elevation-50)' : 'transparent',
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIndex) => (
                <td key={`${headers[cellIndex]}-${cell}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pager({
  currentPage,
  onNext,
  onPrevious,
  totalPages,
}: {
  currentPage: number
  onNext: () => void
  onPrevious: () => void
  totalPages: number
}) {
  return (
    <div className="attendance-before-list__pager">
      <span style={{ color: 'var(--theme-text-dim)', fontSize: '0.85rem' }}>
        Pagina {currentPage} din {totalPages}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn--size-small btn--style-secondary"
          onClick={onPrevious}
          disabled={currentPage <= 1}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn--size-small btn--style-secondary"
          onClick={onNext}
          disabled={currentPage >= totalPages}
        >
          Următor
        </button>
      </div>
    </div>
  )
}
