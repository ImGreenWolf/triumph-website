import { MemberDataBoundary } from '@/app/(frontend)/members/_components/MemberDataBoundary'
import { getMemberReads } from '@/utilities/memberReads'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Event, User } from '@/payload-types'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import ProjectManagerDashboard, { type ManagedEvent } from './ProjectManagerDashboard'
import { serializeManagedEvent, compareNullableDates } from '@/utilities/projectSerialization'
import { isBoardMember } from '@/utilities/membersAccess'

export const metadata: Metadata = {
  description: 'Înscrieri, check-in și rapoarte pentru evenimentele coordonate.',
  title: 'Panou Project Manager | Interact București Triumph',
}

export default async function ProjectManagerPage() {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })

  if (!auth.user) redirect('/members/login')

  const reads = getMemberReads(payload, auth.user as User)
  return (
    <MemberDataBoundary>
      {async () => {
        const payload = reads
        const user = auth.user as User
        const globalAccess = isBoardMember(user)
        const eventResult = await payload.find({
          collection: 'events',
          depth: 1,
          limit: 0,
          overrideAccess: true,
          pagination: false,
          sort: '-updatedAt',
          select: {
            name: true,
            slug: true,
            days: true,
            coordonators: true,
            checkInMembers: true,
            donation: true,
            minimumConsumation: true,
            primaryColor: true,
            secondaryColor: true,
            cardColor: true,
            useColors: true,
            location: true,
            meta: true,
          },
          populate: { users: { name: true, email: true, role: true } },

          where: globalAccess
            ? undefined
            : {
                or: [
                  {
                    coordonators: {
                      contains: user.id,
                    },
                  },
                  {
                    checkInMembers: {
                      contains: user.id,
                    },
                  },
                ],
              },
        })
        const events = eventResult.docs as Event[]

        const managedEvents: ManagedEvent[] = events
          .map((event) => ({ ...serializeManagedEvent(event, [], user), remote: true }))
          .sort((left, right) => compareNullableDates(left.startTime, right.startTime))

        return <ProjectManagerDashboard events={managedEvents} userName={user.name || user.email} />
      }}
    </MemberDataBoundary>
  )
}
