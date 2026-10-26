/** Add the events section to the homepage draft without changing other draft edits or publishing. */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { consolidateHomepageEvents } from '../src/utilities/homepageEventsLayout'
const payload = await getPayload({ config })
try {
  const read = async (draft: boolean) =>
    (
      await payload.find({
        collection: 'pages',
        draft,
        depth: 0,
        limit: 1,
        where: { slug: { equals: 'home' } },
      })
    ).docs[0]
  const [published, draft] = await Promise.all([read(false), read(true)])
  if (!published || !draft) throw new Error('Homepage not found')
  const events = (
    await payload.find({
      collection: 'events',
      overrideAccess: false,
      draft: false,
      depth: 0,
      pagination: false,
      select: { slug: true },
      where: { _status: { equals: 'published' } },
    })
  ).docs
  const original = consolidateHomepageEvents(published.layout, events).find(
    (block) => block.blockType === 'homepageEvents',
  )
  const layout = consolidateHomepageEvents(draft.layout, events).map((block) =>
    block.blockType === 'homepageEvents'
      ? {
          ...block,
          presentation: block.presentation ?? 'gallery',
          introContent: block.introContent ?? original?.introContent,
          highlightGallery: block.highlightGallery?.items?.length
            ? block.highlightGallery
            : original?.highlightGallery,
        }
      : block,
  )
  if (process.argv.includes('--save-draft'))
    await payload.update({
      collection: 'pages',
      id: draft.id,
      draft: true,
      context: { disableRevalidate: true },
      data: { layout, _status: 'draft' },
    })
  const section = layout.find((block) => block.blockType === 'homepageEvents')
  console.log(
    JSON.stringify({
      savedDraft: process.argv.includes('--save-draft'),
      highlightedEvents: section?.highlightedEvents?.length,
      preservedArtwork: section?.highlightGallery?.items?.length,
      presentation: section?.presentation,
    }),
  )
} finally {
  await payload.destroy()
}
process.exit(0)
