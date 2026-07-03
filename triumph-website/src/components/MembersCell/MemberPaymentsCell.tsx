import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import { getMemberDuesSummary } from '@/utilities/memberDues'

import MemberPaymentCell from './MemberPaymentsCell.client'

const getCachedDuesSummary = cache(async (payload: Payload, rowData: any) => {
  return getMemberDuesSummary(payload, rowData)
})

export default async function MeetingAttendenceCell({
  payload,
  rowData,
}: DefaultServerCellComponentProps) {
  const summary = await getCachedDuesSummary(payload, rowData)

  return <MemberPaymentCell summary={summary} />
}
