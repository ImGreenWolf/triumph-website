import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { readMailboxPreview } from '@/collections/Users/mailUtils'
import type { User } from '@/payload-types'
import { memberTag } from './memberCachePolicy'

export const getMemberInbox = cache((user: User) =>
  unstable_cache(
    () => readMailboxPreview(user.clubMail!, user.clubMailPassword!),
    // Credentials stay in the server closure, never in cache arguments or results.
    ['member-inbox-v1', user.id, user.updatedAt],
    { tags: [memberTag(user.id)], revalidate: 60 },
  )(),
)
