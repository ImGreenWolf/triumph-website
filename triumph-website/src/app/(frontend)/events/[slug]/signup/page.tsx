import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getContrastTextColor } from '@/utilities/eventDisplay'
import { generateMeta } from '@/utilities/generateMeta'
import { ArrowLeft } from 'lucide-react'
import { draftMode } from 'next/headers'

import { getEventSignupData, queryEventBySlug } from '../eventData'
import PageClient from '../page.client'
import SignupForm from '../SignupForm'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function EventSignupPage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const eventURL = `/events/${decodedSlug}`
  const signupURL = `${eventURL}/signup`
  const event = await queryEventBySlug({ slug: decodedSlug })

  if (!event) return <PayloadRedirects url={signupURL} />

  const signupData = await getEventSignupData(event)
  const accentColor = event.useColors && event.secondaryColor ? event.secondaryColor : '#00a2e0'
  const cardColor = event.useColors && event.cardColor ? event.cardColor : '#141e34'
  const backgroundColor = event.useColors && event.primaryColor ? event.primaryColor : '#141e34'

  return (
    <article
      className="halftone-background min-h-screen bg-background px-4 pb-12 pt-28 text-foreground sm:px-6 lg:px-8"
      style={
        {
          '--event-accent': accentColor,
          '--halftone-color': accentColor,
          backgroundColor,
          color: getContrastTextColor(backgroundColor),
        } as CSSProperties
      }
    >
      <PageClient />
      <PayloadRedirects disableNotFound url={signupURL} />
      {draft && <LivePreviewListener />}

      <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(26rem,1fr)] lg:items-start">
        <section className="min-w-0 py-2 lg:sticky lg:top-28">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold opacity-70 transition hover:opacity-100"
            href={eventURL}
          >
            <ArrowLeft className="size-4" />
            Înapoi la eveniment
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-[var(--event-accent)]">
            Formular înscriere
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{event.name}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 opacity-70 sm:text-base">
            Completează datele de contact și alege intervalul la care vrei să participi.
          </p>
        </section>

        <SignupForm
          accentColor={accentColor}
          backgroundColor={backgroundColor}
          backHref={eventURL}
          cardColor={cardColor}
          event={signupData.signupEvent}
          mode="inline"
          slotAvailability={signupData.slotAvailability}
        />
      </main>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const event = await queryEventBySlug({ slug: decodeURIComponent(slug) })
  const metadata = await generateMeta({ doc: event })

  return {
    ...metadata,
    title: event ? `Înscriere ${event.name} | Interact București Triumph` : metadata.title,
  }
}
