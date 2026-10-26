import { consolidateHomepageEvents, isEventHighlightGallery } from '@/utilities/homepageEventsLayout'
import { RecruitmentNotice } from '@/components/RecruitmentStatus'
import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  const page: RequiredDataFromCollectionSlug<'pages'> | null = await queryPageBySlug({
    slug: decodedSlug,
  })

  if (!page) {
    return (
      <PayloadRedirects
        url={url}
        fallbackUrl={decodedSlug === 'familia-rotary' ? '/ce-este-rotary' : undefined}
      />
    )
  }

  const { hero } = page
  let layout = page.layout
  if (decodedSlug === 'home') {
    const gallery = layout.find(isEventHighlightGallery)
    const slugs = gallery?.items?.map((item) => item.link.url!.split('/events/')[1].split(/[?#]/)[0]) ?? []
    const events = slugs.length ? (await (await getPayload({ config: configPromise })).find({
      collection: 'events', overrideAccess: false, draft: false, depth: 0, limit: slugs.length,
      where: { and: [{ slug: { in: slugs } }, { _status: { equals: 'published' } }] }, select: { slug: true },
    })).docs : []
    layout = consolidateHomepageEvents(layout, events)
  }

  return (
    <article className="pt-0 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      {/* Keep the application page available when recruitment is closed, instead of the legacy waitlist redirect. */}
      {decodedSlug !== 'inscrie-te' && <PayloadRedirects disableNotFound url={url} />}

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {hero.type == 'none' && <div className="my-24" />}
      {decodedSlug === 'inscrie-te' && <section className="container my-8"><h2 className="mb-3 text-2xl font-semibold">Înscrieri în club</h2><RecruitmentNotice /></section>}
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
