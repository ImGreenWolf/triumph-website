// @vitest-environment node
import React from 'react'
import { PassThrough } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

const { find, findByID, getPayload } = vi.hoisted(() => {
  const find = vi.fn()
  const findByID = vi.fn()
  return {
    find,
    findByID,
    getPayload: vi.fn(async () => ({
      find,
      findByID,
      count: vi.fn(async () => ({ totalDocs: 0 })),
      logger: { error: vi.fn() },
    })),
  }
})
vi.mock('payload', () => ({ getPayload }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
// Rendering tests use an available, ordinary form; recruitment scheduling has
// separate tests and must not hold the form fields behind its loading state.
vi.mock('@/components/RecruitmentStatus', () => ({
  useRecruitmentStatus: () => ({
    status: { isRecruitmentForm: false, isOpen: true },
    error: false,
    retry: vi.fn(),
  }),
}))

import ServerRichText from '@/components/RichText/server'
import { StatsBlock } from '@/blocks/StatsBlock/Component'

const form = {
  id: 'form-richtext',
  title: 'Formular în text',
  fields: [{ blockType: 'text', name: 'name', label: 'Numele tău', required: true }],
  confirmationType: 'message',
  submitButtonLabel: 'Trimite mesajul',
}
const stats = {
  blockType: 'statsBlock' as const,
  stats: [{ value: 1200, unit: 'ore de voluntariat', label: 'Timp oferit comunității' }],
}
const documentWith = (...blocks: Record<string, unknown>[]): DefaultTypedEditorState =>
  ({
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: blocks.map((fields) => ({ type: 'block', version: 2, format: '', fields })),
    },
  }) as unknown as DefaultTypedEditorState

async function markup(element: React.ReactNode) {
  const output = new PassThrough()
  const chunks: Buffer[] = []
  output.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
  await new Promise<void>((resolve, reject) => {
    output.on('end', resolve)
    output.on('error', reject)
    const stream = renderToPipeableStream(element, {
      onAllReady: () => stream.pipe(output),
      onError: reject,
    })
  })
  return Buffer.concat(chunks).toString()
}

describe('rich-text Stats and Form blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    find.mockResolvedValue({
      docs: [{ id: 'event', slug: 'proiect', name: 'Proiect pentru comunitate' }],
    })
    findByID.mockResolvedValue(form)
  })

  it('renders both serialized block types inside rich text without nested page gutters', async () => {
    const html = await markup(
      <ServerRichText
        enableGutter={false}
        data={documentWith(
          { ...stats, showEvents: false },
          { blockType: 'formBlock', enableIntro: false, form },
        )}
      />,
    )
    expect(html).toContain('Timp oferit comunității')
    expect(html).toContain('Formular în text')
    expect(html).toContain('Numele tău')
    expect(html).toContain('not-prose')
    expect(html).not.toMatch(/class="(?:container(?: |")|[^"]* container(?: |"))/)
    expect(html.indexOf('Timp oferit comunității')).toBeLessThan(html.indexOf('Formular în text'))
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('skips Payload initialization and event reads when the checkbox is off', async () => {
    const html = await markup(await StatsBlock({ ...stats, showEvents: false }))
    expect(html).toContain('Timp oferit comunității')
    expect(html).not.toContain('Evenimentele Noastre')
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('keeps events visible for existing blocks without a checkbox value', async () => {
    const html = await markup(await StatsBlock(stats))
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'events', limit: 5 }))
    expect(html).toContain('Evenimentele Noastre')
    expect(html).toContain('/events/proiect')
  })

  it('keeps legacy null values enabled until the checkbox is explicitly unchecked', async () => {
    const html = await markup(await StatsBlock({ ...stats, showEvents: null }))
    expect(html).toContain('Evenimentele Noastre')
  })

  it('does not render an empty event panel when the checked query has no events', async () => {
    find.mockResolvedValue({ docs: [] })
    const html = await markup(await StatsBlock({ ...stats, showEvents: true }))
    expect(find).toHaveBeenCalledOnce()
    expect(html).not.toContain('Evenimentele Noastre')
    expect(html).not.toContain('block-stats-event-slot')
  })

  it('resolves a saved form relationship using the public read permissions', async () => {
    const html = await markup(
      <ServerRichText
        enableGutter={false}
        data={documentWith({
          blockType: 'formBlock',
          enableIntro: false,
          form: form.id,
        })}
      />,
    )
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'forms',
        id: form.id,
        overrideAccess: false,
      }),
    )
    expect(html).toContain('Numele tău')
    expect(html).toContain('Trimite mesajul')
  })

  it('handles a missing form relationship without broken controls', async () => {
    findByID.mockResolvedValue(null)
    const html = await markup(
      <ServerRichText
        enableGutter={false}
        data={documentWith({
          blockType: 'formBlock',
          enableIntro: false,
          form: 'missing',
        })}
      />,
    )
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
  })
})
