import { Header as HeaderType} from '@/payload-types'
import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import payloadConfig from '@payload-config'
import { CollectionSlug, getPayload } from 'payload'
import React from 'react'
import { CardNavItem } from './Nav/CardNav'

export async function Header() {
  const headerData = await getCachedGlobal('header', 1)()
  return <HeaderClient data={headerData} links={await fetchNav(headerData)}/>
}

async function fetchNav(data: HeaderType): Promise<CardNavItem[]> {
  return Promise.all(data.navCategory!.map(async i => {
    return {label: i.link.label!, link: i.link.url! || getHref(i.link)!,
       bgColor: 'var(--background)', textColor: 'var(--card-foreground)',
    links: await fetchLinks(i.collectionSlug as CollectionSlug, i.subItems) || []
  }}))
}

async function fetchLinks(slug: CollectionSlug, subItems: any[] | undefined | null): Promise<CardNavItem['links'] | undefined> {
  
  const payload = await getPayload({config: payloadConfig})
  const collection = payload.collections[slug]
  if(!collection || !(collection.config.custom.links))
    if(subItems) {
      
      return subItems.map(si => ({href: getHref(si) || "s", label: si.label!, ariaLabel: si.label!}))
    }
    else return;

  const customField = collection.config.custom
  const links = customField.links as {value: string, label: string}[]
   
  return links.map(si => ({href: si.value, label: si.label!, ariaLabel: si.label!}))
}


function getHref(si: any) {
  if(!si.reference)
    return ''
  if(typeof si.reference.value == 'string')
    return si.reference.value + (si.sectionId ? ('#' + si.sectionId) : '')
  switch (si.reference.relationTo) {
    case 'pages':
      return '/'+si.reference.value.slug + (si.sectionId ? ('#' + si.sectionId) : '')
    case 'posts':
      return '/posts/'+si.reference.value.slug + (si.sectionId ? ('#' + si.sectionId) : '')
    case 'events':
      return '/events/'+si.reference.value.slug + (si.sectionId ? ('#' + si.sectionId) : '')
  }
}