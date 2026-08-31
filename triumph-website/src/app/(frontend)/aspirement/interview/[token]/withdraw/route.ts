import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { AspirementConfig } from '@/payload-types'
import type { RecruitmentApplication } from '@/utilities/aspirementRecruitment'

type Args = {
  params: Promise<{
    token: string
  }>
}

export async function POST(request: Request, { params: paramsPromise }: Args) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Cerere nepermisa.' }, { status: 403 })
  }

  const { token: rawToken } = await paramsPromise
  const token = decodeURIComponent(rawToken || '').trim()
  const payload = await getPayload({ config: payloadConfig })
  const application = await findApplicationByToken(payload, token)

  if (!application) {
    return Response.json({ message: 'Linkul de programare nu este valid.' }, { status: 404 })
  }
  if (application.reviewProcess?.status !== 'interview') {
    return Response.json({ message: 'Retragerea nu mai este disponibila.' }, { status: 409 })
  }

  const config = (await payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const deadline = normalizeDate(config.recruitment?.interviewSchedulingDeadline)
  if (deadline && new Date(deadline) < new Date()) {
    return Response.json({ message: 'Deadline-ul pentru programare a trecut.' }, { status: 409 })
  }

  await payload.update({
    collection: 'applications',
    data: {
      reviewProcess: {
        ...(application.reviewProcess ?? {}),
        interviewAttendance: null,
        interviewDate: null,
        status: 'interview-withdrawn',
      },
    },
    id: application.id,
    overrideAccess: true,
  })

  return Response.json({ withdrawn: true })
}

async function findApplicationByToken(
  payload: Awaited<ReturnType<typeof getPayload>>,
  token: string,
) {
  if (!token) return null

  const result = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      'reviewProcess.interviewScheduleToken': {
        equals: token,
      },
    },
  })

  return (result.docs[0] as RecruitmentApplication | undefined) ?? null
}

function normalizeDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
