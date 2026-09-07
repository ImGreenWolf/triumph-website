import { redirect } from 'next/navigation'

import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import { getMeetingCheckInAttendanceStatus } from '@/utilities/meetingTime'

export default async function CheckInPage({
  params,
}: {
  params: Promise<{
    meetingId: string
  }>
}) {
  const { meetingId } = await params

  const payload = await getPayload({
    config: payloadConfig,
  })

  // Authenticate member
  const authResult = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })

  if (!authResult.user) {
    redirect(`/members/login?redirect=/members/meetings/${meetingId}/check-in`)
  }

  const member = authResult.user

  // Verify meeting exists
  const meeting = await payload.findByID({
    collection: 'meetings',
    id: meetingId,
  })

  if (!meeting) {
    return <div className="p-10">Meeting not found.</div>
  }

  const attendanceStatus = getMeetingCheckInAttendanceStatus(meeting)

  if (!attendanceStatus) {
    return (
      <div className="halftone-background flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl bg-card p-8 shadow">
          <h1 className="mb-4 text-3xl font-bold">Check-in închis</h1>
          <p className="text-muted-foreground">
            Fereastra de check-in pentru această ședință nu mai este disponibilă.
          </p>
        </div>
      </div>
    )
  }

  // Check existing attendance
  const existingAttendance = await payload.find({
    collection: 'attendance',
    where: {
      and: [
        {
          member: {
            equals: member.id,
          },
        },
        {
          meeting: {
            equals: meetingId,
          },
        },
      ],
    },
    limit: 1,
  })

  // Update existing
  if (existingAttendance.docs.length > 0) {
    await payload.update({
      collection: 'attendance',
      id: existingAttendance.docs[0].id,
      data: {
        issuedBy: null,
        motivationReason: null,
        status: attendanceStatus,
      },
    })
  } else {
    // Create new attendance
    await payload.create({
      collection: 'attendance',
      data: {
        member: member.id,
        meeting: meetingId,
        status: attendanceStatus,
      },
    })
  }

  await payload.delete({
    collection: 'absence-motivations',
    where: {
      and: [
        {
          member: {
            equals: member.id,
          },
        },
        {
          meeting: {
            equals: meetingId,
          },
        },
      ],
    },
  })

  return (
    <div className="halftone-background flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow">
        <h1 className="mb-4 text-3xl font-bold">
          {attendanceStatus === 'late' ? 'Întârziere înregistrată' : 'Prezență înregistrată'}
        </h1>

        <p className="text-muted-foreground">
          {attendanceStatus === 'late'
            ? 'Ai fost marcat întârziat la:'
            : 'Ai fost marcat prezent la:'}
        </p>

        <p className="mt-2 text-xl font-semibold">{meeting.meetingDate}</p>

        <p className="mt-4 text-sm text-muted-foreground">
          {new Date(meeting.meetingDate).toLocaleString('ro-RO', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </div>
  )
}
