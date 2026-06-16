import { Header as HeaderType, Page, Post } from '@/payload-types'
import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import payloadConfig from '@payload-config'
import { CollectionSlug, getPayload } from 'payload'
import React from 'react'
import { CardNavItem } from './Nav/CardNav'

export async function Header() {
  const headerData = await getCachedGlobal('header', 1)()
  return <HeaderClient data={headerData} links={await fetchNav(headerData)} />
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

  if (link.type === 'custom') return `${link.url || ''}${suffix}`

  if (!link.reference) return ''

  if (typeof link.reference.value === 'string') return `${link.reference.value}${suffix}`

  switch (link.reference.relationTo) {
    case 'pages':
      return `/${(link.reference.value as Page).slug}${suffix}`
    case 'posts':
      return `/posts/${(link.reference.value as Post).slug}${suffix}`
    default:
      return ''
  }
}
