'use client'

import { useEffect, useState, type ReactNode } from 'react'
import AccordionGallery from '@/components/AccordionGallery'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { Media } from '@/components/Media'
import { EventsCollection } from '@/components/EventCollection'
import type { EventCardData } from '@/components/EventCard'
import { formatEventDateRange, getEventLocation, getEventStartDate } from '@/utilities/eventDisplay'

export type HighlightArtwork = { eventID: string; image: string; alt: string; label: string }

export function HomepageEventsView({
  title,
  description,
  featured,
  highlights,
  archiveLabel,
  renderedAt,
  intro,
  presentation = 'cards',
  artworks = [],
  expandRatio = 0.5,
  showLabels = true,
}: {
  title: string
  description?: string | null
  featured?: EventCardData
  highlights: EventCardData[]
  archiveLabel?: string | null
  renderedAt: number
  intro?: ReactNode
  presentation?: 'gallery' | 'cards'
  artworks?: HighlightArtwork[]
  expandRatio?: number
  showLabels?: boolean
}) {
  const [now, setNow] = useState(renderedAt)
  const startsAt = featured ? getEventStartDate(featured)?.getTime() : undefined
  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const interval = setInterval(update, 60_000)
    const timer =
      startsAt && startsAt > Date.now()
        ? setTimeout(update, Math.min(startsAt - Date.now(), 2_147_483_647))
        : undefined
    window.addEventListener('focus', update)
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
      window.removeEventListener('focus', update)
    }
  }, [startsAt])
  const upcoming = featured && startsAt && startsAt > now ? featured : undefined
  const unique = highlights.filter(
    (event, index, list) =>
      event.id !== upcoming?.id && list.findIndex((item) => item.id === event.id) === index,
  )
  const gallery =
    presentation === 'gallery'
      ? unique.flatMap((event) => {
          const artwork = artworks.find((entry) => entry.eventID === event.id)
          const image = event.meta?.image || event.heroImage
          const url = artwork?.image || (typeof image === 'object' ? image?.url : undefined)
          return url
            ? [
                {
                  eventID: event.id,
                  image: url,
                  label: artwork?.label || event.name,
                  alt: artwork?.alt || event.name,
                  link: `/events/${event.slug}`,
                },
              ]
            : []
        })
      : []
  const cards = unique.filter((event) => !gallery.some((item) => item.eventID === event.id))
  const image = upcoming?.heroImage || upcoming?.meta?.image
  const location = upcoming ? getEventLocation(upcoming.location) : null
  return (
    <section className="container min-w-0 scroll-mt-28" aria-label={title} data-homepage-events>
      <div className="mb-8 max-w-3xl">
        {intro || <h2 className="text-3xl font-bold leading-tight sm:text-5xl">{title}</h2>}
        {description && (
          <p className="mt-4 text-base leading-7 text-foreground/85">{description}</p>
        )}
      </div>
      {gallery.length > 0 && (
        <div data-highlighted-gallery>
          <AccordionGallery
            height={560}
            accentColor="var(--accent)"
            orientation="auto"
            items={gallery}
            expandRatio={expandRatio}
            showLabels={showLabels}
          />
        </div>
      )}
      {cards.length > 0 && (
        <EventsCollection contained={false} events={cards} showDescription small={false} />
      )}
      {upcoming && (
        <article
          className="mt-8 grid overflow-hidden rounded-xl border border-border bg-card text-card-foreground md:grid-cols-2"
          data-featured-upcoming
        >
          <div className="relative aspect-[4/3] min-w-0 bg-sidebar md:aspect-auto md:min-h-80">
            {image && typeof image === 'object' && (
              <Media
                resource={image}
                fill
                className="absolute inset-0"
                pictureClassName="relative block size-full"
                imgClassName="object-cover"
                size="(min-width: 768px) 50vw, 100vw"
                alt={upcoming.name}
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start p-6 sm:p-9">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <CalendarDays aria-hidden className="size-4 text-accent" />
              {formatEventDateRange(upcoming)}
            </p>
            <h3 className="text-3xl font-bold leading-tight sm:text-4xl">{upcoming.name}</h3>
            {location?.name && (
              <p className="mt-4 flex items-start gap-2 text-sm leading-6">
                <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-accent" />
                {location.name}
              </p>
            )}
            {upcoming.meta?.description && (
              <p className="mt-4 max-w-prose text-base leading-7 text-card-foreground/85">
                {upcoming.meta.description}
              </p>
            )}
            <Link
              className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              href={`/events/${upcoming.slug}/signup`}
            >
              Înscrie-te la eveniment
              <ArrowUpRight aria-hidden className="size-5" />
            </Link>
          </div>
        </article>
      )}
      {!upcoming && !unique.length && (
        <p className="py-6 text-base leading-7">
          Pregătim următoarele evenimente. Între timp, poți explora arhiva sau{' '}
          <Link className="underline underline-offset-4" href="/contact">
            ne poți contacta
          </Link>
          .
        </p>
      )}
      <div className="mt-8 flex justify-center sm:justify-start">
        <Link
          className="inline-flex min-h-12 items-center gap-3 rounded-md border border-foreground/30 px-5 py-3 font-semibold transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          href="/events"
        >
          {archiveLabel || 'Vezi toate evenimentele'}
          <ArrowUpRight aria-hidden className="size-5" />
        </Link>
      </div>
    </section>
  )
}
