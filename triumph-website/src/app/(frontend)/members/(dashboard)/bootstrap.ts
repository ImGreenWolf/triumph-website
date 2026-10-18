import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import type { User } from '@/payload-types'
import { getMemberReads } from '@/utilities/memberReads'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import { isBoardMember } from '@/utilities/membersAccess'

/** Only settings and navigation gate the shell. Card data never gates this read. */
export const getDashboardBootstrap = cache(async () => {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })
  if (!auth.user) redirect('/members/login')

  const user = auth.user as User
  const reads = getMemberReads(payload, user)
  const board = isBoardMember(user)
  const [dashboard, events, commissions] = await Promise.all([
    reads.findGlobal({ slug: 'members-dashboard', depth: 0 }),
    reads.count({
      collection: 'events',
      overrideAccess: true,
      where: board
        ? undefined
        : {
            or: [
              { coordonators: { contains: user.id } },
              { checkInMembers: { contains: user.id } },
            ],
          },
    }),
    board
      ? Promise.resolve({ totalDocs: 1 })
      : reads.count({
          collection: 'comissions',
          overrideAccess: true,
          where: { coordinators: { contains: user.id } },
        }),
  ])

  return {
    user,
    reads,
    shell: {
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clubMail: user.clubMail,
      },
      dashboard,
      capabilities: {
        projects: events.totalDocs > 0,
        commissions: commissions.totalDocs > 0,
        board,
      },
      hasWebmail: Boolean(user.clubMailPassword),
      now: new Date(),
    },
  }
})
