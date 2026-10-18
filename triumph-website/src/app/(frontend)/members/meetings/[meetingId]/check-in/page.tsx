import { redirect } from 'next/navigation'

import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import AutomaticCheckIn from './AutomaticCheckIn'

export default async function CheckInPage({
  params,
}: {
  params: Promise<{
    meetingId: string
  }>
}) {
  const { meetingId } = await params

  const payload = await getPayload({
    config: payloadConfig,
  })

  // Authenticate member
  const authResult = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })

  if (!authResult.user) {
    redirect(`/members/login?redirect=/members/meetings/${meetingId}/check-in`)
  }

  return <AutomaticCheckIn meetingId={meetingId} />
}
