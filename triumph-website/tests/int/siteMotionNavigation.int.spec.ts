// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { transitionDestination } from '@/components/SiteMotion/navigation'

const current = new URL('https://interact-triumph.org/events?year=2026')
function destination(href: string, attributes: Record<string, string> = {}) {
  const link = document.createElement('a')
  link.href = new URL(href, current).href
  Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value))
  return transitionDestination(link, current)
}

describe('page transition navigation eligibility', () => {
  it('keeps the search and section of a different internal page', () => {
    expect(destination('/gallery?year=2026#photos')).toBe('/gallery?year=2026#photos')
  })
  it.each([
    '/events#arhiva',
    '/events?year=2025',
    'https://example.com/',
    'mailto:club@example.com',
    '/api/media/file/photo',
    '/admin',
    '/next/preview',
    '/files/guide.pdf',
  ])('preserves native navigation for %s', (href) => expect(destination(href)).toBeNull())
  it.each<Record<string, string>>([
    { target: '_blank' },
    { download: '' },
    { rel: 'external' },
    { 'data-no-page-transition': '' },
  ])('preserves native link attributes %o', (attributes) =>
    expect(destination('/gallery', attributes)).toBeNull(),
  )
})
