import { MemberDataBoundary } from '@/app/(frontend)/members/_components/MemberDataBoundary'
import { getMemberReads } from '@/utilities/memberReads'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import ProfilePageClient from './page.client'

export const metadata: Metadata = {
  description: 'Member profile details for Interact Bucuresti Triumph.',
  title: 'Member Profile | Interact Bucuresti Triumph',
}

export default async function MemberProfilePage() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const auth = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })

  if (!auth.user) {
    redirect('/members/login')
  }

  const reads = getMemberReads(payload, auth.user as User)
  return (
    <MemberDataBoundary>
      {async () => {
        const payload = reads
        const member = (await payload.findByID({
          collection: 'users',
          depth: 2,
          id: (auth.user as User).id,
        })) as User
        return <ProfilePageClient member={member} />
      }}
    </MemberDataBoundary>
  )
}
