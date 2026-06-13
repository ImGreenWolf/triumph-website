import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

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

  const cookieStore = await cookies()

  // Authenticate member
  const authResult = await payload.auth({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })

  if (!authResult.user) {
    redirect(
      `/members/login?redirect=/meetings/${meetingId}/check-in`
    )
  }

  const member = authResult.user

  // Verify meeting exists
  const meeting = await payload.findByID({
    collection: 'meetings',
    id: meetingId,
  })

  if (!meeting) {
    return (
      <div className="p-10">
        Meeting not found.
      </div>
    )
  }

  // Check existing attendance
  const existingAttendance =
    await payload.find({
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
        motivatedBy: null,
        motivationReason: null,
        status: 'present',
      },
    })
  } else {
    // Create new attendance
    await payload.create({
      collection: 'attendance',
      data: {
        member: member.id,
        meeting: meetingId,
        status: 'present',
      },
    })
  }

  return (
    <div className="halftone-background flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow">
        <h1 className="mb-4 text-3xl font-bold">
          Prezență înregistrată
        </h1>

        <p className="text-muted-foreground">
          Ai fost marcat prezent la:
        </p>

        <p className="mt-2 text-xl font-semibold">
          {meeting.meetingDate}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          {new Date(
            meeting.meetingDate
          ).toLocaleString('ro-RO', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </div>
  )
}
