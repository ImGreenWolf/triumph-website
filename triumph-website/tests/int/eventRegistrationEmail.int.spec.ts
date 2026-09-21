import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  generateParticipationAttendanceEmailHTML,
  generateParticipationAttendanceEmailSubject,
  generateParticipationAttendanceEmailText,
  generateParticipationConfirmationEmailHTML,
  generateParticipationConfirmationEmailQRCodeAttachment,
  generateParticipationConfirmationEmailSubject,
  generateParticipationConfirmationEmailText,
  generateParticipationUpdateEmailHTML,
  generateParticipationUpdateEmailSubject,
  generateParticipationUpdateEmailText,
  REGISTRATION_QR_CODE_CID,
} from '@/collections/Events/registrationEmails'

const emailArgs = {
  dayLabel: 'luni, 23 iunie 2026',
  event: {
    cardColor: '#ffffff',
    donation: '50',
    minimumConsumation: 25,
    name: 'Crosul Triumph',
    primaryColor: '#0f172c',
    secondaryColor: '#00a2e0',
    slug: 'crosul-triumph',
    useColors: true,
  },
  registration: {
    id: 'registration-123',
    name: 'Ana Popescu',
  },
  req: { origin: 'https://triumph.example' } as PayloadRequest,
  slotLabel: '10:00 - 12:00',
}

describe('event registration emails', () => {
  it('renders an HTML confirmation with the participation details and event link', () => {
    const html = generateParticipationConfirmationEmailHTML(emailArgs)

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Ana Popescu')
    expect(html).toContain('Crosul Triumph')
    expect(html).toContain('luni, 23 iunie 2026')
    expect(html).toContain('10:00 - 12:00')
    expect(html).toContain('Donație minimă')
    expect(html).toContain('50 RON')
    expect(html).toContain('Consumație minimă')
    expect(html).toContain('25 RON')
    expect(html).toContain('registration-123')
    expect(html).toContain(`cid:${REGISTRATION_QR_CODE_CID}`)
    expect(html).toContain('https://triumph.example/events/crosul-triumph')
    expect(html).toContain('background:#00a2e0')
  })

  it('escapes participant and event values before inserting them into HTML', () => {
    const html = generateParticipationConfirmationEmailHTML({
      ...emailArgs,
      event: { ...emailArgs.event, name: '<script>alert(1)</script>' },
      registration: { name: '<img src=x onerror=alert(1)>' },
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('keeps a plain-text fallback and subject', () => {
    const text = generateParticipationConfirmationEmailText(emailArgs)

    expect(text).toContain('Înscrierea ta la Crosul Triumph a fost confirmată.')
    expect(text).toContain('Ziua: luni, 23 iunie 2026')
    expect(text).toContain('Donație minimă: 50 RON')
    expect(text).toContain('Consumație minimă: 25 RON')
    expect(text).toContain('ID înscriere: registration-123')
    expect(generateParticipationConfirmationEmailSubject('Crosul Triumph')).toBe(
      'Confirmare participare Crosul Triumph',
    )
  })

  it('creates a PNG QR attachment containing the registration id', async () => {
    const attachment =
      await generateParticipationConfirmationEmailQRCodeAttachment('registration-123')

    expect(attachment.cid).toBe(REGISTRATION_QR_CODE_CID)
    expect(attachment.contentType).toBe('image/png')
    expect(attachment.filename).toBe('event-registration-registration-123.png')
    expect(Buffer.isBuffer(attachment.content)).toBe(true)
    expect(attachment.content.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  })

  it('renders HTML and text for attendance confirmation', () => {
    const html = generateParticipationAttendanceEmailHTML(emailArgs)
    const text = generateParticipationAttendanceEmailText(emailArgs)

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Participare confirmată')
    expect(html).toContain('Mulțumim pentru participarea la Crosul Triumph')
    expect(html).toContain('Ana Popescu')
    expect(html).toContain('10:00 - 12:00')
    expect(text).toContain('Participarea ta a fost confirmată.')
    expect(generateParticipationAttendanceEmailSubject('Crosul Triumph')).toBe(
      'Mulțumim pentru participare Crosul Triumph',
    )
  })

  it('renders HTML and text for registration updates', () => {
    const html = generateParticipationUpdateEmailHTML(emailArgs)
    const text = generateParticipationUpdateEmailText(emailArgs)

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Participare actualizată')
    expect(html).toContain('Participarea la Crosul Triumph a fost actualizată')
    expect(html).toContain('luni, 23 iunie 2026')
    expect(html).toContain('https://triumph.example/events/crosul-triumph')
    expect(text).toContain('Detaliile participării tale la Crosul Triumph au fost actualizate.')
    expect(generateParticipationUpdateEmailSubject('Crosul Triumph')).toBe(
      'Modificare participare Crosul Triumph',
    )
  })
})
