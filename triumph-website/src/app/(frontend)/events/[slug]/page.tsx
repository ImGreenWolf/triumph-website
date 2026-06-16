import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { EventHero } from '@/heros/EventHero'
import type { Event, GalleryPhoto, Media as MediaType, User } from '@/payload-types'
import {
  getContrastTextColor,
  getEventLocation,
  getGoogleMapsURL,
  isEventCompleted,
} from '@/utilities/eventDisplay'
import {
  formatCompactEventDayLabel,
  formatEventDayLabel,
  formatEventSlotLabel,
  getEventSlotAvailability,
} from '@/utilities/eventRegistration'
import { generateMeta } from '@/utilities/generateMeta'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import configPromise from '@payload-config'
import {
  CalendarDays,
  ExternalLink,
  HandHelping,
  HeartHandshake,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { cookies, draftMode } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'
import EventPhotoBoard, {
  type EventPhotoBoardImage,
  type EventPhotoBoardMode,
} from './EventPhotoBoard.client'
import PageClient from './page.client'
import SignupForm from './SignupForm'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const events = await payload.find({
    collection: 'events',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return events.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Event({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = `/events/${decodedSlug}`
  const event = await queryEventBySlug({ slug: decodedSlug })

  if (!event) return <PayloadRedirects url={url} />

  const payload = await getPayload({ config: configPromise })
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
  const [registrations, galleryPhotos] = await Promise.all([
    payload.find({
      collection: 'event-registrations',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      select: {
        day: true,
        slot: true,
        status: true,
      },
      where: {
        event: {
          equals: event.id,
        },
      },
    }),
    payload.find({
      collection: 'gallery-photos',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      pagination: false,
      sort: '-submittedAt',
      user,
      where: {
        event: {
          equals: event.id,
        },
        status: {
          equals: 'approved',
        },
      },
    }),
  ])
  const slotAvailability = getEventSlotAvailability({
    event,
    registrations: registrations.docs,
  })
  const participantsCount = registrations.docs.filter(
    (registration) => registration.status !== 'cancelled',
  ).length
  const accentColor = event.useColors && event.secondaryColor ? event.secondaryColor : '#00a2e0'
  const backgroundColor = event.useColors && event.primaryColor ? event.primaryColor : undefined
  const eventDays = event.days?.filter((day) => day.eventDate) ?? []
  const compactProgram = eventDays.length > 3
  const location = getEventLocation(event.location)
  const googleMapsURL = getGoogleMapsURL(location)
  const inspoboardItems = getInspoboardItems(event.inspoboard)
  const galleryItems = getGalleryItems(galleryPhotos.docs as GalleryPhoto[])
  const photoBoardDefaultMode: EventPhotoBoardMode =
    galleryItems.length > 0 && (isEventCompleted(event) || inspoboardItems.length === 0)
      ? 'gallery'
      : 'inspoboard'

  return (
    <article
      className="halftone-background bg-background text-foreground"
      style={
        {
          '--event-accent': accentColor,
          '--halftone-color': accentColor,
          ...(backgroundColor
            ? {
                backgroundColor,
                color: getContrastTextColor(backgroundColor),
              }
            : {}),
        } as CSSProperties
      }
    >
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      <EventHero event={event} />

      <main className="container py-12 md:py-16">
        <div
          className={
            event.private
              ? 'grid'
              : 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:gap-14'
          }
        >
          <div className="min-w-0 space-y-4">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.72fr)]">
              <DetailCard accentColor={accentColor} icon={CalendarDays} label="Program">
                <div className={compactProgram ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
                  {eventDays.map((day) =>
                    day.eventDate ? (
                      <div
                        className={
                          compactProgram ? 'rounded-lg bg-background/10 px-2.5 py-2' : undefined
                        }
                        key={day.id || day.eventDate}
                      >
                        <p
                          className={
                            compactProgram ? 'text-xs font-bold capitalize' : 'font-bold capitalize'
                          }
                        >
                          {compactProgram
                            ? formatCompactEventDayLabel(day.eventDate)
                            : formatEventDayLabel(day.eventDate)}
                        </p>
                        {compactProgram ? (
                          <p className="mt-0.5 text-[11px] leading-4 text-card-foreground/60">
                            {formatSlotCount(day.slots?.length ?? 0)}
                          </p>
                        ) : (
                          day.slots &&
                          day.slots.length > 0 && (
                            <p className="mt-1 text-xs leading-5 text-card-foreground/60">
                              {day.slots
                                .map((slot) => formatEventSlotLabel(slot.startTime, slot.endTime))
                                .join(' · ')}
                            </p>
                          )
                        )}
                      </div>
                    ) : null,
                  )}
                </div>
              </DetailCard>

              {location && (
                <DetailCard accentColor={accentColor} icon={MapPin} label="Locație">
                  <p className="font-bold">{location.name}</p>
                  {location.formattedAddress && (
                    <p className="mt-1 text-sm leading-5 text-card-foreground/60">
                      {location.formattedAddress}
                    </p>
                  )}
                  {googleMapsURL && (
                    <a
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--event-accent)] transition hover:opacity-75"
                      href={googleMapsURL}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Deschide în Maps
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  )}
                </DetailCard>
              )}

              {event.cause && typeof event.cause === 'object' && (
                <DetailCard
                  accentColor={accentColor}
                  compact
                  icon={HeartHandshake}
                  label="Cauza susținută"
                >
                  <div className="flex items-center gap-2.5">
                    {event.cause.logo && typeof event.cause.logo !== 'string' && (
                      <Media
                        className="size-18 shrink-0 overflow-hidden rounded-full"
                        imgClassName="size-18 object-cover"
                        resource={event.cause.logo}
                      />
                    )}
                    <p className="min-w-0 text-lg font-bold leading-5">{event.cause.name}</p>
                  </div>
                </DetailCard>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-black/10 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--event-accent)]">
                Povestea proiectului
              </p>
              <h2 className="text-3xl font-bold tracking-tight">Despre eveniment</h2>
              <RichText
                className="mt-5 max-w-none text-card-foreground/80 [&_p]:leading-7"
                data={event.content}
                enableGutter={false}
              />
            </section>

            {(inspoboardItems.length > 0 || galleryItems.length > 0) && (
              <EventPhotoBoard
                defaultMode={photoBoardDefaultMode}
                galleryItems={galleryItems}
                inspoboardItems={inspoboardItems}
              />
            )}
          </div>

          {!event.private && (
            <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-28">
              {event.donation && (
                <DetailCard accentColor={accentColor} icon={HandHelping} label="Donație minimă">
                  {typeof event.donation === 'number' ? <p className="text-2xl font-bold">{event.donation} lei</p> :
                  <p className="text-2xl font-bold">{event.donation}</p>}
                </DetailCard>
              )}
              <SignupForm
                accentColor={accentColor}
                event={{
                  capacity: event.capacity,
                  days: event.days,
                  id: event.id,
                  participantsCount,
                  private: event.private,
                }}
                slotAvailability={slotAvailability}
              />
            </aside>
          )}
        </div>
      </main>
    </article>
  )
}

function formatSlotCount(slotCount: number) {
  if (slotCount === 0) return 'Fără intervale'
  if (slotCount === 1) return '1 interval'

  return `${slotCount} intervale`
}

function getInspoboardItems(inspoboard: Event['inspoboard']): EventPhotoBoardImage[] {
  return (inspoboard ?? []).flatMap((image) => {
    if (!image || typeof image !== 'object') return []

    const item = getMediaPhotoItem(image)
    return item ? [item] : []
  })
}

function getGalleryItems(photos: GalleryPhoto[]): EventPhotoBoardImage[] {
  return photos.flatMap((photo) => {
    if (!photo.photo || typeof photo.photo !== 'object') return []

    const item = getMediaPhotoItem(photo.photo, {
      caption: photo.caption || photo.photo.alt || undefined,
      id: `gallery-${photo.id}`,
    })

    return item ? [item] : []
  })
}

function getMediaPhotoItem(
  media: MediaType,
  options: {
    caption?: string
    id?: string
  } = {},
): EventPhotoBoardImage | null {
  const imageUrl = getMediaUrl(media.url, media.updatedAt)
  if (!imageUrl) return null

  return {
    caption: options.caption,
    height: media.height ?? 1,
    id: options.id ?? `media-${media.id}`,
    img: imageUrl,
    url: imageUrl,
    width: media.width ?? 1,
  }
}

function DetailCard({
  accentColor,
  children,
  compact = false,
  icon: Icon,
  label,
}: {
  accentColor: string
  children: ReactNode
  compact?: boolean
  icon: LucideIcon
  label: string
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card text-card-foreground shadow-lg shadow-black/10 ${compact ? 'p-4' : 'p-5'}`}
    >
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-card-foreground/55">
        <Icon aria-hidden className="size-4" style={{ color: accentColor }} />
        {label}
      </p>
      {children}
    </section>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const event = await queryEventBySlug({ slug: decodeURIComponent(slug) })

  return generateMeta({ doc: event })
}

const queryEventBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'events',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return (result.docs?.[0] as Event | undefined) || null
})
