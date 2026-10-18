import 'server-only'

import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { readTags } from './memberCachePolicy'

type ReadMethod = 'find' | 'findByID' | 'findGlobal' | 'count'
export type MemberReads = Pick<Payload, ReadMethod>

const publicUserSelect = {
  name: true,
  email: true,
  role: true,
  joinedAt: true,
  profilePicture: true,
}
const profileSelect = {
  ...publicUserSelect,
  createdAt: true,
  updatedAt: true,
  clubMail: true,
  phone: true,
  birthday: true,
  birthdayConfirmed: true,
  birthdayStoryConsent: true,
  birthdayStoryImage: true,
  highschool: true,
}
const meetingSelect = {
  attendance: false,
  absenceMotivations: false,
  absentees: false,
  status: false,
}

/** Read-only, authenticated data access. Never use this for mutation validation.
 * No cookies, headers, credentials, sessions or PayloadRequest enter the cache.
 */
export const getMemberReads = cache((payload: Payload, user: User | null): MemberReads => {
  const read = cache(async (method: ReadMethod, serialized: string) => {
    const options = JSON.parse(serialized) as Record<string, unknown>
    const slug = String(options.collection ?? options.slug)
    const cached = unstable_cache(
      async () => {
        // Every private cache entry is scoped to the current identity AND role.
        // Existing explicit server-side access policies are preserved.
        const operation = payload[method].bind(payload) as (
          args: Record<string, unknown>,
        ) => Promise<unknown>
        return operation({ ...options, user: user ?? undefined })
      },
      ['member-reads-v1', user?.id ?? 'anonymous', user?.role ?? 'anonymous', method, serialized],
      {
        tags: readTags(slug, options, user?.id ?? 'anonymous'),
        revalidate: false,
      },
    )
    return cached()
  })
  const methods = Object.fromEntries(
    (['find', 'findByID', 'findGlobal', 'count'] as const).map((method) => [
      method,
      (input: Record<string, unknown>) => {
        const { user: _user, req: _req, ...options } = input
        if (options.collection === 'users') options.select ??= profileSelect
        if (options.collection === 'meetings') options.select ??= meetingSelect
        options.populate = {
          users: publicUserSelect,
          meetings: meetingSelect,
          ...(options.populate as object | undefined),
        }
        return read(method, JSON.stringify(options))
      },
    ]),
  )
  return methods as unknown as MemberReads
})
