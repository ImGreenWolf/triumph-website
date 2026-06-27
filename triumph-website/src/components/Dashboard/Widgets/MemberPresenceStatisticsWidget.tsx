import type { WidgetServerProps } from 'payload'

import { BreakdownList, ProgressBar, StatGrid, StatItem, WidgetCard } from './shared'
import { getPresenceOverview } from './presenceData'
import { formatNumber } from './widgetUtils'

export default async function MemberPresenceStatisticsWidget({ req }: WidgetServerProps) {
  const overview = await getPresenceOverview(req.payload)

  return (
    <WidgetCard
      actionHref="/admin/collections/attendance"
      actionLabel="Attendance"
      eyebrow="Members"
      title="Member Presence Statistics"
    >
      <StatGrid>
        <StatItem label="Presence rate" value={`${overview.attendanceRate}%`} />
        <StatItem label="Tracked members" value={formatNumber(overview.memberCount)} />
        <StatItem label="Past meetings" value={formatNumber(overview.meetingCount)} />
        <StatItem
          helper="Includes missing attendance records"
          label="Absences"
          tone="danger"
          value={formatNumber(overview.absent)}
        />
      </StatGrid>
      <ProgressBar label="Effective presence" value={overview.attendanceRate} />
      <BreakdownList
        items={[
          { label: 'Present', tone: 'success', value: overview.present },
          { label: 'Late', tone: 'warning', value: overview.late },
          { label: 'Motivated absence', value: overview.motivated },
          { label: 'Absent', tone: 'danger', value: overview.absent },
        ]}
      />
    </WidgetCard>
  )
}
