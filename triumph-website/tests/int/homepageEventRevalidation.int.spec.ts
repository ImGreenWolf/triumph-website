import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePost, revalidateDelete } from '@/collections/Events/hooks/revalidatePost'
const { path, tag } = vi.hoisted(() => ({ path: vi.fn(), tag: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: path, revalidateTag: tag }))
beforeEach(() => vi.clearAllMocks())
describe('homepage featured event freshness', () => {
  it('refreshes the homepage and archive when a new event is published', async () => {
    await revalidatePost({
      doc: { slug: 'new', _status: 'published' },
      previousDoc: undefined,
      req: { context: {} },
    } as unknown as Parameters<typeof revalidatePost>[0])
    expect(path.mock.calls.map(([value]) => value)).toEqual(['/events/new', '/', '/events'])
  })
  it('removes unpublished and deleted events from the homepage selection', async () => {
    await revalidatePost({
      doc: { slug: 'event', _status: 'draft' },
      previousDoc: { slug: 'event', _status: 'published' },
      req: { context: {} },
    } as unknown as Parameters<typeof revalidatePost>[0])
    expect(path).toHaveBeenCalledWith('/')
    vi.clearAllMocks()
    await revalidateDelete({
      doc: { slug: 'event' },
      req: { context: {} },
    } as unknown as Parameters<typeof revalidateDelete>[0])
    expect(path).toHaveBeenCalledWith('/')
    expect(path).toHaveBeenCalledWith('/events')
  })
  it('does not invalidate public pages for draft preparation', async () => {
    await revalidatePost({
      doc: { slug: 'event', _status: 'draft' },
      previousDoc: { _status: 'draft' },
      req: { context: {} },
    } as unknown as Parameters<typeof revalidatePost>[0])
    expect(path).not.toHaveBeenCalled()
    await revalidatePost({
      doc: { slug: 'event', _status: 'published' },
      req: { context: { disableRevalidate: true } },
    } as unknown as Parameters<typeof revalidatePost>[0])
    expect(path).not.toHaveBeenCalled()
  })
})
