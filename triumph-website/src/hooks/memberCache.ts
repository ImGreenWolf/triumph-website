import { revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Config,
  GlobalAfterChangeHook,
} from 'payload'

import { mutationTags } from '@/utilities/memberCachePolicy'

function expire(slug: string, doc: Record<string, unknown>, previous?: Record<string, unknown>) {
  for (const tag of mutationTags(slug, doc, previous)) revalidateTag(tag, { expire: 0 })
}

export const invalidateMemberChange: CollectionAfterChangeHook = ({
  collection,
  doc,
  previousDoc,
}) => {
  expire(collection.slug, doc, previousDoc)
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
