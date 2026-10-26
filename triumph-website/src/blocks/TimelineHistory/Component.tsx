import { getPayload } from 'payload'
import config from '@payload-config'
import { EventTimeline } from '@/components/ui/TimelineComponent'
import type { EventTimelineBlock } from '@/payload-types'
import { withPublicEventCounts } from '@/utilities/publicEventStats'
import { getEventEndDate, isEventCompleted } from '@/utilities/eventDisplay'

const accents = { blue: '#72d8ff', royal: '#9cc5ff', gold: 'var(--accent)' }
export async function TimelineBlock({
  title,
  subtitle,
  layout,
  limit = 10,
  showPastYears,
  showStatistics,
  accentColor,
  customAccentColor,
}: EventTimelineBlock) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    overrideAccess: false,
    draft: false,
    depth: 1,
    pagination: false,
    where: { _status: { equals: 'published' } },
    select: { name: true, slug: true, days: true, heroImage: true, location: true, cause: true },
  })
  const completed = result.docs
    .filter((event) => isEventCompleted(event))
    .sort((a, b) => (getEventEndDate(b)?.getTime() ?? 0) - (getEventEndDate(a)?.getTime() ?? 0))
    .slice(0, limit ?? 10)
  const events =
    showStatistics === false
      ? completed
      : await withPublicEventCounts(completed as import('@/payload-types').Event[])
  return (
    <section className="container">
      <EventTimeline
        initialEvents={events as import('@/payload-types').Event[]}
        title={title ?? undefined}
        subtitle={subtitle ?? undefined}
        layout={layout ?? undefined}
        limit={limit ?? undefined}
        showPastYears={showPastYears ?? undefined}
        showStatistics={showStatistics ?? undefined}
        accentColor={customAccentColor || accents[accentColor || 'blue']}
      />
    </section>
  )
}
