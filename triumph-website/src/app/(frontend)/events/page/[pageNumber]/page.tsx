import type { Metadata } from 'next/types'

import { notFound } from 'next/navigation'
import { EventsPageContent } from '../../EventsPageContent'
import { queryEventsPage } from '../../queryEvents'

export const revalidate = 600

type Args = {
  params: Promise<{
    pageNumber: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber) || sanitizedPageNumber < 2) notFound()

  const eventsPage = await queryEventsPage(sanitizedPageNumber)
  if (eventsPage.totalPages < sanitizedPageNumber) notFound()

  return <EventsPageContent {...eventsPage} showArchive={false} />
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise

  return {
    title: `Evenimente - pagina ${pageNumber} | Interact București Triumph`,
  }
}

export async function generateStaticParams() {
  const { totalPages } = await queryEventsPage()

  return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => ({
    pageNumber: String(index + 2),
  }))
}
