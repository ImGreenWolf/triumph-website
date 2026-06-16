import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import payloadConfig from '@payload-config'
import heicConvert from 'heic-convert'
import { getPayload } from 'payload'
import sharp from 'sharp'

import type { User } from '@/payload-types'
import { boardRoles, type BoardRole } from '@/utilities/membersAccess'

export const runtime = 'nodejs'

const MAX_IMAGE_SIZE = 12 * 1024 * 1024
const MAX_WEBP_WIDTH = 1920
const WEBP_QUALITY = 82
const HEIF_EXTENSIONS = ['.heic', '.heif', '.hif']
const HEIF_MIME_TYPES = new Set([
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
])
const SUPPORTED_IMAGE_EXTENSIONS = [
  '.avif',
  '.gif',
  ...HEIF_EXTENSIONS,
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  ...HEIF_MIME_TYPES,
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
])

type PayloadUploadFile = {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({
      config: payloadConfig,
    })

    const cookieStore = await cookies()
    const auth = await payload.auth({
      headers: new Headers({
        cookie: cookieStore.toString(),
      }),
    })

    if (!auth.user) {
      return NextResponse.json(
        { message: 'You must be logged in to submit photos.' },
        { status: 401 },
      )
    }

    const member = auth.user as User
    const isBoardMember = boardRoles.includes(member.role as BoardRole)
    const formData = await request.formData()
    const files = formData.getAll('photos')
    const visibility = getVisibility(formData)
    const caption = getString(formData, 'caption')?.trim() || undefined
    const event = getString(formData, 'event') || undefined

    if (!files.length) {
      return NextResponse.json({ message: 'Select at least one photo.' }, { status: 400 })
    }

    const createdPhotos = []

    for (const fileValue of files) {
      const file = getFile(fileValue)
      if (!file) continue

      const uploadFile = await toPayloadUploadFile(file)
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: caption || `${member.name || member.email} gallery photo`,
        },
        file: uploadFile,
        overrideAccess: false,
        user: member,
      })

      const galleryPhoto = await payload.create({
        collection: 'gallery-photos',
        data: {
          caption,
          event,
          photo: media.id,
          status: visibility === 'private' ? 'approved' : 'pending',
          visibility,
        },
        overrideAccess: false,
        user: member,
      })

      createdPhotos.push(galleryPhoto)
    }

    if (!createdPhotos.length) {
      return NextResponse.json({ message: 'Only image uploads are allowed.' }, { status: 400 })
    }

    return NextResponse.json({
      count: createdPhotos.length,
      message:
        visibility === 'public' && !isBoardMember
          ? 'Photos submitted for public gallery review.'
          : visibility === 'public'
            ? 'Photos added to the public gallery.'
            : 'Photos added to the members gallery.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The photos could not be uploaded.'

    return NextResponse.json({ message }, { status: 400 })
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value : null
}

function getVisibility(formData: FormData) {
  return getString(formData, 'visibility') === 'private' ? 'private' : 'public'
}

function getFile(value: FormDataEntryValue) {
  if (typeof File === 'undefined' || !(value instanceof File) || value.size === 0) {
    return null
  }

  return value
}

async function toPayloadUploadFile(file: File): Promise<PayloadUploadFile> {
  if (!isSupportedImage(file)) {
    throw new Error('Only JPEG, PNG, WebP, AVIF, GIF, TIFF, or HEIC photos are allowed.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Images must be smaller than 12 MB.')
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer())
    const sourceBuffer = isHEIFImage(file) ? await convertHEIFToJPEG(inputBuffer) : inputBuffer
    const convertedImage = await sharp(sourceBuffer, {
      failOn: 'none',
    })
      .rotate()
      .resize({
        width: MAX_WEBP_WIDTH,
        withoutEnlargement: true,
      })
      .webp({
        effort: 5,
        quality: WEBP_QUALITY,
      })
      .toBuffer({
        resolveWithObject: true,
      })

    return {
      data: convertedImage.data,
      mimetype: 'image/webp',
      name: toWebPFileName(file.name),
      size: convertedImage.info.size,
    }
  } catch (error) {
    if (isHEIFImage(file)) {
      throw new Error('The HEIC/HEIF photo could not be converted. Try exporting it as JPEG first.')
    }

    throw new Error('The image could not be converted to WebP.')
  }
}

async function convertHEIFToJPEG(inputBuffer: Buffer) {
  const jpegBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92,
  })

  return Buffer.from(jpegBuffer)
}

function isSupportedImage(file: File) {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) return true

  const fileName = file.name.toLowerCase()
  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
}

function isHEIFImage(file: File) {
  if (HEIF_MIME_TYPES.has(file.type)) return true

  const fileName = file.name.toLowerCase()
  return HEIF_EXTENSIONS.some((extension) => fileName.endsWith(extension))
}

function toWebPFileName(fileName: string) {
  const safeName = fileName.trim() || 'gallery-photo'
  const extensionIndex = safeName.lastIndexOf('.')
  const baseName = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName

  return `${baseName}.webp`
}
