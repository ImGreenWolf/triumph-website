import { NextResponse } from 'next/server'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'

export const runtime = 'nodejs'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024

type PayloadUploadFile = {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

type ProfileUpdateData = Partial<
  Pick<
    User,
    | 'birthday'
    | 'birthdayConfirmed'
    | 'birthdayStoryConsent'
    | 'birthdayStoryImage'
    | 'profilePicture'
  >
>

export async function POST(request: Request) {
  try {
    const payload = await getPayload({
      config: payloadConfig,
    })

    const authHeaders = new Headers(request.headers)
    if (!authHeaders.has('sec-fetch-site')) {
      authHeaders.set('sec-fetch-site', 'same-origin')
    }

    const auth = await payload.auth({
      headers: authHeaders,
    })

    if (!auth.user) {
      return NextResponse.json(
        { message: 'You must be logged in to update your profile.' },
        { status: 401 },
      )
    }

    const member = auth.user as User
    const currentMember = (await payload.findByID({
      collection: 'users',
      depth: 0,
      id: member.id,
    })) as User

    const formData = await request.formData()
    const updateData: ProfileUpdateData = {}

    const birthday = getString(formData, 'birthday')
    if (birthday) {
      const birthdayISO = parseBirthday(birthday)

      if (currentMember.birthday) {
        const currentBirthday = toDateInputValue(currentMember.birthday)

        if (birthday !== currentBirthday) {
          return NextResponse.json(
            { message: 'Birthday can only be set once from the profile page.' },
            { status: 400 },
          )
        }
      } else {
        if (!getBoolean(formData, 'birthdayConfirmed')) {
          return NextResponse.json(
            { message: 'Confirm your birthday before saving it.' },
            { status: 400 },
          )
        }

        updateData.birthday = birthdayISO
        updateData.birthdayConfirmed = true
      }
    }

    updateData.birthdayStoryConsent = getBoolean(formData, 'birthdayStoryConsent')

    const profilePicture = await createMediaFromFormFile({
      alt: `${currentMember.name || currentMember.email} profile picture`,
      fieldName: 'profilePicture',
      formData,
      member,
      payload,
    })

    if (profilePicture) {
      updateData.profilePicture = profilePicture.id
    }

    const birthdayStoryImage = await createMediaFromFormFile({
      alt: `${currentMember.name || currentMember.email} birthday story image`,
      fieldName: 'birthdayStoryImage',
      formData,
      member,
      payload,
    })

    if (birthdayStoryImage) {
      updateData.birthdayStoryImage = birthdayStoryImage.id
    }

    const updatedMember = (await payload.update({
      collection: 'users',
      data: updateData,
      depth: 2,
      id: member.id,
      overrideAccess: false,
      user: member,
    })) as User

    return NextResponse.json({ user: updatedMember })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed.'

    return NextResponse.json({ message }, { status: 400 })
  }
}

async function createMediaFromFormFile(args: {
  alt: string
  fieldName: string
  formData: FormData
  member: User
  payload: Awaited<ReturnType<typeof getPayload>>
}) {
  const file = getFile(args.formData, args.fieldName)
  if (!file) return null

  const uploadFile = await toPayloadUploadFile(file)

  return args.payload.create({
    collection: 'media',
    data: {
      alt: args.alt,
    },
    file: uploadFile,
    overrideAccess: false,
    user: args.member,
  })
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value : null
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === 'true'
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof File === 'undefined' || !(value instanceof File) || value.size === 0) {
    return null
  }

  return value
}

async function toPayloadUploadFile(file: File): Promise<PayloadUploadFile> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image uploads are allowed.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Images must be smaller than 8 MB.')
  }

  return {
    data: Buffer.from(await file.arrayBuffer()),
    mimetype: file.type,
    name: file.name,
    size: file.size,
  }
}

function parseBirthday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Enter a valid birthday.')
  }

  const birthday = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(birthday.getTime())) {
    throw new Error('Enter a valid birthday.')
  }

  const today = new Date()
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )

  if (birthday.getTime() > todayUTC.getTime()) {
    throw new Error('Birthday cannot be in the future.')
  }

  return birthday.toISOString()
}

function toDateInputValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}
