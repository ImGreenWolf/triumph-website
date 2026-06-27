import type { WidgetServerProps } from 'payload'

import type { Event, EventRegistration } from '@/payload-types'
import { getEventEndDate } from '@/utilities/eventDisplay'

import { BreakdownList, ProgressBar, StatGrid, StatItem, WidgetCard } from './shared'
import { formatCurrency, formatNumber, percentage } from './widgetUtils'

function getEventCapacity(event: Event) {
  return (event.days ?? []).reduce(
    (eventTotal, day) =>
      eventTotal + (day.slots ?? []).reduce((dayTotal, slot) => dayTotal + (slot.capacity ?? 0), 0),
    0,
  )
}

export default async function EventStatisticsWidget({ req }: WidgetServerProps) {
  const { payload } = req
  const now = new Date()
  const [eventsDocs, registrationsDocs] = await Promise.all([
    payload.find({
      collection: 'events',
      depth: 0,
      limit: 1000,
      pagination: false,
    }),
    payload.find({
      collection: 'event-registrations',
      depth: 0,
      limit: 10000,
      pagination: false,
    }),
  ])
  const events = eventsDocs.docs as Event[]
  const registrations = registrationsDocs.docs as EventRegistration[]
  const completedEvents = events.filter((event) => {
    const endDate = getEventEndDate(event)

    return endDate ? endDate.getTime() < now.getTime() : false
  })
  const upcomingEvents = events.length - completedEvents.length
  const activeRegistrations = registrations.filter(
    (registration) => registration.status !== 'cancelled',
  )
  const presentRegistrations = registrations.filter(
    (registration) => registration.status === 'present',
  )
  const totalCapacity = events.reduce((total, event) => total + getEventCapacity(event), 0)
  const totalDonations = activeRegistrations.reduce(
    (total, registration) => total + (registration.donation ?? 0),
    0,
  )
  const fillRate = percentage(activeRegistrations.length, totalCapacity)

  return (
    <WidgetCard
      actionHref="/admin/collections/events"
      actionLabel="Events"
      eyebrow="Projects"
      title="Event Statistics"
    >
      <StatGrid>
        <StatItem label="Upcoming events" value={formatNumber(upcomingEvents)} />
        <StatItem label="Registrations" value={formatNumber(activeRegistrations.length)} />
        <StatItem label="Checked in" value={formatNumber(presentRegistrations.length)} />
        <StatItem label="Donations" value={formatCurrency(totalDonations)} />
      </StatGrid>
      <ProgressBar
        label="Capacity filled"
        value={fillRate}
        tone={fillRate > 90 ? 'warning' : 'success'}
      />
      <BreakdownList
        items={[
          {
            label: 'Registered',
            tone: 'success',
            value: registrations.filter((item) => item.status === 'registered').length,
          },
          { label: 'Present', value: presentRegistrations.length },
          {
            label: 'Absent',
            tone: 'danger',
            value: registrations.filter((item) => item.status === 'absent').length,
          },
          {
            label: 'Cancelled',
            value: registrations.filter((item) => item.status === 'cancelled').length,
          },
        ]}
      />
    </WidgetCard>
  )
}
