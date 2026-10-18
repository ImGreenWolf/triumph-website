import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export async function readMailbox(user: string, pass: string) {
  const client = new ImapFlow({
    host: process.env.SMTP_HOST!,
    port: 993,
    secure: true,
    auth: {
      user: user,
      pass: pass,
    },
  })

  await client.connect()

  const lock = await client.getMailboxLock('INBOX')

  try {
    const messages = []

    for await (const message of client.fetch('1:*', {
      uid: true,
      envelope: true,
      source: true,
    })) {
      const parsed = await simpleParser(message.source!)

      messages.push({
        uid: message.uid,
        subject: parsed.subject,
        from: parsed.from?.text,
        to: parsed.to,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html,
      })
    }

    return messages
  } finally {
    lock.release()
    await client.logout()
  }
}

/** Dashboard preview: fetch envelopes only, never download or parse message bodies. */
export async function readMailboxPreview(user: string, pass: string) {
  const client = new ImapFlow({
    host: process.env.SMTP_HOST!,
    port: 993,
    secure: true,
    logger: false,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass },
  })
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const count = client.mailbox ? client.mailbox.exists : 0
      const messages: Array<{ uid: number; subject?: string; from?: string; date?: string }> = []
      if (count > 0) {
        for await (const message of client.fetch(`${Math.max(1, count - 2)}:*`, {
          uid: true,
          envelope: true,
        })) {
          const envelope = message.envelope
          messages.push({
            uid: message.uid,
            subject: envelope?.subject,
            from: envelope?.from
              ?.map((sender) => sender.name || sender.address)
              .filter(Boolean)
              .join(', '),
            date: envelope?.date?.toISOString(),
          })
        }
      }
      return { count, messages: messages.reverse() }
    } finally {
      lock.release()
    }
  } finally {
    if (client.usable) await client.logout()
    else client.close()
  }
}
