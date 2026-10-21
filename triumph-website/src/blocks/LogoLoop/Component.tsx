import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import LogoLoop from '@/components/ui/logoLoop'
import type { LogoLoopBlock as LogoLoopBlockProps } from '@/payload-types'

export const LogoLoopBlock: React.FC<LogoLoopBlockProps> = async ({ media, type }) => {
  let logos = media
  if (type === 'causes' || type === 'sponsors') {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({ collection: type })
    logos = result.docs.map((item) => item.logo).filter((logo) => logo != null)
  }
  const items = logos?.flatMap((logo) =>
    typeof logo === 'object' && logo?.url ? [{ src: logo.url, alt: logo.alt || '' }] : [],
  ) || []
  if (!items.length) return null

  return <section className="container overflow-hidden" aria-label="Parteneri"><LogoLoop logos={items} fadeOut logoHeight={80} fadeOutColor="var(--background)" pauseOnHover /></section>
}
