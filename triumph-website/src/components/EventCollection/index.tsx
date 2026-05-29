import { cn } from '@/utilities/ui'
import React from 'react'

import { EventCard } from '@/components/EventCard'
import { Event } from '@/payload-types'

export type Props = {
  events: Event[],
  showDescription: boolean,
  small: boolean
}

export const EventsCollection: React.FC<Props> = (props) => {
  const { events, showDescription = true, small } = props

  return (
    <div className={cn('container')}>
        <div>
          <div className={cn("grid gap-y-4 gap-x-4 lg:gap-y-8 lg:gap-x-8 xl:gap-x-8", true ? 'grid-cols-4' : 'grid-cols-3')}>
            {events?.map((result, index) => {
              if (typeof result === 'object' && result !== null) {
                return (
                  <div className="" key={index}>
                    <EventCard className="h-full" doc={result} showDescription={showDescription} small={small}/>
                  </div>
                )
              }
  
              return null
            })}
          </div>
        </div>
      </div>
  )
}
