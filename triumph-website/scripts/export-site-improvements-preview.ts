/** Read-only export for a local component preview. Contains no users or credentials. */
import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
const payload = await getPayload({ config })
try {
  const readHome = async (draft: boolean) =>
    (
      await payload.find({
        collection: 'pages',
        draft,
        depth: 1,
        limit: 1,
        where: { slug: { equals: 'home' } },
      })
    ).docs[0]
  const published = await readHome(false)
  const draft = await readHome(true)
  const section = draft?.layout.find((block) => block.blockType === 'homepageEvents')
  const header = await payload.findGlobal({ slug: 'header', draft: true, depth: 0 })
  const publicHeader = await payload.findGlobal({ slug: 'header', draft: false, depth: 0 })
  const events = (
    await payload.find({
      collection: 'events',
      depth: 1,
      pagination: false,
      overrideAccess: false,
      draft: false,
      select: { name: true, slug: true, meta: true, heroImage: true, location: true, days: true },
      where: { _status: { equals: 'published' } },
    })
  ).docs
  const highlightedIDs =
    section?.highlightedEvents?.map((event) => (typeof event === 'string' ? event : event.id)) ?? []
  const data = {
    title: section?.title,
    description: section?.description,
    highlights: highlightedIDs.flatMap((id) =>
      events.find((event) => event.id === id) ? [events.find((event) => event.id === id)!] : [],
    ),
    nav: header.navCategory?.map((group) => ({
      label: group.link.label,
      link: group.link.url || '/',
      bgColor: 'var(--background)',
      textColor: 'var(--card-foreground)',
      links:
        group.reference?.map((item) => ({
          label: item.link.label,
          href: item.link.url || '/',
          ariaLabel: item.link.label,
        })) || [],
    })),
  }
  await writeFile(
    '.impeccable/review/site-improvements/preview-data.json',
    JSON.stringify(data, null, 2),
  )
  console.log(
    JSON.stringify({
      publishedHomeUnchanged: !published?.layout.some(
        (block) => block.blockType === 'homepageEvents',
      ),
      draftHome: draft?.layout.map((block) => block.blockType),
      publishedNavigation: publicHeader.navCategory?.map((group) => group.link.label),
      draftNavigation: header.navCategory?.map((group) => group.link.label),
      highlightedEvents: data.highlights.length,
    }),
  )
} finally {
  await payload.destroy()
}
process.exit(0)
