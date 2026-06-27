import type { WidgetServerProps } from 'payload'

import { getAllMembersDuesSummary } from '@/utilities/memberDues'

export default async function UserStatsWidget({ req }: WidgetServerProps) {
  const { payload } = req
  const summary = await getAllMembersDuesSummary(payload)
  const criticalDues = summary.memberSummaries
    .filter((memberSummary) => memberSummary.overdueCount > 3)
    .sort((a, b) => b.overdueCount - a.overdueCount)
    .slice(0, 9)

  const cardItems = [
    {
      label: 'Total Plătit',
      value: summary.totalPaidCount,
    },
    {
      label: 'Total Datorat',
      value: summary.totalOwed,
    },
    {
      label: 'Total Achitat',
      value: summary.totalPaid,
    },
  ]

  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <h2>Cotizații</h2>

      <div style={{ gridColumn: 2, gridRow: '1 / 3' }}>
        <h2>Situație critică</h2>
        <ul>
          {criticalDues.map((memberSummary) => (
            <li key={memberSummary.memberId}>
              {memberSummary.member.name ?? memberSummary.memberId} - {memberSummary.totalOwed} RON
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'wrap',
          gap: '16px',
          gridColumn: '1',
        }}
      >
        {cardItems.map((item) => (
          <div key={item.label} style={{ display: 'flex', gap: '8px' }}>
            <h3>{item.label}</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
