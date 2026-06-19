import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import MemberPaymentCell from './MemberPaymentsCell.client'
import { RowData } from 'node_modules/payload/dist/admin/elements/Cell'
import { getDuesSummary, getMemberDuesSummary } from '@/utilities/memberDues'

const getCachedDuesSummary = cache(async (payload: Payload, rowData: any) => {
  



  return getMemberDuesSummary(payload, rowData)
})

export default async function MeetingAttendenceCell({
  cellData,
  payload,
  rowData
}: DefaultServerCellComponentProps) {

  const summary = await getCachedDuesSummary(payload, rowData)

  return <MemberPaymentCell summary={summary} />
}
