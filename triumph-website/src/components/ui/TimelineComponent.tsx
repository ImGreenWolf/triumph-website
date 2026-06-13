'use client'

import { Media } from '@/components/Media'
import type { Event } from '@/payload-types'
import {
  formatEventDateRange,
  getEventEndDate,
  getEventLocation,
  isEventCompleted,
} from '@/utilities/eventDisplay'
import { cn } from '@/utilities/ui'
import { ArrowUpRight, CalendarDays, HeartHandshake, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

interface EventTimelineProps {
  accentColor?: string
  initialEvents?: Event[]
  layout?: 'horizontal' | 'vertical'
  limit?: number
  showPastYears?: boolean
  showStatistics?: boolean
  subtitle?: string
  title?: string
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  accentColor = '#00a2e0',
  initialEvents,
  layout = 'vertical',
  limit = 10,
  showPastYears = true,
  showStatistics = true,
  subtitle = '',
  title = 'Impactul nostru',
}) => {
  const [events, setEvents] = useState<Event[]>(initialEvents ?? [])
  const [loading, setLoading] = useState(initialEvents === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents)
      setLoading(false)
      return
    }

    const fetchCompletedEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events?depth=1&limit=100')
        const data = await response.json()

        if (!response.ok) throw new Error('Nu am putut încărca evenimentele.')
        setEvents(data.docs)
      } catch (fetchError) {
        console.error('Error fetching events:', fetchError)
        setError('Nu am putut încărca arhiva de evenimente.')
      } finally {
        setLoading(false)
      }
    }

    void fetchCompletedEvents()
  }, [initialEvents])

  const completedEvents = useMemo(() => {
    const currentYear = new Date().getFullYear()

    return events
      .filter((event) => isEventCompleted(event))
      .filter((event) => showPastYears || getEventEndDate(event)?.getFullYear() === currentYear)
      .sort((firstEvent, secondEvent) => {
        return (getEventEndDate(secondEvent)?.getTime() ?? 0) - (getEventEndDate(firstEvent)?.getTime() ?? 0)
      })
      .slice(0, limit)
  }, [events, limit, showPastYears])

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-accent/30 border-b-accent" />
        <p className="mt-4 text-sm text-card-foreground/60">Se încarcă arhiva...</p>
      </div>
    )
  }

  if (error) return <p className="py-10 text-center text-sm text-destructive">{error}</p>
  if (completedEvents.length === 0) return null

  return (
    <div>
      {(title || subtitle) && (
        <div className="mb-10 max-w-2xl md:mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Istoric</p>
          {title && <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-4 leading-7 text-card-foreground/65">{subtitle}</p>}
        </div>
      )}

      <div
        className={cn(
          layout === 'horizontal'
            ? 'flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4'
            : 'grid gap-5 md:grid-cols-2 lg:gap-7',
        )}
      >
        {completedEvents.map((event) => (
          <ArchiveEventCard
            accentColor={accentColor}
            event={event}
            horizontal={layout === 'horizontal'}
            key={event.id}
            showStatistics={showStatistics}
          />
        ))}
      </div>
    </div>
  )
}

function ArchiveEventCard({
  accentColor,
  event,
  horizontal,
  showStatistics,
}: {
  accentColor: string
  event: Event
  horizontal: boolean
  showStatistics: boolean
}) {
  const location = getEventLocation(event.location)
  const registrationsCount = event.registrations?.totalDocs ?? event.registrations?.docs?.length ?? 0
  const cause = typeof event.cause === 'object' ? event.cause : null

  return (
    <Link
      className={cn(
        'group overflow-hidden rounded-2xl border border-card-foreground/10 bg-background/5 transition duration-300',
        'hover:-translate-y-1 hover:border-accent/70 hover:bg-background/10',
        horizontal && 'w-[19rem] shrink-0 snap-start sm:w-[22rem]',
      )}
      href={`/events/${event.slug}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-background/10">
        {event.heroImage && typeof event.heroImage !== 'string' ? (
          <Media
            alt={event.name}
            className="absolute inset-0"
            fill
            imgClassName="object-cover transition duration-500 group-hover:scale-105"
            pictureClassName="relative block size-full"
            resource={event.heroImage}
            size="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CalendarDays aria-hidden className="size-10 text-accent" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <p className="absolute bottom-4 left-4 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {formatEventDateRange(event)}
        </p>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold leading-tight transition-colors group-hover:text-accent">
            {event.name}
          </h3>
          <ArrowUpRight
            aria-hidden
            className="mt-1 size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{ color: accentColor }}
          />
        </div>

        {location?.name && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-card-foreground/60">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="line-clamp-2">{location.name}</span>
          </p>
        )}

        {showStatistics && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-t border-card-foreground/10 pt-4 text-xs text-card-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <Users aria-hidden className="size-4 text-accent" />
              {registrationsCount} participanți
            </span>
            {cause?.name && (
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake aria-hidden className="size-4 text-accent" />
                {cause.name}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export default EventTimeline
