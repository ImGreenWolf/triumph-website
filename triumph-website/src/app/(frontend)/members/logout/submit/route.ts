import { NextResponse } from 'next/server'

import payloadConfig from '@payload-config'
import { generateExpiredPayloadCookie, getPayload } from 'payload'

export const runtime = 'nodejs'

export async function POST() {
  const payload = await getPayload({
    config: payloadConfig,
  })
  const usersCollection = payload.collections.users
  const expiredCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: usersCollection.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
  })

  return NextResponse.json(
    { message: 'Logout successful' },
    {
      headers: {
        'Set-Cookie': expiredCookie,
      },
    },
  )
}
