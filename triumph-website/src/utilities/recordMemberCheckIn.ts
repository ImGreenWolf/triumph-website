import type { Payload, Where } from 'payload'
import type { Attendance, User } from '@/payload-types'
import { getMeetingCheckInAttendanceStatus } from './meetingTime'

export async function recordMemberCheckIn(payload: Payload, member: User, meetingId: string) {
  const meeting = await payload.findByID({
    collection: 'meetings',
    id: meetingId,
    depth: 0,
    select: { meetingDate: true, durationMinutes: true, endedBufferMinutes: true },
    user: member,
    overrideAccess: false,
    disableErrors: true,
  })
  if (!meeting) return { error: 'Întâlnirea nu a fost găsită.', statusCode: 404 } as const
  const status = getMeetingCheckInAttendanceStatus(meeting)
  if (!status)
    return {
      error: 'Fereastra de check-in pentru această ședință s-a închis.',
      statusCode: 409,
    } as const

  const where: Where = {
    and: [{ member: { equals: member.id } }, { meeting: { equals: meetingId } }],
  }
  const findExisting = async () =>
    (
      await payload.find({
        collection: 'attendance',
        where,
        limit: 1,
        depth: 0,
        user: member,
        overrideAccess: false,
      })
    ).docs[0]
  let attendance = await findExisting()

  if (attendance?.status !== 'present' && attendance?.status !== 'late') {
    if (attendance) {
      attendance = await payload.update({
        collection: 'attendance',
        id: attendance.id,
        user: member,
        overrideAccess: false,
        data: { issuedBy: null, motivationReason: null, status },
      })
    } else {
      try {
        attendance = await payload.create({
          collection: 'attendance',
          user: member,
          overrideAccess: false,
          data: { member: member.id, meeting: meetingId, status },
        })
      } catch (error) {
        // The unique member/meeting index handles concurrent tabs and retries.
        // Only accept a competing successful check-in; propagate other failures.
        attendance = await findExisting()
        if (attendance?.status !== 'present' && attendance?.status !== 'late') throw error
      }
    }
  }

  // Members cannot delete motivations through the public API. This service may
  // clear only this authenticated member's motivation for the verified meeting.
  await payload.delete({
    collection: 'absence-motivations',
    where,
    user: member,
    overrideAccess: true,
  })
  return {
    status: attendance.status as Extract<Attendance['status'], 'present' | 'late'>,
    meetingDate: meeting.meetingDate,
  } as const
}
