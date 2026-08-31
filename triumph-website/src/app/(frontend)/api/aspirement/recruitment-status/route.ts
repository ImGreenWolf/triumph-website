import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { AspirementConfig } from '@/payload-types'
import { getEndOfBucharestDay, getStartOfBucharestDay } from '@/utilities/recruitmentWorkflow'

export async function GET(request: Request) {
  const formID = new URL(request.url).searchParams.get('formId')?.trim()
  const payload = await getPayload({ config: payloadConfig })
  const config = (await payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const recruitmentForm = getRelationshipID(config.recruitment?.['recruitment-form'])
  const isRecruitmentForm = Boolean(formID && recruitmentForm && formID === recruitmentForm)

  if (!isRecruitmentForm) {
    return Response.json({ isOpen: true, isRecruitmentForm: false })
  }

  const now = new Date()
  const start = getStartOfBucharestDay(config.recruitment?.recruitmentStartDate)
  const end = getEndOfBucharestDay(config.recruitment?.recruitmentEndDate)
  const isOpen = (!start || now >= start) && (!end || now <= end)

  return Response.json({
    endDate: config.recruitment?.recruitmentEndDate ?? null,
    isOpen,
    isRecruitmentForm: true,
    message: isOpen
      ? ''
      : start && now < start
        ? 'Inscrierile nu au inceput inca.'
        : 'Perioada de inscrieri s-a incheiat.',
    startDate: config.recruitment?.recruitmentStartDate ?? null,
  })
}

function getRelationshipID(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return typeof value.id === 'string' ? value.id : ''
  }

  return ''
}
