import type { WidgetServerProps } from 'payload'

import type { Meeting } from '@/payload-types'

import { ActionList, CompactTable, StatGrid, StatItem, WidgetCard } from './shared'
import { formatDateTime, formatNumber } from './widgetUtils'

export default async function MeetingsManagementWidget({ req }: WidgetServerProps) {
  const { payload } = req
  const now = new Date()
  const [totalMeetings, upcomingMeetings, latestMeetings] = await Promise.all([
    payload.count({
      collection: 'meetings',
    }),
    payload.find({
      collection: 'meetings',
      depth: 0,
      limit: 3,
      sort: 'meetingDate',
      where: {
        meetingDate: {
          greater_than_equal: now.toISOString(),
        },
      },
    }),
    payload.find({
      collection: 'meetings',
      depth: 0,
      limit: 3,
      sort: '-meetingDate',
      where: {
        meetingDate: {
          less_than: now.toISOString(),
        },
      },
    }),
  ])
  const upcoming = upcomingMeetings.docs as Meeting[]
  const latest = latestMeetings.docs as Meeting[]

  return (
    <WidgetCard
      actionHref="/admin/collections/meetings"
      actionLabel="Manage"
      eyebrow="Club administration"
      title="Meetings Management"
    >
      <StatGrid>
        <StatItem label="Total meetings" value={formatNumber(totalMeetings.totalDocs)} />
        <StatItem label="Upcoming" value={formatNumber(upcomingMeetings.totalDocs)} />
      </StatGrid>
      <ActionList
        items={[
          {
            href: '/admin/collections/meetings/create',
            label: 'Create meeting',
            meta: 'New record',
          },
          {
            href: '/admin/collections/attendance/create',
            label: 'Add attendance',
            meta: 'Member status',
          },
          {
            href: '/admin/collections/absence-motivations',
            label: 'Review motivations',
            meta: 'Requests',
          },
        ]}
      />
      <CompactTable
        emptyLabel="No upcoming meetings scheduled."
        rows={(upcoming.length > 0 ? upcoming : latest).map((meeting) => ({
          href: `/admin/collections/meetings/${meeting.id}`,
          label: upcoming.length > 0 ? 'Upcoming meeting' : 'Latest meeting',
          meta: meeting.description || undefined,
          value: formatDateTime(meeting.meetingDate),
        }))}
      />
    </WidgetCard>
  )
}
