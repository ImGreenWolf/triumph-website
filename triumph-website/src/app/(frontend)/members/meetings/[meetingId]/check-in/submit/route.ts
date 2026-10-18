import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import type { User } from '@/payload-types'
import { recordMemberCheckIn } from '@/utilities/recordMemberCheckIn'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Cerere nepermisă.' }, { status: 403 })
  }
  const payload = await getPayload({ config: payloadConfig })
  const headers = new Headers(request.headers)
  if (!headers.has('sec-fetch-site')) headers.set('sec-fetch-site', 'same-origin')
  const auth = await payload.auth({ headers })
  if (!auth.user) return Response.json({ message: 'Autentifică-te din nou.' }, { status: 401 })
  try {
    const { meetingId } = await params
    const result = await recordMemberCheckIn(payload, auth.user as User, meetingId)
    if ('error' in result)
      return Response.json({ message: result.error }, { status: result.statusCode })
    return Response.json(result)
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Member check-in failed' })
    return Response.json(
      { message: 'Prezența nu a putut fi înregistrată. Încearcă din nou.' },
      { status: 500 },
    )
  }
}
