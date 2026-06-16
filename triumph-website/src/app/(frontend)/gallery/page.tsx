import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import payloadConfig from '@payload-config'
import { Camera, Upload } from 'lucide-react'
import { getPayload } from 'payload'

import type { Event, GalleryPhoto, Media, User } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

import GalleryPageClient, { type GalleryPhotoCard } from './page.client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: 'Galeria foto al clubului Interact Bucuresti Triumph.',
  title: 'Galerie | Interact Bucuresti Triumph',
}

export default async function GalleryPage() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  const auth = token
    ? await payload.auth({
        headers: new Headers({
          cookie: cookieStore.toString(),
        }),
      })
    : null

  const user = auth?.user as User | undefined
  const galleryPhotos = await payload.find({
    collection: 'gallery-photos',
    depth: 2,
    limit: 200,
    overrideAccess: false,
    sort: '-submittedAt',
    user,
    where: {
      status: {
        equals: 'approved',
      },
    },
  })

  const photos = (galleryPhotos.docs as GalleryPhoto[]).flatMap((photo) => {
    const media = photo.photo
    if (!media || typeof media !== 'object') return []

    const event = photo.event && typeof photo.event === 'object' ? (photo.event as Event) : null
    const uploader =
      photo.uploadedBy && typeof photo.uploadedBy === 'object' ? (photo.uploadedBy as User) : null

    return [
      {
        caption: photo.caption || '',
        eventName: event?.name || '',
        id: photo.id,
        imageAlt: (media as Media).alt || photo.caption || '',
        imageUrl: getMediaUrl((media as Media).url, (media as Media).updatedAt),
        submittedAt: photo.submittedAt || photo.createdAt,
        uploadedBy: uploader?.name || uploader?.email || '',
        visibility: photo.visibility,
      },
    ]
  })

  return (
    <main className="halftone-background min-h-screen bg-background pb-24 pt-32 text-foreground">
      <section className="container relative pb-12 md:pb-16">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            <Camera aria-hidden className="size-4" />
            Galeria Triumph
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Pozele Clubului</h1>
        </div>

        {user && (
          <Link
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90"
            href="/members/gallery/upload"
          >
            <Upload className="size-4" />
            Trimite Poze
          </Link>
        )}
      </section>

      <section className="container">
        <GalleryPageClient canViewPrivate={Boolean(user)} photos={photos as GalleryPhotoCard[]} />
      </section>
    </main>
  )
}
