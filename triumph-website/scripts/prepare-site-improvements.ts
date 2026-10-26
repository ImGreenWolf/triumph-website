/** Prepare reviewable CMS drafts. Never publishes; safe to rerun. */
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Header, Page } from '../src/payload-types'
import { prepareHomepageLayout } from '../src/utilities/homepageDraft'

const save = process.argv.includes('--save-drafts')
const periodArgument = process.argv.indexOf('--reporting-period')
const confirmedPeriod = periodArgument >= 0 ? process.argv[periodArgument + 1]?.trim() : undefined
const payload = await getPayload({ config })
try {
  const home = (
    await payload.find({
      collection: 'pages',
      draft: true,
      depth: 0,
      limit: 1,
      where: { slug: { equals: 'home' } },
    })
  ).docs[0]
  if (!home) throw new Error('Homepage not found')
  const events = (
    await payload.find({
      collection: 'events',
      overrideAccess: false,
      draft: false,
      pagination: false,
      depth: 0,
      select: { slug: true },
      where: { _status: { equals: 'published' } },
    })
  ).docs
  const prepared = prepareHomepageLayout(home, events)
  if (confirmedPeriod)
    prepared.layout = prepared.layout.map((block) =>
      block.blockType === 'statsBlock' ? { ...block, reportingPeriod: confirmedPeriod } : block,
    )
  const existingHeader = await payload.findGlobal({ slug: 'header', draft: true, depth: 0 })
  const existingFooter = await payload.findGlobal({ slug: 'footer', draft: true, depth: 0 })
  const custom = (label: string, url: string) => ({ type: 'custom' as const, label, url })
  const group = (label: string, url: string, links: [string, string][]) => ({
    link: custom(label, url),
    reference: links.map(([title, href]) => ({ link: custom(title, href) })),
  })
  const navCategory: Header['navCategory'] = [
    group('Despre club', '/istoria-clubului', [
      ['Istoria clubului', '/istoria-clubului'],
      ['Echipa noastră', '/echipa-noastra'],
      ['Familia Rotary', '/familia-rotary'],
    ]),
    group('Participă', '/events', [
      ['Evenimente', '/events'],
      ['Înscrie-te în club', '/inscrie-te'],
      ['Galerie', '/gallery'],
      ['Contact', '/contact'],
    ]),
    group('Membri', '/members', [
      ['Contul meu', '/members'],
      ['Profilul meu', '/members/profile'],
    ]),
  ]
  const footer = {
    ...existingFooter,
    backToTopLabel: 'Înapoi sus',
    legalLinks: existingFooter.legalLinks?.map((link) => ({
      ...link,
      label:
        link.label === 'Cookie Policy'
          ? 'Politica de cookie-uri'
          : link.label === 'Privacy Policy'
            ? 'Confidențialitate'
            : link.label,
    })),
  }
  const report = {
    homepageID: home.id,
    homepage: prepared,
    header: { ...existingHeader, navCategory },
    footer,
    editorialNotes: [
      confirmedPeriod
        ? `Perioada cifrelor de impact confirmată de club: ${confirmedPeriod}.`
        : 'Confirmă perioada și sursa cifrelor de impact înainte de publicare.',
      'Selectează evenimentul viitor evidențiat, când există unul.',
      'Publică pagina Familia Rotary înaintea navigației care o referă.',
    ],
  }
  await mkdir('.impeccable/review/site-improvements', { recursive: true })
  await writeFile(
    '.impeccable/review/site-improvements/content-drafts.json',
    JSON.stringify(report, null, 2),
  )
  if (save) {
    const context = { disableRevalidate: true }
    const heading = (title: string) => ({
      root: {
        type: 'root',
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
        children: [
          {
            type: 'heading',
            tag: 'h1',
            direction: null,
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'text',
                text: title,
                format: 0,
                detail: 0,
                mode: 'normal',
                style: '',
                version: 1,
              },
            ],
          },
        ],
      },
    })
    const updateDetail = async (slug: string, title: string, blocks: Page['layout']) => {
      if (!blocks.length && slug !== 'familia-rotary') return
      const existing = (
        await payload.find({
          collection: 'pages',
          draft: true,
          depth: 0,
          limit: 1,
          where: { slug: { equals: slug } },
        })
      ).docs[0]
      if (existing) {
        const knownIDs = new Set(existing.layout.map((block) => block.id))
        const additions = blocks.filter((block) => !block.id || !knownIDs.has(block.id))
        if (additions.length || !existing.hero.richText)
          await payload.update({
            collection: 'pages',
            id: existing.id,
            draft: true,
            context,
            data: {
              hero: existing.hero.richText
                ? existing.hero
                : { ...existing.hero, richText: heading(title) },
              layout: [...existing.layout, ...additions],
              _status: 'draft',
            },
          })
      } else
        await payload.create({
          collection: 'pages',
          draft: true,
          context,
          data: {
            title,
            slug,
            hero: { type: 'lowImpact', richText: heading(title) },
            layout: blocks,
            _status: 'draft',
          },
        })
    }
    await updateDetail('istoria-clubului', 'Istoria clubului', prepared.movedHistory)
    await updateDetail('familia-rotary', 'Familia Rotary', prepared.movedRotary)
    await payload.update({
      collection: 'pages',
      id: home.id,
      draft: true,
      context,
      data: {
        title: home.title === 'Home' ? 'Acasă' : home.title,
        meta: { ...home.meta, title: home.meta?.title?.replace(/^Home\b/, 'Acasă') },
        layout: prepared.layout,
        _status: 'draft',
      },
    })
    await payload.updateGlobal({ slug: 'header', draft: true, context, data: { navCategory } })
    await payload.updateGlobal({
      slug: 'footer',
      draft: true,
      context,
      data: { backToTopLabel: footer.backToTopLabel, legalLinks: footer.legalLinks },
    })
  }
  console.log(
    JSON.stringify({
      savedDrafts: save,
      homepageBlocks: prepared.layout.map((block) => block.blockType),
      highlightedSection: prepared.layout.find((block) => block.blockType === 'homepageEvents'),
      movedHistory: prepared.movedHistory.length,
      movedRotary: prepared.movedRotary.length,
      review: '.impeccable/review/site-improvements/content-drafts.json',
    }),
  )
} finally {
  await payload.destroy()
}
process.exit(0)
