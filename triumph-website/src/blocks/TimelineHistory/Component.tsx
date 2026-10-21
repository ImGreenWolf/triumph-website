import React from 'react'
import { EventTimeline } from '@/components/ui/TimelineComponent'
import type { EventTimelineBlock } from '@/payload-types'

const accents = { blue: '#72d8ff', royal: '#9cc5ff', gold: 'var(--accent)' }

export const TimelineBlock: React.FC<EventTimelineBlock> = ({ title, subtitle, layout, limit, showPastYears, showStatistics, accentColor, customAccentColor }) => (
  <section className="container">
    <EventTimeline title={title ?? undefined} subtitle={subtitle ?? undefined} layout={layout ?? undefined} limit={limit ?? undefined} showPastYears={showPastYears ?? undefined} showStatistics={showStatistics ?? undefined} accentColor={customAccentColor || accents[accentColor || 'blue']} />
  </section>
)
