'use server'

import payloadConfig from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import type { Attendance, User } from '@/payload-types'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import { getMeetingCheckInAttendanceStatus, getMeetingWindow } from '@/utilities/meetingTime'
import { getRotaryYearRange, getRotaryYearStart } from '@/utilities/rotaryYear'

type ScannedUser = Pick<User, 'email' | 'id' | 'name'>

type ScanResponse = {
  counted?: boolean
  err?: string
  status?: Attendance['status']
  user?: ScannedUser
}

export async function onCodeScanned(url: string): Promise<ScanResponse> {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })

  if (!auth.user || !auth.permissions.canAccessAdmin) {
    return { err: 'Nu ai permisiunea de a înregistra prezența.' }
  }

  const operator = auth.user as User

  const id = getMemberIdFromScan(url)

  if (!id) return { err: 'Cod invalid!' }

  let user: User

  try {
    user = (await payload.findByID({
      collection: 'users',
      id,
      overrideAccess: false,
      user: operator,
    })) as User
  } catch {
    return { err: 'Membrul nu a fost găsit.' }
  }

  const meeting = await getTodayMeeting()

  if (!meeting) return { err: 'Nu există o ședință disponibilă pentru check-in.' }

  const attendanceStatus = getMeetingCheckInAttendanceStatus(meeting)

  if (!attendanceStatus) {
    return { err: 'Fereastra de check-in pentru această ședință s-a închis.' }
  }

  const scannedUser = {
    email: user.email,
    id: user.id,
    name: user.name,
  }

  const existingAttendance = await payload.find({
    collection: 'attendance',
    where: {
      and: [
        {
          meeting: {
            equals: meeting.id,
          },
        },
        {
          member: {
            equals: user.id,
          },
        },
      ],
    },
  })

  const existingRecord = existingAttendance.docs[0] as Attendance | undefined

  if (existingRecord?.status === 'present' || existingRecord?.status === 'late') {
    return {
      err: 'Prezența este deja înregistrată pentru această ședință.',
      status: existingRecord.status,
      user: scannedUser,
    }
  }

  const deletedMotivationsDocs = await payload.delete({
    collection: 'absence-motivations',
    where: {
      and: [
        {
          meeting: {
            equals: meeting.id,
          },
        },
        {
          member: {
            equals: user.id,
          },
        },
      ],
    },
  })
  const motivationCleared = deletedMotivationsDocs.docs.length !== 0

  if (existingRecord) {
    await payload.update({
      collection: 'attendance',
      id: existingRecord.id,
      data: {
        issuedBy: operator.id,
        motivationReason: null,
        status: attendanceStatus,
      },
    })
  } else {
    await payload.create({
      collection: 'attendance',
      data: {
        meeting: meeting.id,
        member: user.id,
        status: attendanceStatus,
        issuedBy: operator.id,
      },
    })
  }

  revalidatePath('/members/check-in')
  return {
    counted: true,
    err: motivationCleared ? 'Motivarea a fost ștearsă.' : undefined,
    status: attendanceStatus,
    user: scannedUser,
  }
}

function getMemberIdFromScan(value: string) {
  try {
    return new URL(value).searchParams.get('member')
  } catch {
    return null
  }
}

export async function getTodayMeeting() {
  const payload = await getPayload({ config: payloadConfig })
  const now = new Date()
  const dayEnd = new Date(now)

  dayEnd.setHours(24, 0, 0, 0)

  const meetingsDocs = await payload.find({
    collection: 'meetings',
    where: {
      meetingDate: {
        greater_than_equal: getRotaryYearRange(getRotaryYearStart(now)).start.toISOString(),
        less_than: dayEnd.toISOString(),
      },
    },
    sort: 'meetingDate',
    limit: 20,
    depth: 0,
  })

  return meetingsDocs.docs.find((meeting) => getMeetingWindow(meeting, now).status !== 'expired')
}
