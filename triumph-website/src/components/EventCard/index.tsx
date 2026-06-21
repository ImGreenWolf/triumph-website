'use client'

import { Media } from '@/components/Media'
import type { Event } from '@/payload-types'
import { formatEventDateRange, getEventLocation, getEventStatus } from '@/utilities/eventDisplay'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export type EventCardData = Pick<Event, 'slug' | 'meta' | 'name' | 'days' | 'location'>

export const EventCard: React.FC<{
  className?: string
  doc?: EventCardData
  showDescription: boolean
  small: boolean
}> = ({ className, doc, showDescription = true, small }) => {
  const { card, link } = useClickableCard({})
  const { slug, meta, name, days, location } = doc || {}
  const { description, image: metaImage } = meta || {}
  const href = `/events/${slug}`
  const eventLocation = getEventLocation(location)
  const status = getEventStatus({ days: days ?? [] })

  return (
    <article
      className={cn(
        'group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition duration-300',
        'hover:-translate-y-1 hover:border-accent/70 hover:shadow-xl',
        className,
      )}
      ref={card.ref}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-background/10',
          small ? 'aspect-[4/3]' : 'aspect-[5/4]',
        )}
      >
        {metaImage && typeof metaImage !== 'string' ? (
          <Media
            alt={name || ''}
            className="absolute inset-0"
            fill
            imgClassName="object-cover transition duration-500 group-hover:scale-105"
            pictureClassName="relative block size-full"
            resource={metaImage}
            size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-card via-card to-accent/25">
            <CalendarDays aria-hidden className="size-12 text-accent/70" strokeWidth={1.4} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <span className="rounded-full bg-card/85 px-3 py-1 text-xs font-semibold text-card-foreground shadow-sm backdrop-blur-md">
            {formatEventDateRange({ days: days ?? [] })}
          </span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md',
              status.tone === 'accent'
                ? 'bg-accent text-accent-foreground'
                : 'bg-card/85 text-card-foreground',
            )}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="flex grow flex-col p-5">
        <h3 className="text-xl font-bold leading-tight md:text-2xl">
          <Link className="transition-colors group-hover:text-accent" href={href} ref={link.ref}>
            {name}
          </Link>
        </h3>

        {eventLocation?.name && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-card-foreground/65">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="line-clamp-2">{eventLocation.name}</span>
          </p>
        )}

        {description && showDescription && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-card-foreground/70">
            {description}
          </p>
        )}

        {!small && (
          <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-accent">
            Vezi detalii
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        )}
      </div>
    </article>
  )
}
