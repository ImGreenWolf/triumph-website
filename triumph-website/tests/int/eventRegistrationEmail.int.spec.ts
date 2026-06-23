import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  generateParticipationAttendanceEmailHTML,
  generateParticipationAttendanceEmailSubject,
  generateParticipationAttendanceEmailText,
  generateParticipationConfirmationEmailHTML,
  generateParticipationConfirmationEmailSubject,
  generateParticipationConfirmationEmailText,
  generateParticipationUpdateEmailHTML,
  generateParticipationUpdateEmailSubject,
  generateParticipationUpdateEmailText,
} from '@/collections/Events/registrationEmails'

const emailArgs = {
  dayLabel: 'luni, 23 iunie 2026',
  event: {
    cardColor: '#ffffff',
    name: 'Crosul Triumph',
    primaryColor: '#0f172c',
    secondaryColor: '#00a2e0',
    slug: 'crosul-triumph',
    useColors: true,
  },
  registration: {
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
    expect(generateParticipationConfirmationEmailSubject('Crosul Triumph')).toBe(
      'Confirmare participare Crosul Triumph',
    )
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
