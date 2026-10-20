import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VideoHero } from '@/heros/VideoHero'
import type { Media, Page } from '@/payload-types'

const params = new URLSearchParams(location.search)
const scenario = params.get('case') || 'normal'
const once = scenario.startsWith('once')
const asset = (url: string, mimeType: string) =>
  ({
    id: url,
    url,
    mimeType,
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
    alt: 'Triumph',
    width: 1600,
    height: 1000,
  }) as Media
const entries =
  scenario === 'long'
    ? ['Împreună construim o lume mai bună', 'Extraordinar'.repeat(5)]
    : scenario === 'unsupported'
      ? ['Triumph 漢 🎉']
      : scenario === 'single'
        ? ['Triumph']
        : ['Împreună', 'Schimbăm lumea', 'Triumph']
const config = {
  loop: !once,
  entries: entries.map((text) => ({ text })),
  initialDelay: scenario === 'delayed' ? 3 : 0.2,
  writingDuration: once ? 0.2 : 0.6,
  holdDuration: once ? 0.15 : 1,
  fadeDuration: 0.2,
  entryGap: once ? 0.05 : 0.1,
  buttonRevealDuration: 0.2,
}
const hero: Page['hero'] = {
  type: 'videoHero',
  title:
    scenario === 'onceEmpty'
      ? undefined
      : ['mediaTitle', 'onceMedia'].includes(scenario)
        ? { inputType: 'media', media: asset('/poster.svg', 'image/svg+xml') }
        : { inputType: 'text', text: 'Existing title' },
  handwriting: ['fallback', 'mediaTitle'].includes(scenario) ? {} : config,
  richText: {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', text: 'Împreună transformăm ideile în fapte.', version: 1 }],
        },
      ],
    },
  },
  links: [
    { link: { type: 'custom', url: '#join', label: 'Alătură-te nouă', appearance: 'default' } },
    {
      link: {
        type: 'custom',
        url: '#discover',
        label: 'Descoperă proiectele',
        appearance: 'outline',
      },
    },
  ],
  mediaLandscape: asset('/desktop.mp4', 'video/mp4'),
  mediaVertical: asset('/mobile.mp4', 'video/mp4'),
  posterLandscape: asset('/poster.svg', 'image/svg+xml'),
  posterVertical: asset('/poster.svg', 'image/svg+xml'),
}

function Fixture() {
  const [handwriting, setHandwriting] = useState(hero.handwriting)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = (event: Event) => setHandwriting((event as CustomEvent).detail)
    const hide = () => setVisible(false)
    window.addEventListener('hero-config', update)
    window.addEventListener('hero-unmount', hide)
    return () => {
      window.removeEventListener('hero-config', update)
      window.removeEventListener('hero-unmount', hide)
    }
  }, [])
  return visible ? <VideoHero {...hero} handwriting={handwriting} /> : <p>Unmounted</p>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
