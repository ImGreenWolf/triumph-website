import type { WidgetServerProps } from 'payload'

import { getAllMembersDuesSummary } from '@/utilities/memberDues'
import { formatRotaryYearLabel, getRotaryYearStart } from '@/utilities/rotaryYear'

import { ActionList, CompactTable, StatGrid, StatItem, WidgetCard } from './shared'
import { formatCurrency, formatNumber } from './widgetUtils'

export default async function DuesManagementWidget({ req }: WidgetServerProps) {
  const now = new Date()
  const summary = await getAllMembersDuesSummary(req.payload, now)
  const debtors = summary.memberSummaries
    .filter((memberSummary) => memberSummary.totalOwed > 0)
    .sort(
      (left, right) => right.totalOwed - left.totalOwed || right.overdueCount - left.overdueCount,
    )
  const criticalDebtors = debtors.filter((memberSummary) => memberSummary.overdueCount > 3)

  return (
    <WidgetCard
      actionHref="/admin/collections/payments/create"
      actionLabel="Adaugă plată"
      eyebrow={formatRotaryYearLabel(getRotaryYearStart(now))}
      title="Administrare cotizații"
    >
      <StatGrid>
        <StatItem
          label="Membri restanțieri"
          tone={debtors.length > 0 ? 'warning' : undefined}
          value={formatNumber(debtors.length)}
        />
        <StatItem
          label="Critic"
          tone={criticalDebtors.length > 0 ? 'danger' : undefined}
          value={formatNumber(criticalDebtors.length)}
        />
      </StatGrid>
      <ActionList
        items={[
          {
            href: '/admin/collections/payments/create',
            label: 'Înregistrează plată',
            meta: 'Plătită sau scutită',
          },
          {
            href: '/admin/collections/users',
            label: 'Deschide membri',
            meta: 'Cotizații per membru',
          },
        ]}
      />
      <CompactTable
        emptyLabel="Niciun membru nu are cotizații restante."
        rows={debtors.slice(0, 5).map((memberSummary) => ({
          href: `/admin/collections/users/${memberSummary.memberId}`,
          label: memberSummary.member.name || memberSummary.memberId,
          meta: `${formatNumber(memberSummary.overdueCount)} restante`,
          value: formatCurrency(memberSummary.totalOwed),
        }))}
      />
    </WidgetCard>
  )
}
