import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Application, AspirementConfig, Comission } from '@/payload-types'
import {
  generateInterviewSlots,
  type RecruitmentApplication,
} from '@/utilities/aspirementRecruitment'

type Args = {
  params: Promise<{
    token: string
  }>
}

type AspirementConfigWithDeadline = AspirementConfig & {
  recruitment?: AspirementConfig['recruitment'] & {
    interviewSchedulingDeadline?: string | null
  }
}

export async function POST(request: Request, { params: paramsPromise }: Args) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Cerere nepermisa.' }, { status: 403 })
  }

  const params = await paramsPromise
  const token = decodeURIComponent(params.token || '').trim()
  const payload = await getPayload({ config: payloadConfig })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  const slotStart =
    typeof (body as Record<string, unknown>).slot === 'string'
      ? ((body as Record<string, unknown>).slot as string).trim()
      : ''

  if (!slotStart) {
    return Response.json({ message: 'Selecteaza un interval.' }, { status: 400 })
  }

  const application = await findApplicationByToken(token)
  if (!application) {
    return Response.json({ message: 'Linkul de programare nu este valid.' }, { status: 404 })
  }

  if (application.reviewProcess?.status !== 'interview') {
    return Response.json(
      { message: 'Programarea nu mai este disponibila pentru acest candidat.' },
      { status: 409 },
    )
  }

  const config = (await payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfigWithDeadline
  const deadline = normalizeDate(config.recruitment?.interviewSchedulingDeadline)

  if (deadline && new Date(deadline) < new Date()) {
    return Response.json({ message: 'Deadline-ul pentru programare a trecut.' }, { status: 409 })
  }

  const commission = await getApplicationCommission(application)
  if (!commission) {
    return Response.json({ message: 'Candidatul nu este asignat unei comisii.' }, { status: 409 })
  }

  const slots = generateInterviewSlots(commission.interviewIntervals)
  const selectedSlot = slots.find((slot) => slot.start === slotStart)

  if (!selectedSlot) {
    return Response.json({ message: 'Intervalul selectat nu este valid.' }, { status: 400 })
  }

  const taken = await getTakenSlotStarts(
    slots.map((slot) => slot.start),
    application.id,
    commission.id,
  )
  const current = normalizeDate(application.reviewProcess?.interviewDate)

  if (taken.has(selectedSlot.start) && selectedSlot.start !== current) {
    return Response.json({ message: 'Intervalul selectat a fost deja ocupat.' }, { status: 409 })
  }

  const updated = (await payload.update({
    collection: 'applications',
    data: {
      reviewProcess: {
        ...(application.reviewProcess ?? {}),
        interviewAttendance: 'scheduled',
        interviewDate: selectedSlot.start,
      },
    },
    id: application.id,
    overrideAccess: true,
  })) as RecruitmentApplication
  const updatedTaken = await getTakenSlotStarts(
    slots.map((slot) => slot.start),
    application.id,
    commission.id,
  )

  return Response.json({
    interviewDate: updated.reviewProcess?.interviewDate ?? selectedSlot.start,
    slots: slots.map((slot) => ({
      ...slot,
      available: !updatedTaken.has(slot.start) || slot.start === selectedSlot.start,
      isCurrent: slot.start === selectedSlot.start,
    })),
  })

  async function findApplicationByToken(value: string) {
    if (!value) return null

    const result = await payload.find({
      collection: 'applications',
      depth: 2,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        'reviewProcess.interviewScheduleToken': {
          equals: value,
        },
      },
    })

    return (result.docs[0] as RecruitmentApplication | undefined) ?? null
  }

  async function getTakenSlotStarts(
    slotStarts: string[],
    currentApplicationId: string,
    commissionId: string,
  ) {
    if (slotStarts.length === 0) return new Set<string>()

    const result = await payload.find({
      collection: 'applications',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          { 'reviewProcess.comission': { equals: commissionId } },
          { 'reviewProcess.interviewDate': { in: slotStarts } },
        ],
      },
    })

    return new Set(
      (result.docs as Application[])
        .filter((item) => item.id !== currentApplicationId)
        .map((item) => normalizeDate(item.reviewProcess?.interviewDate))
        .filter((value): value is string => Boolean(value)),
    )
  }

  async function getApplicationCommission(application: RecruitmentApplication) {
    const relation = application.reviewProcess?.comission
    if (relation && typeof relation === 'object' && 'id' in relation) {
      return relation as Comission
    }

    const id = typeof relation === 'string' ? relation : ''
    if (!id) return null

    try {
      return await payload.findByID({
        collection: 'comissions',
        depth: 0,
        id,
        overrideAccess: true,
      })
    } catch {
      return null
    }
  }
}

function normalizeDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
