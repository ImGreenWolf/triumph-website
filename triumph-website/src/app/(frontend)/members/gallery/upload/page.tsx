import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { ArrowLeft, Images } from 'lucide-react'
import { getPayload } from 'payload'

import type { Event, User } from '@/payload-types'

import GalleryUploadForm from './page.client'

export const metadata: Metadata = {
  description: 'Submit photos to the Interact Bucuresti Triumph gallery.',
  title: 'Upload Gallery Photos | Interact Bucuresti Triumph',
}

export default async function GalleryUploadPage() {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/members/login')
  }

  const auth = await payload.auth({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })

  if (!auth.user) {
    redirect('/members/login')
  }

  const events = await payload.find({
    collection: 'events',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    sort: '-createdAt',
    user: auth.user as User,
  })

  const eventOptions = (events.docs as Event[]).map((event) => ({
    id: event.id,
    name: event.name,
  }))

  return (
    <div className="halftone-background min-h-screen bg-[#0f172c] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[url('/scren_texture.svg')] opacity-[0.08]" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            className="mb-8 inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
            href="/members"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#00a2e0]/20 text-[#00a2e0]">
              <Images className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-[#00a2e0]">Club Gallery</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                Upload photos
              </h1>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <GalleryUploadForm events={eventOptions} />
      </main>
    </div>
  )
}
