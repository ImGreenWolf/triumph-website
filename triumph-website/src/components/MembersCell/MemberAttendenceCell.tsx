import { cache } from 'react'

import type { DefaultServerCellComponentProps, Payload } from 'payload'

import type { User } from '@/payload-types'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'

import MemberAttendenceCell from './MemberAttendenceCell.client'

const getCachedAttendanceSummary = cache(async (payload: Payload, member: User) => {
  return getMemberAttendanceSummary(payload, member)
})

export default async function MeetingAttendenceCell({
  payload,
  rowData,
}: DefaultServerCellComponentProps) {
  const summary = await getCachedAttendanceSummary(payload, rowData as User)
  const attendanceCount = summary.presentMeetings + summary.lateMeetings
  const meetingsCount = summary.totalMeetings

  return <MemberAttendenceCell attendanceCount={attendanceCount} meetingsCount={meetingsCount} />
}
