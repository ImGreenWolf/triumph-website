import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utilities/getGlobals', () => ({
  getCachedGlobal: () => async () => ({ defaultDescription: 'Club Triumph' }),
}))
vi.mock('@/utilities/getURL', () => ({ getServerSideURL: () => 'https://example.test' }))

import { generateMeta } from '@/utilities/generateMeta'

describe('metadata for header destinations and redirects', () => {
  it('allows a missing source page to reach its redirect or not-found handler', async () => {
    const metadata = await generateMeta({ doc: null })
    expect(metadata.title).toBe('Interact Bucureşti Triumph')
    expect(metadata.openGraph?.description).toBe('Club Triumph')
  })

  it('preserves existing page and event titles', async () => {
    const page = await generateMeta({ doc: { title: 'Team', meta: { title: 'Our team' } } })
    const event = await generateMeta({ doc: { name: 'Event title' } })
    expect(page.title).toBe('Our team')
    expect(event.title).toBe('Event title')
  })
})

const redirectMocks = vi.hoisted(() => ({
  redirects: [] as { from: string; to: { url: string } }[],
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))
vi.mock('@/utilities/getRedirects', () => ({
  getCachedRedirects: () => async () => redirectMocks.redirects,
}))
vi.mock('@/utilities/getDocument', () => ({ getCachedDocument: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: redirectMocks.redirect, notFound: redirectMocks.notFound }))

import { PayloadRedirects } from '@/components/PayloadRedirects'

describe('unpublished header destination fallback', () => {
  it('uses the existing Rotary page until the replacement page is published', async () => {
    redirectMocks.redirects = []
    await expect(PayloadRedirects({ url: '/familia-rotary', fallbackUrl: '/ce-este-rotary' }))
      .rejects.toThrow('NEXT_REDIRECT:/ce-este-rotary')
  })

  it('keeps editor-configured redirects ahead of the fallback', async () => {
    redirectMocks.redirects = [{ from: '/familia-rotary', to: { url: '/custom-rotary-page' } }]
    await expect(PayloadRedirects({ url: '/familia-rotary', fallbackUrl: '/ce-este-rotary' }))
      .rejects.toThrow('NEXT_REDIRECT:/custom-rotary-page')
  })

  it('preserves not-found behavior for other missing pages', async () => {
    redirectMocks.redirects = []
    await expect(PayloadRedirects({ url: '/unknown-page' })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
