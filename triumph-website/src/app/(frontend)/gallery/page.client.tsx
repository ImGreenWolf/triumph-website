'use client'

import { useMemo, useState } from 'react'

import { CalendarDays, Lock, UserRound, Users } from 'lucide-react'
import Select from 'react-select'

import { useLightbox } from '@/components/ui/LightboxComponent'
import { getContrastTextColor } from '@/utilities/eventDisplay'

export type GalleryEventOption = {
  imageUrl?: string
  label: string
  value: string
  primaryColor?: string | null
  secondaryColor?: string | null
}

export type GalleryPhotoCard = {
  caption: string
  eventId: string
  eventName: string
  id: string
  imageAlt: string
  imageSizes: string
  imageSrcSet: string
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
    label: 'Publice',
    value: 'public',
  },
  {
    label: 'Mixte',
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
  events: GalleryEventOption[]
}) {
  const { canViewPrivate, photos, events } = props
  const [mode, setMode] = useState<GalleryMode>('public')
  const [selectedEvent, setSelectedEvent] = useState<GalleryEventOption | null>(null)
  const { openImage } = useLightbox()
  const visiblePhotos = useMemo(() => {
    const photosForMode = photos.filter((photo) => {
      if (mode === 'public') return photo.visibility === 'public'
      if (mode === 'private') return photo.visibility === 'private'

      return true
    })

    if (!selectedEvent) return photosForMode
    if (selectedEvent.value === '__untagged') {
      return photosForMode.filter((photo) => !photo.eventId)
    }

    return photosForMode.filter((photo) => photo.eventId === selectedEvent.value)
  }, [mode, photos, selectedEvent])

  const eventOptions = useMemo(
    () => [{ label: 'Fara eveniment', value: '__untagged' }, ...events],
    [events],
  )

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Poze</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {visiblePhotos.length} {visiblePhotos.length === 1 ? 'photo' : 'photos'}
          </h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <Select
            aria-label="Filtreaza dupa eveniment"
            className="w-full text-sm text-black sm:w-64"
            formatOptionLabel={(option) => <EventOption option={option} />}
            inputId="gallery-event-filter-input"
            instanceId="gallery-event-filter"
            isClearable
            isSearchable
            noOptionsMessage={() => 'Niciun eveniment'}
            onChange={setSelectedEvent}
            options={eventOptions}
            placeholder="Toate evenimentele"
            value={selectedEvent}
          />
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
      </div>

      {visiblePhotos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePhotos.map((photo) => (
            <article
              className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
              style={{
                backgroundColor: events.find((ev) => ev.value === photo.eventId)?.primaryColor!,
                color: getContrastTextColor(
                  events.find((ev) => ev.value === photo.eventId)?.primaryColor!,
                ),
              }}
              key={photo.id}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={photo.imageAlt}
                  className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  decoding="async"
                  loading="lazy"
                  sizes={photo.imageSizes}
                  src={photo.imageUrl}
                  srcSet={photo.imageSrcSet}
                  onClick={() =>
                    openImage({
                      src: photo.imageUrl,
                      alt: photo.imageAlt,
                    })
                  }
                />
                <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2">
                  {mode === 'mixed' && (
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      {photo.visibility === 'private' ? (
                        <Lock className="size-3" />
                      ) : (
                        <Users className="size-3" />
                      )}
                      {photo.visibility === 'private' ? 'Members' : 'Public'}
                    </div>
                  )}
                  {(photo.eventName && !selectedEvent) && (
                    <div className="ml-auto inline-flex min-w-0 max-w-[75%] items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                      <CalendarDays aria-hidden className="size-3 shrink-0" />
                      <span className="truncate">{photo.eventName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 p-4">
                {photo.caption && <p className="text-sm leading-6">{photo.caption}</p>}

                <div className="grid gap-2 text-sm">
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

function EventOption({ option }: { option: GalleryEventOption }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {option.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-8 shrink-0 rounded object-cover"
          decoding="async"
          loading="lazy"
          src={option.imageUrl}
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded bg-neutral-100 text-neutral-500">
          <CalendarDays aria-hidden className="size-4" />
        </span>
      )}
      <span className="truncate">{option.label}</span>
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
