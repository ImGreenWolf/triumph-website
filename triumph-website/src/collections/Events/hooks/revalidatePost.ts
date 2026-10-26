import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Event } from '../../../payload-types'

export const revalidatePost: CollectionAfterChangeHook<Event> = ({
  doc,
  previousDoc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') revalidatePath(`/events/${doc.slug}`)
    if (
      previousDoc?._status === 'published' &&
      (doc._status !== 'published' || previousDoc.slug !== doc.slug)
    )
      revalidatePath(`/events/${previousDoc.slug}`)
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      revalidatePath('/')
      revalidatePath('/events')
      revalidateTag('events-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Event> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidatePath(`/events/${doc?.slug}`)
    revalidatePath('/')
    revalidatePath('/events')
    revalidateTag('events-sitemap', 'max')
  }
  return doc
}
