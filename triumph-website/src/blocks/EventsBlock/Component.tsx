import type { Post, EventsBlock as EventsBlockProps, Event } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { Card } from '@/components/Card'
import { cn } from '@/utilities/ui'
import { EventCard } from '@/components/EventCard'
import { EventsCollection } from '@/components/EventCollection'

export const EventsBlock: React.FC<
  EventsBlockProps & {
    id?: string
  }
> = async (props) => {
  const { id, introContent, limit: limitFromProps, populateBy, selectedDocs, showDescription=true } = props

  const limit = limitFromProps || 3

  let events: Event[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })



    const fetchedPosts = await payload.find({
      collection: 'events',
      depth: 1,
      limit,
    })

    events = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Event[]

      events = filteredSelectedPosts
    }
  }

  return (
    <div className="my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <EventsCollection events={events} showDescription={showDescription!} small={true}/>
    </div>
  )
}
