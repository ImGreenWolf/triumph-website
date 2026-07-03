import type { WidgetServerProps } from 'payload'

import { getAllMembersDuesSummary } from '@/utilities/memberDues'
import { formatRotaryYearLabel, getRotaryYearStart } from '@/utilities/rotaryYear'

import { BreakdownList, ProgressBar, StatGrid, StatItem, WidgetCard } from './shared'
import { formatCurrency, formatNumber, percentage } from './widgetUtils'

export default async function DuesStatisticsWidget({ req }: WidgetServerProps) {
  const now = new Date()
  const summary = await getAllMembersDuesSummary(req.payload, now)
  const totalExpected = summary.totalCoveredCount + summary.totalOverdueCount
  const coveredRate = percentage(summary.totalCoveredCount, totalExpected)
  const rotaryYearLabel = formatRotaryYearLabel(getRotaryYearStart(now))

  return (
    <WidgetCard
      actionHref="/admin/collections/payments"
      actionLabel="Plăți"
      eyebrow={rotaryYearLabel}
      title="Statistici cotizații"
    >
      <StatGrid>
        <StatItem label="Sumă plătită" value={formatCurrency(summary.totalPaid)} />
        <StatItem
          label="Restanță"
          tone={summary.totalOwed > 0 ? 'danger' : undefined}
          value={formatCurrency(summary.totalOwed)}
        />
        <StatItem label="Cotizații plătite" value={formatNumber(summary.totalPaidCount)} />
        <StatItem
          label="Cotizații restante"
          tone="warning"
          value={formatNumber(summary.totalOverdueCount)}
        />
      </StatGrid>
      <ProgressBar
        label="Cotizații acoperite"
        value={coveredRate}
        tone={coveredRate < 70 ? 'warning' : 'success'}
      />
      <BreakdownList
        items={[
          { label: 'Plătite', tone: 'success', value: summary.totalPaidCount },
          { label: 'Scutite', value: summary.totalWaivedCount },
          { label: 'Restante', tone: 'danger', value: summary.totalOverdueCount },
        ]}
      />
    </WidgetCard>
  )
}
