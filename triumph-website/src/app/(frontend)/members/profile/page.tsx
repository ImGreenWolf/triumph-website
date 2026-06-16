import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'

import ProfilePageClient from './page.client'

export const metadata: Metadata = {
  description: 'Member profile details for Interact Bucuresti Triumph.',
  title: 'Member Profile | Interact Bucuresti Triumph',
}

export default async function MemberProfilePage() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/members/login')
  }

  const auth = await payload.auth({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })

  if (!auth.user) {
    redirect('/members/login')
  }

  const member = (await payload.findByID({
    collection: 'users',
    depth: 2,
    id: (auth.user as User).id,
  })) as User

  return <ProfilePageClient member={member} />
}
