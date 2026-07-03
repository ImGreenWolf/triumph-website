import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import MeetingAttendenceCellClient from './MeetingAttendenceCell.client'

const getActiveMemberCount = cache(async (payload: Payload, meetingDate?: string) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      ...(meetingDate
        ? {
            joinedAt: {
              less_than_equal: meetingDate,
            },
          }
        : {}),
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
  rowData,
}: DefaultServerCellComponentProps) {
  const attendanceCount =
    typeof cellData?.totalDocs === 'number'
      ? cellData.totalDocs
      : Array.isArray(cellData?.docs)
        ? cellData.docs.length
        : 0
  const memberCount = await getActiveMemberCount(
    payload,
    rowData?.meetingDate as string | undefined,
  )

  return <MeetingAttendenceCellClient attendanceCount={attendanceCount} memberCount={memberCount} />
}
