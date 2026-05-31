import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

import {
  AbsenceMotivation,
  Attendance,
  Meeting,
  User,
} from '@/payload-types'
import { getMemberAttendanceSummary } from '@/utilities/memberAttendance'

import MotivateAbsenceDialog from './MotivateAbsenceDialog'
import PageClient from './page.client'

type Props = {
  params: Promise<{
    meetingId: string
  }>
}

export default async function MeetingPage(
  props: Props,
) {
  const { meetingId } = await props.params

  const payload = await getPayload({
    config: payloadConfig,
  })

  // Get meeting
  const meeting = (await payload.findByID({
    collection: 'meetings',
    id: meetingId,
    depth: 2,
  })) as Meeting

  if (!meeting) {
    redirect('/404')
  }

  const meetingDate = new Date(
    meeting.meetingDate,
  )

  const now = new Date()

  const hasTakenPlace = meetingDate <= now

  // Get attendance records
  const attendanceDocs = await payload.find({
    collection: 'attendance',
    where: {
      meeting: {
        equals: meetingId,
      },
    },
    limit: 1000,
    depth: 1,
  })

  const attendance =
    attendanceDocs.docs as Attendance[]

  // Participants
  const participants = attendance.filter(
    (record) => record.status === 'present',
  )

  // Logged in member
  const cookieStore = await cookies()

  const authResult = await payload.auth({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })

  const member =
    authResult.user as User | null

  const [memberAttendanceSummary, motivationDocs] = member
    ? await Promise.all([
        getMemberAttendanceSummary(payload, member),
        payload.find({
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
          limit: 1,
          overrideAccess: false,
          user: member,
        }),
      ])
    : [null, null]
  const existingMotivation = motivationDocs?.docs[0] as AbsenceMotivation | undefined

  // Current member attendance
  const memberAttendance = member
    ? attendance.find((record) => {
        const attendanceMember =
          typeof record.member === 'object'
            ? record.member.id
            : record.member

        return attendanceMember === member.id
      })
    : null
  const memberAttendanceLabel = !member
    ? 'Autentifică-te'
    : memberAttendance
      ? memberAttendance.status === 'present'
        ? 'Prezent'
        : memberAttendance.status === 'motivated'
          ? 'Absent motivat'
          : memberAttendance.status === 'late'
            ? 'Întârziat'
            : 'Absent'
      : hasTakenPlace
        ? 'Absent'
        : 'Neînregistrată'

  return (
    <div className="min-h-screen bg-background">
      <PageClient />
      <div className="mx-auto max-w-5xl px-6 py-24">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-sm text-muted-foreground">
            Şedința
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            {meetingDate.toLocaleString(
              'ro-RO',
              {
                dateStyle: 'full',
                timeStyle: 'short',
              },
            )}
          </h1>

          <p className="mt-4 text-muted-foreground">
            
          </p>
        </div>

        {/* Meeting Status */}
        {!hasTakenPlace && (
          <div className="mb-8 rounded-xl border bg-card p-6">
            <h2 className="mb-2 text-xl font-semibold">
              Întâlnirea nu a avut loc încă
            </h2>

            <p className="text-muted-foreground">
              Această întâlnire este
              programată pentru{' '}
              {meetingDate.toLocaleString(
                'ro-RO',
                {
                  dateStyle: 'full',
                  timeStyle: 'short',
                },
              )}
              .
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Participanți
            </p>

            <p className="mt-2 text-3xl font-bold">
              {participants.length}
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Data întâlnirii
            </p>

            <p className="mt-2 text-lg font-semibold">
              {meetingDate.toLocaleDateString(
                'ro-RO',
                {
                  dateStyle: 'long',
                },
              )}
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Prezența ta
            </p>

            {member ? (
              <p className="mt-2 text-lg font-semibold">
                {memberAttendanceLabel}
              </p>
            ) : (
              <p className="mt-2 text-lg font-semibold text-muted-foreground">
                {memberAttendanceLabel}
              </p>
            )}
          </div>
        </div>

        {member && memberAttendanceSummary && (
          <div className="mb-8">
            <MotivateAbsenceDialog
              absenceCount={memberAttendanceSummary.absentMeetings}
              absencePercentage={memberAttendanceSummary.absencePercentage}
              attendancePercentage={memberAttendanceSummary.attendancePercentage}
              existingRequest={
                existingMotivation
                  ? {
                      memberMessage: existingMotivation.memberMessage,
                      secretaryMessage: existingMotivation.secretaryMessage,
                      status: existingMotivation.status,
                    }
                  : null
              }
              meetingId={meetingId}
            />
          </div>
        )}

        {/* Meeting Notes */}
        <div className="rounded-2xl bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold">
            Notițele întâlnirii
          </h2>

          {hasTakenPlace ? (
            meeting.notes ? (
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                {/* Replace with your RichText renderer */}
                {typeof meeting.notes ===
                'string' ? (
                  <p>{meeting.notes}</p>
                ) : (
                  <pre>
                    {JSON.stringify(
                      meeting.notes,
                      null,
                      2,
                    )}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Nu există notițe pentru
                această întâlnire.
              </p>
            )
          ) : (
            <p className="text-muted-foreground">
              Notițele întâlnirii vor fi
              disponibile după desfășurarea
              acesteia.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
