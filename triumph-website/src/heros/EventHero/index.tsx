import { Media } from '@/components/Media'
import type { Event } from '@/payload-types'
import {
  formatEventDateRange,
  getContrastTextColor,
  getEventLocation,
  getEventStatus,
} from '@/utilities/eventDisplay'
import { CalendarDays, MapPin } from 'lucide-react'
import React from 'react'

export const EventHero: React.FC<{
  event: Event
}> = ({ event }) => {
  const { heroImage, name } = event
  const location = getEventLocation(event.location)
  const status = getEventStatus(event)
  const accentColor = event.useColors && event.secondaryColor ? event.secondaryColor : '#00a2e0'

  return (
    <section className="relative flex min-h-[68svh] items-end overflow-hidden bg-card pt-40 text-white">
      {heroImage && typeof heroImage !== 'string' && (
        <Media
          alt={name}
          className="absolute inset-0"
          fill
          imgClassName="object-cover"
          pictureClassName="relative block size-full"
          priority
          resource={heroImage}
          size="100vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="container relative z-10 pb-10 pt-20 md:pb-14">
        <p
          className="mb-5 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] shadow-sm"
          style={{ backgroundColor: accentColor, color: getContrastTextColor(accentColor) }}
        >
          {status.label}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          {name}
        </h1>
        <div className="mt-6 flex flex-col gap-3 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-6">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4" style={{ color: accentColor }} />
            {formatEventDateRange(event)}
          </p>
          {location?.name && (
            <p className="flex items-center gap-2">
              <MapPin aria-hidden className="size-4" style={{ color: accentColor }} />
              {location.name}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
