import { EventsCollection } from '@/components/EventCollection'
import { Pagination } from '@/components/Pagination'
import EventTimeline from '@/components/ui/TimelineComponent'
import type { Event } from '@/payload-types'
import { CalendarDays, Sparkles } from 'lucide-react'
import PageClient from './page.client'

type Props = {
  completedEvents: Event[]
  events: Event[]
  page: number
  showArchive?: boolean
  totalDocs: number
  totalPages: number
}

export function EventsPageContent({
  completedEvents,
  events,
  page,
  showArchive = true,
  totalDocs,
  totalPages,
}: Props) {
  return (
    <main className="overflow-hidden pb-24 pt-32">
      <PageClient />

      <section className="container relative pb-14 pt-8 md:pb-20 md:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
            <Sparkles aria-hidden className="size-4" />
            Evenimente Triumph
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Experiențe care aduc oamenii împreună.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Descoperă proiectele noastre, alege evenimentul potrivit și înscrie-te la intervalul
            care ți se potrivește.
          </p>
        </div>
      </section>

      <section aria-labelledby="upcoming-events-title" className="container">
        <div className="mb-7 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Calendar</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight" id="upcoming-events-title">
              Evenimente viitoare
            </h2>
          </div>
          {totalDocs > 0 && (
            <p className="text-sm text-muted-foreground">
              {totalDocs} {totalDocs === 1 ? 'eveniment disponibil' : 'evenimente disponibile'}
            </p>
          )}
        </div>

        {events.length > 0 ? (
          <EventsCollection contained={false} events={events} showDescription small={false} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-card-foreground md:p-10">
            <CalendarDays aria-hidden className="size-10 text-accent" strokeWidth={1.5} />
            <h3 className="mt-5 text-2xl font-bold">Pregătim următorul eveniment.</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-card-foreground/65">
              Revino în curând pentru programul actualizat. Între timp, poți explora proiectele
              deja încheiate.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination basePath="/events" page={page} totalPages={totalPages} />
        )}
      </section>

      {showArchive && completedEvents.length > 0 && (
        <section className="mt-20 border-y border-border bg-card/95 text-card-foreground md:mt-28">
          <div className="container py-16 md:py-24">
            <EventTimeline
              initialEvents={completedEvents}
              subtitle="O privire în urmă la proiectele prin care am transformat ideile în experiențe cu impact."
              title="Din arhiva noastră"
            />
          </div>
        </section>
      )}
    </main>
  )
}
