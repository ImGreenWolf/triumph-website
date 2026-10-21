import type { EventsBlock as EventsBlockProps, Event } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { EventsCollection } from '@/components/EventCollection'

export const EventsBlock: React.FC<
  EventsBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    introContent,
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    showDescription = true,
  } = props

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
      const filteredSelectedPosts = selectedDocs.flatMap((post) => {
        return typeof post.value === 'object' && post.value ? [post.value] : []
      }) as Event[]

      events = filteredSelectedPosts
    }
  }

  return (
    <div className="min-w-0" id={id ? `block-${id}` : undefined}>
      {introContent && (
        <div className="container mb-5 sm:mb-6">
          <RichText
            className="block-intro ms-0 max-w-4xl"
            data={introContent}
            enableGutter={false}
          />
        </div>
      )}
      <EventsCollection events={events} showDescription={showDescription!} small={true} />
    </div>
  )
}
