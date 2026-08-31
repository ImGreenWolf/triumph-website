import type { Metadata } from 'next'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Application, AspirementConfig, Comission } from '@/payload-types'
import {
  generateInterviewSlots,
  type RecruitmentApplication,
} from '@/utilities/aspirementRecruitment'

import ScheduleInterviewClient, { type InterviewScheduleSlot } from './ScheduleInterviewClient'

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

export const metadata: Metadata = {
  description: 'Programare interview aspiranti Interact Bucuresti Triumph.',
  title: 'Programare Interview | Interact Bucuresti Triumph',
}

export default async function InterviewSchedulingPage({ params: paramsPromise }: Args) {
  const params = await paramsPromise
  const token = decodeURIComponent(params.token || '').trim()
  const payload = await getPayload({ config: payloadConfig })
  const application = token ? await findApplicationByToken(token) : null

  if (!application) {
    return (
      <ScheduleInterviewClient
        candidateName="candidat"
        currentInterviewDate={null}
        deadline={null}
        slots={[]}
        token={token}
        unavailableMessage="Linkul de programare nu este valid."
      />
    )
  }

  const config = (await payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfigWithDeadline
  const deadline = normalizeDate(config.recruitment?.interviewSchedulingDeadline)
  const commission = await getApplicationCommission(application)
  const unavailableMessage = getUnavailableMessage(application, deadline)
  const slots = await getSerializedSlots({
    application,
    commission,
  })

  return (
    <ScheduleInterviewClient
      candidateName={application.name}
      currentInterviewDate={normalizeDate(application.reviewProcess?.interviewDate)}
      deadline={deadline}
      slots={slots}
      token={token}
      unavailableMessage={unavailableMessage}
    />
  )

  async function findApplicationByToken(value: string) {
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

  async function getSerializedSlots(args: {
    application: RecruitmentApplication
    commission: Comission | null
  }): Promise<InterviewScheduleSlot[]> {
    if (!args.commission) return []

    const slots = generateInterviewSlots(args.commission.interviewIntervals)
    if (slots.length === 0) return []

    const taken = await getTakenSlotStarts(
      slots.map((slot) => slot.start),
      args.application.id,
      args.commission.id,
    )
    const current = normalizeDate(args.application.reviewProcess?.interviewDate)

    return slots.map((slot) => ({
      ...slot,
      available: !taken.has(slot.start) || slot.start === current,
      isCurrent: slot.start === current,
    }))
  }

  async function getTakenSlotStarts(
    slotStarts: string[],
    currentApplicationId: string,
    commissionId: string,
  ) {
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

function getUnavailableMessage(application: RecruitmentApplication, deadline: string | null) {
  if (application.reviewProcess?.status !== 'interview') {
    return 'Programarea nu mai este disponibila pentru acest candidat.'
  }

  if (deadline && new Date(deadline) < new Date()) {
    return 'Deadline-ul pentru programare a trecut.'
  }

  return undefined
}

function normalizeDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
