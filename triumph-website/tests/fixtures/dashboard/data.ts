import type { DashboardShellProps } from '@/app/(frontend)/members/_components/DashboardShell'
import type { DashboardData } from '@/app/(frontend)/members/(dashboard)/data'

export type Scenario = 'populated' | 'empty' | 'long' | 'failure' | 'announcement' | 'member'
export const scenarios: Scenario[] = [
  'populated',
  'empty',
  'long',
  'failure',
  'announcement',
  'member',
]
export function fixtureShell(scenario: Scenario = 'populated'): DashboardShellProps {
  const regular = scenario === 'member'
  return {
    member: {
      id: 'fixture-member',
      name: 'Alexandra Popescu',
      email: 'alexandra@example.com',
      role: regular ? 'active' : 'president',
      clubMail: regular ? null : 'alexandra@interact.example',
    },
    capabilities: { projects: !regular, commissions: !regular, board: !regular },
    dashboard: {
      id: 'fixture-dashboard',
      dashboardTitle: 'Dashboard Membrii',
      announcement: {
        enabled: scenario === 'announcement',
        title: 'Anunț pentru membri',
        message: 'Următoarea activitate a clubului este programată pentru acest weekend.',
      },
    },
    hasWebmail: !regular,
    now: new Date('2026-10-18T12:00:00Z'),
  }
}
export function fixtureValues(scenario: Scenario = 'populated'): {
  [Key in keyof DashboardData]: Awaited<DashboardData[Key]>
} {
  const empty = scenario === 'empty'
  const board = fixtureShell(scenario).capabilities.board
  const meeting = {
    id: 'fixture-meeting',
    meetingDate: '2026-10-19T15:00:00Z',
    durationMinutes: 60,
    endedBufferMinutes: 60,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  }
  return {
    avatar: scenario === 'failure' || empty ? null : '/avatar.svg',
    attendance: {
      absencePercentage: 0,
      absentMeetings: 0,
      attendancePercentage: 83,
      lateMeetings: 0,
      motivatedMeetings: 1,
      presentMeetings: 5,
      totalMeetings: 6,
      records: empty ? [] : [{ meeting, status: 'present' }],
    },
    dues: {
      coveredCount: board ? 0 : 3,
      overdueCount: board ? 0 : 2,
      totalOwed: board ? 0 : 105,
      paidCount: board ? 0 : 2,
      totalPaid: board ? 0 : 42,
      waivedCount: board ? 0 : 1,
      dues:
        empty || board
          ? []
          : [
              {
                month: new Date('2026-09-01T00:00:00Z'),
                amountDue: 21,
                isCurrentMonth: false,
                paid: false,
                waived: false,
              },
            ],
    },
    meeting: empty
      ? null
      : {
          id: meeting.id,
          description:
            scenario === 'long'
              ? 'O descriere lungă a întâlnirii, cu informații despre activitățile clubului. '.repeat(
                  12,
                )
              : 'Planificăm împreună următorul proiect al clubului.',
          status: scenario === 'long' ? 'ongoing' : 'upcoming',
          attendanceStatus: 'present',
          motivationStatus: undefined,
          dateLabel: 'duminică, 18 octombrie 2026 la 18:00',
          relativeLabel: scenario === 'long' ? 'În desfășurare' : 'Mâine',
          timingLabel: scenario === 'long' ? 'Check-in disponibil până la 21:00' : 'Durată: 60 min',
        },
    inbox:
      scenario === 'failure'
        ? { kind: 'unavailable', count: 0, messages: [] }
        : {
            kind: 'ready',
            count: empty ? 0 : 12,
            messages: empty
              ? []
              : [1, 2, 3].map((uid) => ({
                  uid,
                  subject: `Mesajul ${uid} despre activitățile clubului`,
                  from: 'Echipa Interact',
                  date: '2026-10-18T09:00:00Z',
                })),
          },
  }
}
export function deferredData(scenario: Scenario) {
  const values = fixtureValues(scenario)
  const resolvers = {} as Record<keyof DashboardData, () => void>
  function defer<Key extends keyof DashboardData>(key: Key): DashboardData[Key] {
    return new Promise((resolve) => {
      resolvers[key] = () => resolve(values[key])
    }) as DashboardData[Key]
  }
  const data: DashboardData = {
    avatar: defer('avatar'),
    attendance: defer('attendance'),
    dues: defer('dues'),
    meeting: defer('meeting'),
    inbox: defer('inbox'),
  }
  return {
    data,
    resolve(key: keyof DashboardData | 'all') {
      if (key === 'all') Object.values(resolvers).forEach((resolve) => resolve())
      else resolvers[key]()
    },
  }
}
