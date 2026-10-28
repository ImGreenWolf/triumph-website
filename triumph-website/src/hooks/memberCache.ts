import { revalidateTag } from 'next/cache'
import { after } from 'next/server'
import { hasAutosaveEnabled } from 'payload/shared'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Config,
  GlobalAfterChangeHook,
} from 'payload'

import { mutationTags } from '@/utilities/memberCachePolicy'
import { getRegistrationImportBatch } from '@/utilities/eventRegistrationImportContext'

function expire(slug: string, doc: Record<string, unknown>, previous?: Record<string, unknown>) {
  for (const tag of mutationTags(slug, doc, previous)) revalidateTag(tag, { expire: 0 })
}

export const invalidateMemberChange: CollectionAfterChangeHook = ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const batch = getRegistrationImportBatch(req?.context)
  const eventID =
    (typeof doc.event === 'object' ? doc.event?.id : doc.event) ??
    (collection.slug === 'event-registrations' ? batch?.event.id : undefined)
  if (
    collection.slug === 'event-registrations' &&
    eventID === batch?.event.id &&
    batch?.invalidationTags
  ) {
    for (const tag of mutationTags(
      collection.slug,
      { ...doc, event: doc.event ?? batch.event.id },
      previousDoc,
    ))
      batch.invalidationTags.add(tag)
    return doc
  }
  // Payload creates the initial autosaved draft while rendering the create page.
  // Next.js only permits cache invalidation outside that render phase.
  if (operation === 'create' && doc._status === 'draft' && hasAutosaveEnabled(collection)) {
    after(() => expire(collection.slug, doc, previousDoc))
  } else {
    expire(collection.slug, doc, previousDoc)
  }
  return doc
}

export const invalidateMemberDelete: CollectionAfterDeleteHook = ({ collection, doc }) => {
  expire(collection.slug, doc)
  return doc
}

const invalidateMemberGlobal: GlobalAfterChangeHook = ({ global, doc, previousDoc }) => {
  expire(global.slug, doc, previousDoc)
  return doc
}

// Applied after other plugins so generated form collections are covered too.
export function memberCachePlugin(config: Config): Config {
  const collections = new Set([
    'users',
    'payments',
    'attendance',
    'absence-motivations',
    'meetings',
    'events',
    'event-registrations',
    'comissions',
    'applications',
    'forms',
    'form-submissions',
    'mandates',
    'media',
    'documents',
  ])
  return {
    ...config,
    collections: config.collections?.map((collection) =>
      collections.has(collection.slug)
        ? {
            ...collection,
            hooks: {
              ...collection.hooks,
              afterChange: [...(collection.hooks?.afterChange ?? []), invalidateMemberChange],
              afterDelete: [...(collection.hooks?.afterDelete ?? []), invalidateMemberDelete],
            },
          }
        : collection,
    ),
    globals: config.globals?.map((global) =>
      ['members-dashboard', 'aspirementConfig'].includes(global.slug)
        ? {
            ...global,
            hooks: {
              ...global.hooks,
              afterChange: [...(global.hooks?.afterChange ?? []), invalidateMemberGlobal],
            },
          }
        : global,
    ),
  }
}
