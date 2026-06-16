'use client'

import { useMemo, useState } from 'react'

import { CalendarDays, Lock, UserRound, Users } from 'lucide-react'

export type GalleryPhotoCard = {
  caption: string
  eventName: string
  id: string
  imageAlt: string
  imageUrl: string
  submittedAt: string
  uploadedBy: string
  visibility: 'private' | 'public'
}

type GalleryMode = 'mixed' | 'private' | 'public'

const modeOptions: {
  label: string
  value: GalleryMode
}[] = [
  {
    label: 'Public',
    value: 'public',
  },
  {
    label: 'Mixed',
    value: 'mixed',
  },
  {
    label: 'Private',
    value: 'private',
  },
]

export default function GalleryPageClient(props: {
  canViewPrivate: boolean
  photos: GalleryPhotoCard[]
}) {
  const { canViewPrivate, photos } = props
  const [mode, setMode] = useState<GalleryMode>('public')

  const visiblePhotos = useMemo(() => {
    if (mode === 'public') return photos.filter((photo) => photo.visibility === 'public')
    if (mode === 'private') return photos.filter((photo) => photo.visibility === 'private')

    return photos
  }, [mode, photos])

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Photos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {visiblePhotos.length} {visiblePhotos.length === 1 ? 'photo' : 'photos'}
          </h2>
        </div>

        <div className="inline-grid w-full grid-cols-3 rounded-md border border-border bg-card p-1 sm:w-auto">
          {modeOptions.map((option) => {
            const disabled = !canViewPrivate && option.value !== 'public'

            return (
              <button
                className={`h-9 rounded px-3 text-sm font-semibold transition ${
                  mode === option.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                } disabled:pointer-events-none disabled:opacity-45`}
                disabled={disabled}
                key={option.value}
                onClick={() => setMode(option.value)}
                type="button"
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {visiblePhotos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePhotos.map((photo) => (
            <article
              className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
              key={photo.id}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={photo.imageAlt}
                  className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  src={photo.imageUrl}
                />
                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  {photo.visibility === 'private' ? (
                    <Lock className="size-3" />
                  ) : (
                    <Users className="size-3" />
                  )}
                  {photo.visibility === 'private' ? 'Members' : 'Public'}
                </div>
              </div>

              <div className="grid gap-3 p-4">
                {photo.caption && <p className="text-sm leading-6">{photo.caption}</p>}

                <div className="grid gap-2 text-sm text-muted-foreground">
                  {photo.eventName && (
                    <p className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-accent" />
                      {photo.eventName}
                    </p>
                  )}

                  {photo.uploadedBy && (
                    <p className="inline-flex items-center gap-2">
                      <UserRound className="size-4 text-accent" />
                      {photo.uploadedBy}
                    </p>
                  )}

                  <p>{formatDate(photo.submittedAt)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-card-foreground">
          <CameraEmptyState />
        </div>
      )}
    </div>
  )
}

function CameraEmptyState() {
  return (
    <div>
      <Users aria-hidden className="size-10 text-accent" strokeWidth={1.5} />
      <h3 className="mt-5 text-2xl font-bold">No photos yet.</h3>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}
