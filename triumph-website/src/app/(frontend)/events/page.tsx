import type { Metadata } from 'next/types'

import { EventsPageContent } from './EventsPageContent'
import { queryEventsPage } from './queryEvents'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const eventsPage = await queryEventsPage()

  return <EventsPageContent {...eventsPage} />
}

export function generateMetadata(): Metadata {
  return {
    openGraph: mergeOpenGraph({
       description: 'Descoperă și explorează evenimentele organizate de Interact București Triumph.',
     title: 'Evenimente | Interact București Triumph',
    }),
     description: 'Descoperă și explorează evenimentele organizate de Interact București Triumph.',
     title: 'Evenimente | Interact București Triumph',
  }
   

  
}
