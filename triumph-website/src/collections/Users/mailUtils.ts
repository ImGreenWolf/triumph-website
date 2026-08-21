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