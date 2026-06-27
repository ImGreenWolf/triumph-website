import type { WidgetServerProps } from 'payload'

import { BarGraph, CompactTable, WidgetCard } from './shared'
import { getPresenceGraphData } from './presenceData'
import { formatNumber } from './widgetUtils'

export default async function MemberPresenceGraphWidget({ req }: WidgetServerProps) {
  const points = await getPresenceGraphData(req.payload)

  return (
    <WidgetCard
      actionHref="/admin/collections/meetings"
      actionLabel="Meetings"
      eyebrow="Trend"
      title="Member Presence Graph"
    >
      <BarGraph
        bars={points.map((point) => ({
          helper: `${formatNumber(point.present + point.late)}/${formatNumber(point.total)}`,
          label: point.label,
          value: point.rate,
        }))}
        emptyLabel="No completed meetings yet."
      />
      <CompactTable
        emptyLabel="No meeting data available."
        rows={points
          .slice(-3)
          .reverse()
          .map((point) => ({
            href: `/admin/collections/meetings/${point.id}`,
            label: point.label,
            meta: `${formatNumber(point.present + point.late)} present, ${formatNumber(point.absent)} absent`,
            value: `${point.rate}%`,
          }))}
      />
    </WidgetCard>
  )
}
