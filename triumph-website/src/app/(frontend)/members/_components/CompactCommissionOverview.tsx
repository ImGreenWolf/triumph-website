import type { ReactNode } from 'react'

type CompactCommissionUser = {
  email?: string | null
  id: string
  name: string
  role?: string | null
}

export type CompactCommission = {
  commissionNumber?: number
  coordinators: CompactCommissionUser[]
  id: string
  label: string
  recruitmentReviews: {
    confirmedAt: string
    coordinatorId: string
  }[]
}

export type CompactCommissionApplication = {
  commissionId: string
  id: string
  interviewDate: string | null
  status: string
}

type CommissionRow = {
  acceptedCandidates: number
  assignedCandidates: number
  balance: number
  commission: CompactCommission
  completedCoordinatorReviews: number
  pendingFinalDecision: number
  rejectedCandidates: number
  reviewCompleted: boolean
  scheduledInterviews: number
  target: number
  unscheduledInterviews: number
}

const interviewDistributionStatuses = new Set([
  'coordonator-review',
  'interview',
  'interviewed',
  'absent',
  'interview-passed',
  'interview-rejected',
])

export function CompactCommissionOverview(props: {
  applications: CompactCommissionApplication[]
  commissions: CompactCommission[]
  description?: string
  title?: string
}) {
  const { applications, commissions } = props
  const distribution = getCommissionDistribution(applications, commissions)

  return (
    <section className="pm-dashboard-card rounded-2xl border border-[#dfe5ec] bg-white p-4 text-[#152039] shadow-[0_8px_30px_rgba(22,34,57,0.04)] sm:p-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-bold">{props.title || 'Overview comisii'}</h2>
          <p className="mt-1 text-sm opacity-60">
            {props.description || 'Rezumat compact pe fiecare comisie, fara statistici duplicate.'}
          </p>
        </div>
        <div className="w-fit rounded-lg bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#536071] ring-1 ring-[#e4e8ef]">
          {distribution.totalCandidates} candidati / {commissions.length || 0} comisii = target{' '}
          {formatTargetCount(distribution.targetPerCommission)}
        </div>
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-xl border border-[#e4e8ef] lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-[#f8fafc] text-[11px] font-black uppercase tracking-[0.08em] text-[#748094]">
            <tr>
              <th className="w-[18%] px-3 py-3">Comisie</th>
              <th className="w-[24%] px-3 py-3">Echipa</th>
              <th className="w-[13%] px-3 py-3">Trimisi / target</th>
              <th className="w-[13%] px-3 py-3">Programare</th>
              <th className="w-[11%] px-3 py-3">Decizii</th>
              <th className="w-[12%] px-3 py-3">Final</th>
              <th className="w-[9%] px-3 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f4]">
            {distribution.rows.map((row) => (
              <tr className="align-top" key={row.commission.id}>
                <td className="px-3 py-3">
                  <p className="truncate font-black">{row.commission.label}</p>
                </td>
                <td className="px-3 py-3">
                  <TeamSummary commission={row.commission} />
                </td>
                <td className="px-3 py-3">
                  <LoadSummary row={row} />
                </td>
                <td className="px-3 py-3">
                  <PairStat
                    primary={`${row.scheduledInterviews} programati`}
                    secondary={`${row.unscheduledInterviews} neprogramati`}
                    tone={row.unscheduledInterviews > 0 ? 'warning' : 'neutral'}
                  />
                </td>
                <td className="px-3 py-3">
                  <SingleStat
                    label="ramase"
                    tone={row.pendingFinalDecision > 0 ? 'warning' : 'neutral'}
                    value={String(row.pendingFinalDecision)}
                  />
                </td>
                <td className="px-3 py-3">
                  <PairStat
                    primary={`${row.acceptedCandidates} acceptati`}
                    secondary={`${row.rejectedCandidates} respinsi`}
                  />
                </td>
                <td className="px-3 py-3">
                  <ReviewBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {distribution.rows.length === 0 && <InlineEmpty text="Nu exista comisii active." />}
      </div>

      <div className="mt-5 grid gap-3 lg:hidden">
        {distribution.rows.map((row) => (
          <MobileCommissionCard key={row.commission.id} row={row} />
        ))}
        {distribution.rows.length === 0 && <InlineEmpty text="Nu exista comisii active." />}
      </div>
    </section>
  )
}

function MobileCommissionCard({ row }: { row: CommissionRow }) {
  return (
    <article className="rounded-xl border border-[#e4e8ef] bg-[#f8fafc] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{row.commission.label}</p>
        </div>
        <ReviewBadge row={row} />
      </div>

      <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-[#edf0f4]">
        <LoadSummary row={row} />
      </div>

      <div className="mt-3 grid gap-2">
        <MobileInfoRow label="Echipa">
          <TeamSummary commission={row.commission} />
        </MobileInfoRow>
        <MobileInfoRow label="Programare">
          <PairStat
            primary={`${row.scheduledInterviews} programati`}
            secondary={`${row.unscheduledInterviews} neprogramati`}
            tone={row.unscheduledInterviews > 0 ? 'warning' : 'neutral'}
          />
        </MobileInfoRow>
        <MobileInfoRow label="Decizii">
          <SingleStat
            label="ramase"
            tone={row.pendingFinalDecision > 0 ? 'warning' : 'neutral'}
            value={String(row.pendingFinalDecision)}
          />
        </MobileInfoRow>
        <MobileInfoRow label="Final">
          <PairStat
            primary={`${row.acceptedCandidates} acceptati`}
            secondary={`${row.rejectedCandidates} respinsi`}
          />
        </MobileInfoRow>
      </div>
    </article>
  )
}

function TeamSummary({ commission }: { commission: CompactCommission }) {
  return (
    <div className="grid gap-2">
      <MemberLine
        label={`Coordonatori (${commission.coordinators.length})`}
        members={commission.coordinators}
      />
    </div>
  )
}

function MemberLine(props: { label: string; members: CompactCommissionUser[] }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#748094]">
        {props.label}
      </p>
      <div className="flex flex-wrap gap-1">
        {props.members.slice(0, 3).map((member) => (
          <span
            className="max-w-[11rem] truncate rounded-full bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#536071] ring-1 ring-[#edf0f4]"
            key={member.id}
            title={member.name}
          >
            {member.name}
          </span>
        ))}
        {props.members.length > 3 && (
          <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold text-[#536071] ring-1 ring-[#edf0f4]">
            +{props.members.length - 3}
          </span>
        )}
        {props.members.length === 0 && (
          <span className="text-xs font-semibold text-[#8a94a6]">Nimeni</span>
        )}
      </div>
    </div>
  )
}

function LoadSummary({ row }: { row: CommissionRow }) {
  const hasDifference = Math.abs(row.balance) >= 0.05

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-base font-black">
          {row.assignedCandidates}/{formatTargetCount(row.target)}
        </span>
        {hasDifference && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              row.balance > 0
                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
            }`}
          >
            {formatSignedCount(row.balance)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-semibold text-[#748094]">trimisi vs target</p>
    </div>
  )
}

function PairStat(props: { primary: string; secondary: string; tone?: 'neutral' | 'warning' }) {
  return (
    <div className={props.tone === 'warning' ? 'text-amber-700' : 'text-[#152039]'}>
      <p className="font-bold">{props.primary}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{props.secondary}</p>
    </div>
  )
}

function SingleStat(props: { label: string; tone?: 'neutral' | 'warning'; value: string }) {
  return (
    <div className={props.tone === 'warning' ? 'text-amber-700' : 'text-[#152039]'}>
      <p className="text-base font-black">{props.value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{props.label}</p>
    </div>
  )
}

function MobileInfoRow(props: { children: ReactNode; label: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#edf0f4]">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#748094]">
        {props.label}
      </p>
      {props.children}
    </div>
  )
}

function ReviewBadge({ row }: { row: CommissionRow }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset ${
        row.reviewCompleted
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-amber-50 text-amber-700 ring-amber-100'
      }`}
    >
      Review {row.completedCoordinatorReviews}/{row.commission.coordinators.length}
    </span>
  )
}

function InlineEmpty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm font-medium opacity-60">{text}</div>
}

function getCommissionDistribution(
  applications: CompactCommissionApplication[],
  commissions: CompactCommission[],
) {
  const candidates = applications.filter((application) =>
    interviewDistributionStatuses.has(application.status),
  )
  const targetPerCommission = commissions.length > 0 ? candidates.length / commissions.length : 0

  return {
    rows: commissions.map((commission): CommissionRow => {
      const commissionCandidates = candidates.filter(
        (application) => application.commissionId === commission.id,
      )
      const assignedCandidates = commissionCandidates.length
      const acceptedCandidates = applications.filter(
        (application) =>
          application.commissionId === commission.id && application.status === 'interview-passed',
      ).length
      const rejectedCandidates = applications.filter(
        (application) =>
          application.commissionId === commission.id && application.status === 'interview-rejected',
      ).length
      const pendingFinalDecision = applications.filter(
        (application) =>
          application.commissionId === commission.id &&
          ['interview', 'interviewed'].includes(application.status),
      ).length
      const scheduledInterviews = commissionCandidates.filter((application) =>
        Boolean(application.interviewDate),
      ).length
      const unscheduledInterviews = commissionCandidates.filter(
        (application) => application.status === 'interview' && !application.interviewDate,
      ).length
      const completedCoordinatorReviews = commission.recruitmentReviews.length

      return {
        acceptedCandidates,
        assignedCandidates,
        balance: assignedCandidates - targetPerCommission,
        commission,
        completedCoordinatorReviews,
        pendingFinalDecision,
        rejectedCandidates,
        reviewCompleted:
          commission.coordinators.length > 0 &&
          completedCoordinatorReviews >= commission.coordinators.length,
        scheduledInterviews,
        target: targetPerCommission,
        unscheduledInterviews,
      }
    }),
    targetPerCommission,
    totalCandidates: candidates.length,
  }
}

function formatTargetCount(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function formatSignedCount(value: number) {
  const formatted = formatTargetCount(Math.abs(value))
  return value > 0 ? `+${formatted}` : `-${formatted}`
}
