import type { Metadata } from 'next/types'

import { EventsPageContent } from './EventsPageContent'
import { queryEventsPage } from './queryEvents'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const eventsPage = await queryEventsPage()

  return <EventsPageContent {...eventsPage} />
}

export function generateMetadata(): Metadata {
  return {
    description: 'Descoperă și explorează evenimentele organizate de Interact București Triumph.',
    title: 'Evenimente | Interact București Triumph',
  }
}
