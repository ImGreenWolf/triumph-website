import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import MeetingAttendenceCellClient from './MeetingAttendenceCell.client'

const getActiveMemberCount = cache(async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      role: {
        not_equals: 'passive',
      },
    },
  })

  return totalDocs
})

export default async function MeetingAttendenceCell({
  cellData,
  payload,
}: DefaultServerCellComponentProps) {
  const attendanceCount =
    typeof cellData?.totalDocs === 'number'
      ? cellData.totalDocs
      : Array.isArray(cellData?.docs)
        ? cellData.docs.length
        : 0
  const memberCount = await getActiveMemberCount(payload)

  return <MeetingAttendenceCellClient attendanceCount={attendanceCount} memberCount={memberCount} />
}
