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
} from '@/utilities/eventRegistration'
import { generateMeta } from '@/utilities/generateMeta'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getLocationMapEmbedURL, getLocationPhotoURL } from '@/utilities/locationPhoto'
import configPromise from '@payload-config'
import {
  CalendarDays,
  DownloadIcon,
  ExternalLink,
  HandHelping,
  HeartHandshake,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'
import EventPhotoBoard, {
  type EventPhotoBoardImage,
  type EventPhotoBoardMode,
} from './EventPhotoBoard.client'
import { getEventSignupData, queryEventBySlug } from './eventData'
import LocationMapDropdown from './LocationMapDropdown.client'
import LocationVisual from './LocationVisual.client'
import PageClient from './page.client'
import SignupForm from './SignupForm'

export const dynamic = 'force-dynamic'

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
  const auth = await payload.auth({
    headers: await getPayloadAuthHeaders(),
  })
  const user = auth?.user as User | undefined
  const [signupData, galleryPhotos] = await Promise.all([
    getEventSignupData(event),
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
        visibility: {
          equals: 'public',
        },
      },
    }),
  ])
  const accentColor = event.useColors && event.secondaryColor ? event.secondaryColor : '#00a2e0'
  const cardColor = event.useColors && event.cardColor ? event.cardColor : '#141e34'
  const backgroundColor = event.useColors && event.primaryColor ? event.primaryColor : '#141e34'
  const eventDays = event.days?.filter((day) => day.eventDate) ?? []
  const compactProgram = eventDays.length > 5
  const location = getEventLocation(event.location)
  const locationPhotoURL = await getLocationPhotoURL(location)
  const locationMapEmbedURL = getLocationMapEmbedURL(location)
  const googleMapsURL = getGoogleMapsURL(location)
  const inspoboardItems = getInspoboardItems(event.inspoboard)
  const galleryItems = getGalleryItems(galleryPhotos.docs as GalleryPhoto[])
  const minimumDetails = getMinimumDetails(event)
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
            <section className="grid gap-4 md:grid-cols-2 ">
              <DetailCard
                accentColor={accentColor}
                cardColor={cardColor}
                icon={CalendarDays}
                label="Program"
              >
                <div className={compactProgram ? 'grid grid-cols-2 gap-2' : 'space-y-3 '}>
                  {eventDays.map((day) =>
                    day.eventDate ? (
                      <div
                        className={
                          compactProgram
                            ? 'rounded-lg bg-background/10 px-2.5 py-2'
                            : 'rounded-xl bg-background/10 p-3'
                        }
                        key={day.id || day.eventDate}
                      >
                        <div
                          className={
                            compactProgram ? 'flex items-center gap-2' : 'flex items-center gap-3'
                          }
                        >
                          <span
                            className={
                              compactProgram
                                ? 'text-3xl font-black leading-none text-[var(--event-accent)]'
                                : 'text-5xl font-black leading-none text-[var(--event-accent)]'
                            }
                          >
                            {getEventDateParts(day.eventDate).day}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={
                                compactProgram
                                  ? 'block text-xs font-bold capitalize leading-4'
                                  : 'block text-base font-bold capitalize leading-5'
                              }
                            >
                              {getEventDateParts(day.eventDate).weekday}
                            </span>
                            <span
                              className={
                                compactProgram
                                  ? 'block text-[11px] font-semibold leading-4 opacity-60'
                                  : 'block text-sm font-semibold leading-5 opacity-60'
                              }
                            >
                              {getEventDateParts(day.eventDate).monthYear}
                            </span>
                          </span>
                        </div>
                        {compactProgram ? (
                          <p
                            className={
                              day.slots?.length === 1
                                ? 'mt-2 rounded-md bg-[var(--event-accent)]/20 px-2 py-1 text-xs font-black leading-4'
                                : 'mt-0.5 text-[11px] leading-4 opacity-60'
                            }
                          >
                            {day.slots?.length === 1
                              ? formatEventSlotLabel(day.slots[0]?.startTime, day.slots[0]?.endTime)
                              : formatSlotCount(day.slots?.length ?? 0)}
                          </p>
                        ) : (
                          day.slots &&
                          day.slots.length > 0 && (
                            <div
                              className={
                                day.slots.length === 1
                                  ? 'mt-4 rounded-lg border border-[var(--event-accent)]/40 bg-[var(--event-accent)]/18 px-4 py-3 shadow-sm'
                                  : 'mt-3 flex flex-wrap gap-2 leading-5'
                              }
                            >
                              {day.slots.map((slot) => {
                                const slotLabel = formatEventSlotLabel(slot.startTime, slot.endTime)

                                return day.slots?.length === 1 ? (
                                  <div key={slot.id || slotLabel}>
                                    <p className="text-xs font-semibold uppercase opacity-60">
                                      Interval
                                    </p>
                                    <p className="mt-1 text-xl font-black">{slotLabel}</p>
                                  </div>
                                ) : (
                                  <span
                                    className={
                                      eventDays.length > 3
                                        ? 'rounded-xl text-[10px] px-2 py-0.5 bg-[var(--event-accent)]/80'
                                        : 'rounded-xl text-xs px-3 py-1 bg-[var(--event-accent)]/80'
                                    }
                                    key={slot.id || slotLabel}
                                  >
                                    {slotLabel}
                                  </span>
                                )
                              })}
                            </div>
                          )
                        )}
                      </div>
                    ) : null,
                  )}
                </div>
              </DetailCard>

              {location && (
                <DetailCard
                  accentColor={accentColor}
                  icon={MapPin}
                  cardColor={cardColor}
                  label="Locație"
                >
                  <LocationVisual alt={location.name} photoURL={locationPhotoURL} />
                  <p className="text-2xl font-black leading-tight">{location.name}</p>
                  {location.formattedAddress && (
                    <p className="mt-2 text-base font-semibold leading-6 opacity-65">
                      {location.formattedAddress}
                    </p>
                  )}
                  <LocationMapDropdown
                    googleMapsURL={googleMapsURL}
                    locationName={location.name}
                    mapEmbedURL={locationMapEmbedURL}
                  />
                </DetailCard>
              )}
            </section>

            <section
              className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-black/10 md:p-8"
              style={{ backgroundColor: cardColor, color: getContrastTextColor(cardColor) }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--event-accent)]">
                Povestea proiectului
              </p>
              <h2 className="text-3xl font-bold tracking-tight">Despre eveniment</h2>
              <RichText
                className="mt-5 max-w-none  [&_p]:leading-7"
                enableProse={false}
                data={event.content}
                enableGutter={false}
              />
            </section>

            {(inspoboardItems.length > 0 || galleryItems.length > 0) && (
              <EventPhotoBoard
                defaultMode={photoBoardDefaultMode}
                galleryItems={galleryItems}
                inspoboardItems={inspoboardItems}
                eventRef={event}
              />
            )}
          </div>

          {!event.private && (
            <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-28">
              <SignupForm
                accentColor={accentColor}
                backgroundColor={backgroundColor}
                cardColor={cardColor}
                event={signupData.signupEvent}
                signupHref={`/events/${encodeURIComponent(decodedSlug)}/signup`}
                slotAvailability={signupData.slotAvailability}
              />
              {event.cause && typeof event.cause === 'object' && (
                <DetailCard
                  accentColor={accentColor}
                  cardColor={cardColor}
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
                    <div className="flex flex-col h-full">
                      <p className="min-w-0 text-lg font-bold leading-5">{event.cause.name}</p>

                      {event.cause.link && (
                        <a
                          className="inline-flex items-center gap-1.5 text-md font-semibold text-[var(--event-accent)] transition hover:opacity-50"
                          href={event.cause.link}
                          target="_blank"
                        >
                          Despre Cauzǎ
                          <ExternalLink aria-hidden className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </DetailCard>
              )}
              {minimumDetails.length > 0 && (
                <DetailCard
                  accentColor={accentColor}
                  cardColor={cardColor}
                  icon={HandHelping}
                  label="Donații eveniment"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {minimumDetails.map((minimum) => (
                      <div className="rounded-lg bg-background/10 p-3" key={minimum.label}>
                        <p className="text-xs font-semibold uppercase opacity-55 max-w-0">
                          {minimum.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold">{minimum.value}</p>
                      </div>
                    ))}
                  </div>
                </DetailCard>
              )}
              {event.documents?.length != 0 && (
                <DetailCard
                  accentColor={accentColor}
                  cardColor={cardColor}
                  icon={HandHelping}
                  label="Acorduri Necesare"
                >
                  {event.documents?.map((document, index) => (
                    <div
                      className="text-[var(--event-accent)] underline inline-flex items-center gap-2"
                      key={document.id || `${document.label}-${index}`}
                    >
                      <a
                        href={
                          typeof document.document == 'string'
                            ? document.document
                            : document.document.url!
                        }
                      >
                        {document.label}
                      </a>
                      <DownloadIcon aria-hidden className="size-3.5" />
                    </div>
                  ))}
                </DetailCard>
              )}
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

function getEventDateParts(eventDate: string) {
  const parts = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).formatToParts(new Date(eventDate))
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    day: getPart('day'),
    monthYear: `${getPart('month')} ${getPart('year')}`.trim(),
    weekday: getPart('weekday'),
  }
}

function getMinimumDetails(event: Pick<Event, 'donation' | 'minimumConsumation'>) {
  const details: Array<{ label: string; value: string }> = []
  const donation = formatDonationMinimum(event.donation)
  const consumation = formatCurrencyMinimum(event.minimumConsumation)

  if (donation) details.push({ label: 'Donație minimă', value: donation })
  if (consumation) details.push({ label: 'Consumație minimă', value: consumation })

  return details
}

function formatDonationMinimum(value: Event['donation']) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (Number.isFinite(parsed)) return parsed > 0 ? `${trimmed} RON` : null

  return trimmed
}

function formatCurrencyMinimum(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? `${value} RON` : null
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
  cardColor,
  children,
  compact = false,
  icon: Icon,
  label,
}: {
  accentColor: string
  cardColor: string
  children: ReactNode
  compact?: boolean
  icon: LucideIcon
  label: string
}) {
  return (
    <section
      className={`rounded-2xl bg-card text-card-foreground flex flex-col shadow-lg shadow-black/10 ${compact ? 'p-4' : 'p-5'}`}
      style={{ backgroundColor: cardColor, color: getContrastTextColor(cardColor) }}
    >
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-55">
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
