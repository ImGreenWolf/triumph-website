import React from 'react'
import Link from 'next/link'
import * as motion from 'motion/react-client'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { ArrowUpRightIcon, BanknoteIcon, UserIcon } from 'lucide-react'

import type { StatsBlock as StatsBlockProps } from '@/payload-types'
import RichText from '@/components/RichText'
import { Media } from '@/components/Media'
import { GallerySlideshow } from '@/components/Gallery/component'
import CountUp from '@/components/ui/counterUp'
import { cn } from '@/utilities/ui'
import '../blocks.css'

export const StatsBlock = async ({
  introContent,
  stats,
  gallery,
  showEvents = true,
  disableGutter = false,
}: StatsBlockProps & { disableGutter?: boolean }) => {
  const events =
    showEvents !== false
      ? (
          await (
            await getPayload({ config: payloadConfig })
          ).find({
            collection: 'events',
            limit: 5,
            sort: '-days',
            joins: { registrations: { count: true } },
          })
        ).docs
      : []
  const statsItems = stats || []
  const photos =
    gallery?.filter(
      (photo) =>
        typeof photo === 'object' &&
        photo !== null &&
        photo.url &&
        photo.mimeType?.startsWith('image/'),
    ) || []
  const hasGallery = photos.length > 0
  const hasEventList = events.length > 0

  return (
    <section className={cn('stats-block min-w-0', !disableGutter && 'container')}>
      {introContent && (
        <RichText
          className="mx-auto mb-6 max-w-3xl text-center sm:mb-8"
          data={introContent}
          enableGutter={false}
        />
      )}
      {statsItems.length > 0 && (
        <div className="block-stats-row gap-4! sm:gap-5!">
          {statsItems.map((stat, index) => (
            <motion.article
              initial={{ y: 5, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 'some' }}
              transition={{
                duration: 0.6,
                ease: 'anticipate',
                delay: 0.1 * (statsItems.length / (index + 1)),
              }}
              className="block-stats-item min-w-0 rounded-lg border border-border/70 bg-card p-3 text-card-foreground shadow-sm sm:p-4"
              key={stat.id || index}
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-accent">
                <CountUp
                  to={stat.value}
                  from={0}
                  separator=","
                  className="shrink-0 text-3xl font-bold leading-none tracking-normal tabular-nums sm:text-5xl"
                />
                {stat.unit && (
                  <span className="whitespace-nowrap text-base font-semibold leading-snug text-card-foreground/85 sm:text-lg">
                    {stat.unit}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm font-semibold leading-snug [overflow-wrap:anywhere] sm:mt-3 sm:text-base">
                {stat.label}
              </div>
              {stat.description && (
                <p className="mt-1.5 text-sm leading-5 text-card-foreground/85 [overflow-wrap:anywhere]">
                  {stat.description}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      )}

      {(hasGallery || hasEventList) && (
        <div className={cn('block-stats-media gap-4!', statsItems.length > 0 && 'mt-4 sm:mt-6')}>
          {hasGallery && (
            <div className="block-stats-gallery min-w-0 overflow-hidden rounded-xl">
              <GallerySlideshow gallery={photos} />
            </div>
          )}
          {hasEventList && (
            <div className="block-stats-event-slot min-w-0">
              <aside className="block-stats-events flex max-h-[28rem] min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card p-3 text-card-foreground sm:p-4">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <h3 className="text-base font-semibold leading-tight">Evenimentele Noastre</h3>
                  <Link
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-bold text-background transition-colors hover:bg-accent/90"
                    href="/events"
                  >
                    Toate <ArrowUpRightIcon className="size-3.5" aria-hidden />
                  </Link>
                </div>
                <div
                  className="mt-1 min-h-0 divide-y divide-border/60 overflow-y-auto overscroll-contain pr-1"
                  role="region"
                  aria-label="Lista evenimentelor"
                  tabIndex={0}
                >
                  {events.map((event) => {
                    const eventImage = event.meta?.image
                    return (
                      <article className="min-w-0" key={event.id}>
                        <Link
                          className="group grid min-h-20 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-sm py-2"
                          href={event.slug ? `/events/${event.slug}` : '/events'}
                        >
                          {eventImage && typeof eventImage === 'object' && eventImage.url ? (
                            <Media
                              resource={eventImage}
                              className="h-16 w-9 overflow-hidden rounded-sm bg-primary/10"
                              imgClassName="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-16 w-9 rounded-sm bg-primary/10" aria-hidden />
                          )}
                          <div className="min-w-0 self-center">
                            <h4 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                              {event.name}
                            </h4>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs leading-5 text-card-foreground/85">
                              {event.registrations && (
                                <p className="flex items-center gap-1">
                                  <UserIcon className="size-3.5 shrink-0" aria-hidden />
                                  {event.registrations.totalDocs} participanți
                                </p>
                              )}
                              {event.registrations && typeof event.donation === 'number' && (
                                <p className="flex items-center gap-1">
                                  <BanknoteIcon className="size-3.5 shrink-0" aria-hidden />+
                                  {(event.registrations.totalDocs || 0) * event.donation} RON
                                  strânşi
                                </p>
                              )}
                            </div>
                          </div>
                          <ArrowUpRightIcon className="size-3.5 shrink-0 text-accent" aria-hidden />
                        </Link>
                      </article>
                    )
                  })}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
