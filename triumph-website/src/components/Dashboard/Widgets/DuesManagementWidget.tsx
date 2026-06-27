import type { WidgetServerProps } from 'payload'

import { getAllMembersDuesSummary } from '@/utilities/memberDues'

import { ActionList, CompactTable, StatGrid, StatItem, WidgetCard } from './shared'
import { formatCurrency, formatNumber } from './widgetUtils'

export default async function DuesManagementWidget({ req }: WidgetServerProps) {
  const summary = await getAllMembersDuesSummary(req.payload)
  const debtors = summary.memberSummaries
    .filter((memberSummary) => memberSummary.totalOwed > 0)
    .sort(
      (left, right) => right.totalOwed - left.totalOwed || right.overdueCount - left.overdueCount,
    )
  const criticalDebtors = debtors.filter((memberSummary) => memberSummary.overdueCount > 3)

  return (
    <WidgetCard
      actionHref="/admin/collections/payments/create"
      actionLabel="Add payment"
      eyebrow="Treasury"
      title="Dues Management"
    >
      <StatGrid>
        <StatItem
          label="Members owing"
          tone={debtors.length > 0 ? 'warning' : undefined}
          value={formatNumber(debtors.length)}
        />
        <StatItem
          label="Critical"
          tone={criticalDebtors.length > 0 ? 'danger' : undefined}
          value={formatNumber(criticalDebtors.length)}
        />
      </StatGrid>
      <ActionList
        items={[
          {
            href: '/admin/collections/payments/create',
            label: 'Record payment',
            meta: 'Paid or waived',
          },
          { href: '/admin/collections/users', label: 'Open members', meta: 'Dues by member' },
        ]}
      />
      <CompactTable
        emptyLabel="No members currently owe dues."
        rows={debtors.slice(0, 5).map((memberSummary) => ({
          href: `/admin/collections/users/${memberSummary.memberId}`,
          label: memberSummary.member.name || memberSummary.memberId,
          meta: `${formatNumber(memberSummary.overdueCount)} overdue`,
          value: formatCurrency(memberSummary.totalOwed),
        }))}
      />
    </WidgetCard>
  )
}
