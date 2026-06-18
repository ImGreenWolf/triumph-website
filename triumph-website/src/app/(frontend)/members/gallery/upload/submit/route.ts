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
  '.heic',
  '.heif',
  '.hif',
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
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
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

type PhotoUploadMetadata = {
  caption?: string
  event?: string
  visibility: 'private' | 'public'
}

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
        { message: 'You must be logged in to submit photos.' },
        { status: 401 },
      )
    }

    const member = auth.user as User
    const isBoardMember = boardRoles.includes(member.role as BoardRole)
    const formData = await request.formData()
    const fileValues = formData.getAll('photos')

    if (!fileValues.length) {
      return NextResponse.json({ message: 'Select at least one photo.' }, { status: 400 })
    }

    const files = fileValues.map((fileValue) => {
      const file = getFile(fileValue)
      if (!file) throw new Error('Every upload must be a valid image file.')

      return file
    })
    const photoMetadata = getPhotoMetadata(formData, files.length)

    const createdPhotos = []

    for (const [index, file] of files.entries()) {
      const metadata = photoMetadata[index]
      const uploadFile = await toPayloadUploadFile(file)
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: metadata.caption || `${member.name || member.email} gallery photo`,
        },
        file: uploadFile,
        overrideAccess: false,
        user: member,
      })

      const galleryPhoto = await payload.create({
        collection: 'gallery-photos',
        data: {
          caption: metadata.caption,
          event: metadata.event,
          photo: media.id,
          status: metadata.visibility === 'private' ? 'approved' : 'pending',
          visibility: metadata.visibility,
        },
        overrideAccess: false,
        user: member,
      })

      createdPhotos.push(galleryPhoto)
    }

    if (!createdPhotos.length) {
      return NextResponse.json({ message: 'Only image uploads are allowed.' }, { status: 400 })
    }

    const hasPendingPublicPhotos =
      !isBoardMember && photoMetadata.some((metadata) => metadata.visibility === 'public')

    return NextResponse.json({
      count: createdPhotos.length,
      message: hasPendingPublicPhotos
        ? `${createdPhotos.length} photos uploaded. Public photos are pending review.`
        : `${createdPhotos.length} photos added to the gallery.`,
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

function getPhotoMetadata(formData: FormData, fileCount: number): PhotoUploadMetadata[] {
  const rawMetadata = getString(formData, 'photoMetadata')
  if (!rawMetadata) throw new Error('Photo metadata is required.')

  let parsedMetadata: unknown

  try {
    parsedMetadata = JSON.parse(rawMetadata)
  } catch {
    throw new Error('Photo metadata is invalid.')
  }

  if (!Array.isArray(parsedMetadata) || parsedMetadata.length !== fileCount) {
    throw new Error('Each uploaded photo must have matching metadata.')
  }

  return parsedMetadata.map((metadata, index) => normalizePhotoMetadata(metadata, index))
}

function normalizePhotoMetadata(metadata: unknown, index: number): PhotoUploadMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`Photo ${index + 1} metadata is invalid.`)
  }

  const values = metadata as Record<string, unknown>
  const caption = typeof values.caption === 'string' ? values.caption.trim() : ''
  const event = typeof values.event === 'string' ? values.event.trim() : ''

  if (caption.length > 500) {
    throw new Error(`Photo ${index + 1} caption must be 500 characters or fewer.`)
  }

  if (values.visibility !== 'private' && values.visibility !== 'public') {
    throw new Error(`Photo ${index + 1} privacy setting is invalid.`)
  }

  return {
    caption: caption || undefined,
    event: event || undefined,
    visibility: values.visibility,
  }
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
