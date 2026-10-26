import { draftMode } from 'next/headers'
import { Header as HeaderType } from '@/payload-types'
import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import payloadConfig from '@payload-config'
import { CollectionSlug, getPayload } from 'payload'
import React from 'react'
import { CardNavItem } from './Nav/CardNav'

export async function Header() {
  const { isEnabled: draft } = await draftMode()
  const headerData = draft ? await (await getPayload({ config: payloadConfig })).findGlobal({ slug: 'header', draft: true, depth: 1 }) : await getCachedGlobal('header', 1)()
  return <HeaderClient links={await fetchNav(headerData)} />
}

async function fetchNav(data: HeaderType): Promise<CardNavItem[]> {
  return Promise.all(
    (data.navCategory || []).map(async (item) => ({
      label: item.link.label,
      link: getHref(item.link),
      bgColor: 'var(--background)',
      textColor: 'var(--card-foreground)',
      links: (await fetchLinks(item.collectionSlug as CollectionSlug | null, item.reference)) || [],
    })),
  )
}

type HeaderNavCategory = NonNullable<HeaderType['navCategory']>[number]
type HeaderSubItem = NonNullable<HeaderNavCategory['reference']>[number]
type HeaderLink = HeaderNavCategory['link']

async function fetchLinks(
  slug: CollectionSlug | null | undefined,
  subItems: HeaderNavCategory['reference'],
): Promise<CardNavItem['links'] | undefined> {
  const fallbackLinks = getSubItemLinks(subItems)

  if (!slug) return fallbackLinks

  const payload = await getPayload({ config: payloadConfig })
  const collection = payload.collections[slug]
  const customLinks = collection?.config.custom?.links as
    | { value: string; label: string; ariaLabel?: string }[]
    | undefined
  
  if (!customLinks) return fallbackLinks

  return customLinks.map((link) => ({
    href: link.value,
    label: link.label,
    ariaLabel: link.ariaLabel || link.label,
  }))
}

function getSubItemLinks(subItems: HeaderNavCategory['reference']): CardNavItem['links'] {
  return (subItems || [])
    .map((item: HeaderSubItem) => ({
      href: getHref(item.link, item.sectionId),
      label: item.link.label,
      ariaLabel: item.link.label,
    }))
    .filter((item) => Boolean(item.href))
}

function getHref(link: HeaderLink, sectionId?: string | null) {
  const suffix = sectionId ? `#${sectionId}` : ''
  if (link.type === 'custom') {
    const href = link.url || '/'
    return `${/^(https?:|mailto:|tel:|\/|#)/.test(href) ? href : `/${href}`}${suffix}`
  }
  if (!link.reference || typeof link.reference.value !== 'object') return ''
  const doc = link.reference.value
  return `${link.reference.relationTo === 'posts' ? '/posts' : ''}/${doc.slug}${suffix}`
}
