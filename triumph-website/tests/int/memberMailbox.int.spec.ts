// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readMailboxPreview } from '@/collections/Users/mailUtils'

const { client, release } = vi.hoisted(() => {
  const release = vi.fn()
  return {
    release,
    client: {
      usable: true,
      mailbox: { exists: 5 },
      connect: vi.fn(async () => {}),
      getMailboxLock: vi.fn(async () => ({ release })),
      fetch: vi.fn(async function* () {
        yield { uid: 3, envelope: { subject: 'Third', from: [{ address: 'sender@example.com' }] } }
        yield { uid: 4, envelope: { subject: 'Fourth' } }
        yield { uid: 5, envelope: { subject: 'Fifth' } }
      }),
      logout: vi.fn(async () => {}),
      close: vi.fn(),
    },
  }
})
vi.mock('imapflow', () => ({
  ImapFlow: class {
    constructor() {
      return client
    }
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  client.mailbox.exists = 5
  client.usable = true
})

describe('member mailbox preview', () => {
  it('downloads only the last three envelopes and returns the full inbox count', async () => {
    const result = await readMailboxPreview('member@example.com', 'secret')
    expect(client.fetch).toHaveBeenCalledWith('3:*', { uid: true, envelope: true })
    expect(result.count).toBe(5)
    expect(result.messages.map((message) => message.uid)).toEqual([5, 4, 3])
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(result.messages[2].from).toBe('sender@example.com')
    expect(release).toHaveBeenCalledTimes(1)
    expect(client.logout).toHaveBeenCalledTimes(1)
  })

  it('does not issue an IMAP fetch for an empty inbox', async () => {
    client.mailbox.exists = 0
    await expect(readMailboxPreview('member@example.com', 'secret')).resolves.toEqual({
      count: 0,
      messages: [],
    })
    expect(client.fetch).not.toHaveBeenCalled()
  })

  it('releases the connection and propagates failures so they are not cached as empty mailboxes', async () => {
    client.fetch.mockImplementationOnce(async function* () {
      throw new Error('IMAP unavailable')
    })
    await expect(readMailboxPreview('member@example.com', 'secret')).rejects.toThrow(
      'IMAP unavailable',
    )
    expect(release).toHaveBeenCalledTimes(1)
    expect(client.logout).toHaveBeenCalledTimes(1)
  })
})
