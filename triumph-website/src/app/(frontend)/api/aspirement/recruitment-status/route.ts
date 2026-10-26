import payloadConfig from '@payload-config'
import { getPayload } from 'payload'
import { getRecruitmentStatus } from '@/utilities/recruitmentStatus'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const formID = new URL(request.url).searchParams.get('formId')?.trim()
  const payload = await getPayload({ config: payloadConfig })
  const config = await payload.findGlobal({ slug: 'aspirementConfig', depth: 0, overrideAccess: true })
  const form = config.recruitment?.['recruitment-form']
  const recruitmentFormID = typeof form === 'string' ? form : form?.id
  const isRecruitmentForm = Boolean(formID && recruitmentFormID === formID)
  const status = getRecruitmentStatus(recruitmentFormID ? config.recruitment : null)
  return Response.json({
    ...status, isRecruitmentForm,
    ...(formID && !isRecruitmentForm ? { isOpen: true } : {}),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
