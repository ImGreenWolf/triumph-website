import type { Event, Page } from '@/payload-types'

type Layout = Page['layout']
export function prepareHomepageLayout(
  page: Pick<Page, 'layout'>,
  events: Pick<Event, 'id' | 'slug'>[],
) {
  const highlightedIDs: string[] = []
  const movedHistory: Layout = []
  const movedRotary: Layout = []
  const kept: Layout = []
  const removedDecoration: Layout = []
  let movingHistory = false
  const hasSection = page.layout.some((block) => block.blockType === 'homepageEvents')
  const eventBySlug = new Map(events.map((event) => [event.slug, event.id]))
  for (const block of page.layout) {
    if (block.blockType === 'sectionTitle' && /istorie/i.test(block.title ?? '')) {
      movingHistory = true
      movedHistory.push(block)
      continue
    }
    if (movingHistory && block.blockType === 'content') {
      movedHistory.push(block)
      movingHistory = false
      continue
    }
    movingHistory = false
    if (block.blockType === 'aboutUs') {
      movedRotary.push(block)
      continue
    }
    if (block.blockType === 'textLoop') {
      removedDecoration.push(block)
      continue
    }
    if (
      !hasSection &&
      block.blockType === 'accordionGallery' &&
      block.items?.every((item) => item.link.url?.startsWith('/events/'))
    ) {
      for (const item of block.items ?? []) {
        const slug = item.link.url?.split('/events/')[1]?.split(/[?#]/)[0]
        const id = slug ? eventBySlug.get(slug) : undefined
        if (id) highlightedIDs.push(id)
      }
      // Keep an unmatched gallery for an editor to resolve rather than discard its content.
      if (highlightedIDs.length !== block.items.length) {
        kept.push(block)
        continue
      }
      kept.push({
        blockType: 'homepageEvents',
        title: 'Evenimentele noastre',
        introContent: block.introContent,
        presentation: 'gallery',
        highlightGallery: {
          items: block.items,
          showLabels: block.showLabels,
          expandRatio: block.expandRatio,
        },
        highlightedEvents: [...new Set(highlightedIDs)],
        archiveLabel: 'Vezi toate evenimentele',
      })
      continue
    }
    if (block.blockType === 'statsBlock') kept.push({ ...block, showEvents: false })
    else if (block.blockType === 'faqBlock')
      kept.push({
        ...block,
        eyebrow: 'Întrebări și răspunsuri',
        supportingText: 'Mai ai întrebări? Scrie-ne și te ajutăm să găsești răspunsul.',
        supportingLinkLabel: 'Contactează-ne',
        faqs: block.faqs?.map((faq) =>
          /cum.*(?:înscri|inscri)/i.test(faq.question)
            ? { ...faq, answerSource: 'recruitment' as const }
            : faq,
        ),
      })
    else if (block.blockType === 'cta')
      kept.push({
        ...block,
        links: block.links?.map((item) => ({
          ...item,
          link: {
            ...item.link,
            label: item.link.label === 'Înscriere-te' ? 'Înscrie-te' : item.link.label,
          },
        })),
      })
    else kept.push(block)
  }
  return { layout: kept, movedHistory, movedRotary, removedDecoration }
}
