import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { EventsBlock } from '@/blocks/EventsBlock/Component'
import { EventsCollection } from '@/components/EventCollection'
import { Event } from '@/payload-types'
import TimelineComponent from '@/components/ui/TimelineComponent'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'events',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      name: true,
      slug: true,
      categories: true,
      meta: true,
      eventDate: true
    },
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Proiectele Noastre</h1>
        </div>
      </div>


      <EventsCollection showDescription={true} small={false} events={posts.docs as Event[]} />

      <div className="container">
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
        <div className='container'>
      <TimelineComponent/>
        </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Evenimentele clubului Interact Bucuresti Triumph`,
  }
}
