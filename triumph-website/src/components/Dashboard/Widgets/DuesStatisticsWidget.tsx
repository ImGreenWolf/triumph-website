import type { WidgetServerProps } from 'payload'

import { getAllMembersDuesSummary } from '@/utilities/memberDues'

import { BreakdownList, ProgressBar, StatGrid, StatItem, WidgetCard } from './shared'
import { formatCurrency, formatNumber, percentage } from './widgetUtils'

export default async function DuesStatisticsWidget({ req }: WidgetServerProps) {
  const summary = await getAllMembersDuesSummary(req.payload)
  const totalExpected = summary.totalCoveredCount + summary.totalOverdueCount
  const coveredRate = percentage(summary.totalCoveredCount, totalExpected)

  return (
    <WidgetCard
      actionHref="/admin/collections/payments"
      actionLabel="Payments"
      eyebrow="Treasury"
      title="Dues Statistics"
    >
      <StatGrid>
        <StatItem label="Paid amount" value={formatCurrency(summary.totalPaid)} />
        <StatItem
          label="Outstanding"
          tone={summary.totalOwed > 0 ? 'danger' : undefined}
          value={formatCurrency(summary.totalOwed)}
        />
        <StatItem label="Paid dues" value={formatNumber(summary.totalPaidCount)} />
        <StatItem
          label="Overdue dues"
          tone="warning"
          value={formatNumber(summary.totalOverdueCount)}
        />
      </StatGrid>
      <ProgressBar
        label="Covered dues"
        value={coveredRate}
        tone={coveredRate < 70 ? 'warning' : 'success'}
      />
      <BreakdownList
        items={[
          { label: 'Paid', tone: 'success', value: summary.totalPaidCount },
          { label: 'Waived', value: summary.totalWaivedCount },
          { label: 'Overdue', tone: 'danger', value: summary.totalOverdueCount },
        ]}
      />
    </WidgetCard>
  )
}
