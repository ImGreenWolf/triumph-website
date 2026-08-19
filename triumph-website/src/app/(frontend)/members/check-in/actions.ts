'use server'

import payloadConfig from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'

type ScannedUser = Pick<User, 'email' | 'id' | 'name'>

type ScanResponse = {
  counted?: boolean
  err?: string
  user?: ScannedUser
}

export async function onCodeScanned(
  url: string,
  _timestamp: number,
  scannerUser: string,
): Promise<ScanResponse> {
  const payload = await getPayload({ config: payloadConfig })

  const id = getMemberIdFromScan(url)

  if (!id) return { err: 'Cod invalid!' }

  let user: User

  try {
    user = (await payload.findByID({
      collection: 'users',
      id,
    })) as User
  } catch {
    return { err: 'Membrul nu a fost găsit.' }
  }

  const meeting = await getTodayMeeting()

  if (!meeting) return { err: 'Nu există ședință azi!' }

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

  if (existingAttendance.totalDocs !== 0) {
    return { err: 'Ești deja prezent la această ședință!' }
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
  let err
  if (deletedMotivationsDocs.docs.length !== 0) err = 'Motivare ștearsă'

  await payload.create({
    collection: 'attendance',
    data: {
      meeting: meeting.id,
      member: user.id,
      status: 'present',
      issuedBy: scannerUser,
    },
  })
  revalidatePath('/members/check-in')
  return { counted: true, user: scannedUser, err }
}

function getMemberIdFromScan(value: string) {
  try {
    return new URL(value).searchParams.get('member')
  } catch {
    return null
  }
}

export async function getTodayMeeting(includeAttendance = false, includeMotivations = false) {
  const payload = await getPayload({ config: payloadConfig })
  const dayStart = new Date()
  const dayEnd = new Date()

  dayStart.setUTCHours(0, 0, 0, 0)
  dayEnd.setUTCHours(24, 0, 0, 0)

  const meetingsDocs = await payload.find({
    collection: 'meetings',
    where: {
      meetingDate: {
        greater_than: dayStart.toISOString(),
        less_than: dayEnd.toISOString(),
      },
    },
    sort: 'meetingDate',
    limit: 1,
    depth: 2,
    joins: {
      attendance: includeAttendance && { count: true },
      absenceMotivations: includeMotivations && { count: true },
    },
  })

  if (meetingsDocs.totalDocs === 0) {
    return undefined
  }
  return meetingsDocs.docs[0]
}
