import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import MemberAttendenceCell from './MemberAttendenceCell.client'

const getMeetingsCount = cache(async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'meetings',
    where: {
      
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
  const memberCount = await getMeetingsCount(payload)

  return <MemberAttendenceCell attendanceCount={attendanceCount} meetingsCount={memberCount} />
}
