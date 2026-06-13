import { cn } from '@/utilities/ui'
import React from 'react'

import { EventCard } from '@/components/EventCard'
import { Event } from '@/payload-types'

export type Props = {
  className?: string
  contained?: boolean
  events: Event[]
  showDescription: boolean
  small: boolean
}

export const EventsCollection: React.FC<Props> = (props) => {
  const { className, contained = true, events, showDescription = true, small } = props

  return (
    <div className={cn(contained && 'container', className)}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {events?.map((result) => {
          if (typeof result !== 'object' || result === null) return null

          return (
            <EventCard
              className="h-full"
              doc={result}
              key={result.id || result.slug}
              showDescription={showDescription}
              small={small}
            />
          )
        })}
      </div>
    </div>
  )
}
