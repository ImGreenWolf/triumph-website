import type { PayloadRequest } from 'payload'

import type { Event, EventRegistration } from '@/payload-types'
import { getContrastTextColor } from '@/utilities/eventDisplay'
import { getServerSideURL } from '@/utilities/getURL'

type ParticipationConfirmationEmailArgs = {
  dayLabel: string
  event: Pick<
    Event,
    'cardColor' | 'name' | 'primaryColor' | 'secondaryColor' | 'slug' | 'useColors'
  >
  registration: Pick<EventRegistration, 'name'>
  req?: PayloadRequest
  slotLabel: string
}

type RegistrationEmailContent = {
  badge: string
  body: string
  heading: string
  preheader: string
}

export function generateParticipationConfirmationEmailHTML(
  args: ParticipationConfirmationEmailArgs,
) {
  return generateEventRegistrationEmailHTML(args, {
    badge: 'Înscriere confirmată',
    body: 'Îți mulțumim pentru înscriere. Păstrează acest email pentru a avea programul la îndemână.',
    heading: `Te așteptăm la ${args.event.name}`,
    preheader: `Înscrierea ta la ${args.event.name} a fost confirmată.`,
  })
}

export function generateParticipationAttendanceEmailHTML(args: ParticipationConfirmationEmailArgs) {
  return generateEventRegistrationEmailHTML(args, {
    badge: 'Participare confirmată',
    body: 'Am înregistrat prezența ta la eveniment. Îți mulțumim că ai fost alături de noi!',
    heading: `Mulțumim pentru participarea la ${args.event.name}`,
    preheader: `Prezența ta la ${args.event.name} a fost confirmată.`,
  })
}

export function generateParticipationUpdateEmailHTML(args: ParticipationConfirmationEmailArgs) {
  return generateEventRegistrationEmailHTML(args, {
    badge: 'Participare actualizată',
    body: 'Detaliile participării tale au fost actualizate. Mai jos găsești programul curent.',
    heading: `Participarea la ${args.event.name} a fost actualizată`,
    preheader: `Detaliile participării tale la ${args.event.name} au fost actualizate.`,
  })
}

function generateEventRegistrationEmailHTML(
  args: ParticipationConfirmationEmailArgs,
  content: RegistrationEmailContent,
) {
  const baseURL = getEmailBaseURL(args.req)
  const eventURL = `${baseURL}/events/${encodeURIComponent(args.event.slug)}`
  const logoURL = `${baseURL}/logo_full.png`
  const participantName = escapeHTML(args.registration.name)
  const eventName = escapeHTML(args.event.name)
  const dayLabel = escapeHTML(args.dayLabel)
  const slotLabel = escapeHTML(args.slotLabel)
  const safeEventURL = escapeHTML(eventURL)
  const safeLogoURL = escapeHTML(logoURL)
  const theme = getEmailTheme(args.event)
  const badge = escapeHTML(content.badge)
  const body = escapeHTML(content.body)
  const heading = escapeHTML(content.heading)
  const preheader = escapeHTML(content.preheader)

  return `
<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:0; background:#eef3f8; color:#0f172c; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${preheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background:#eef3f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; max-width:640px; overflow:hidden; border-radius:18px; background:#ffffff; box-shadow:0 18px 48px rgba(15,23,44,0.14);">
            <tr>
              <td style="padding:28px 30px 34px; background:${theme.background}; color:${theme.backgroundForeground};">
                <img src="${safeLogoURL}" alt="Interact București Triumph" width="220" style="display:block; max-width:220px; width:100%; height:auto; margin-bottom:28px;" />
                <div style="display:inline-block; margin-bottom:14px; padding:6px 10px; border:1px solid ${theme.accent}; border-radius:999px; color:${theme.accent}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                  ${badge}
                </div>
                <h1 style="margin:0; color:${theme.backgroundForeground}; font-size:30px; line-height:1.15; font-weight:800;">
                  ${heading}
                </h1>
                <p style="margin:14px 0 0; max-width:520px; color:${theme.backgroundForeground}; opacity:0.76; font-size:16px; line-height:1.6;">
                  Mai jos găsești detaliile participării.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 30px 18px;">
                <p style="margin:0 0 12px; color:#0f172c; font-size:16px; line-height:1.6;">
                  Salut, <strong>${participantName}</strong>!
                </p>
                <p style="margin:0; color:#526071; font-size:15px; line-height:1.7;">
                  ${body}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-radius:14px; background:${theme.card}; color:${theme.cardForeground};">
                  <tr>
                    <td style="padding:22px 22px 8px; border-left:4px solid ${theme.accent};">
                      <p style="margin:0 0 5px; color:${theme.cardForeground}; opacity:0.62; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Eveniment</p>
                      <p style="margin:0; color:${theme.cardForeground}; font-size:18px; font-weight:800; line-height:1.4;">${eventName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 22px 8px; border-left:4px solid ${theme.accent};">
                      <p style="margin:0 0 5px; color:${theme.cardForeground}; opacity:0.62; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Ziua</p>
                      <p style="margin:0; color:${theme.cardForeground}; font-size:15px; font-weight:700; line-height:1.5;">${dayLabel}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 22px 22px; border-left:4px solid ${theme.accent};">
                      <p style="margin:0 0 5px; color:${theme.cardForeground}; opacity:0.62; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Interval</p>
                      <p style="margin:0; color:${theme.cardForeground}; font-size:15px; font-weight:700; line-height:1.5;">${slotLabel}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:26px 30px 30px;">
                <a href="${safeEventURL}" style="display:inline-block; border-radius:10px; background:${theme.accent}; color:${theme.accentForeground}; font-size:15px; font-weight:800; line-height:1; padding:16px 22px; text-decoration:none;">
                  Vezi pagina evenimentului
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 30px; background:#0f172c;">
                <p style="margin:0; color:rgba(255,255,255,0.68); font-size:12px; line-height:1.5;">
                  Interact București Triumph · Service Above Self
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim()
}

export function generateParticipationConfirmationEmailText(
  args: ParticipationConfirmationEmailArgs,
) {
  return generateEventRegistrationEmailText(
    args,
    `Înscrierea ta la ${args.event.name} a fost confirmată.`,
  )
}

export function generateParticipationConfirmationEmailSubject(eventName: string) {
  return `Confirmare participare ${eventName}`
}

export function generateParticipationAttendanceEmailText(args: ParticipationConfirmationEmailArgs) {
  return generateEventRegistrationEmailText(
    args,
    `Îți mulțumim pentru prezența la ${args.event.name}. Participarea ta a fost confirmată.`,
  )
}

export function generateParticipationAttendanceEmailSubject(eventName: string) {
  return `Mulțumim pentru participare ${eventName}`
}

export function generateParticipationUpdateEmailText(args: ParticipationConfirmationEmailArgs) {
  return generateEventRegistrationEmailText(
    args,
    `Detaliile participării tale la ${args.event.name} au fost actualizate.`,
  )
}

export function generateParticipationUpdateEmailSubject(eventName: string) {
  return `Modificare participare ${eventName}`
}

function generateEventRegistrationEmailText(
  args: ParticipationConfirmationEmailArgs,
  message: string,
) {
  const eventURL = `${getEmailBaseURL(args.req)}/events/${encodeURIComponent(args.event.slug)}`

  return [
    `Salut, ${args.registration.name}!`,
    '',
    message,
    `Ziua: ${args.dayLabel}`,
    `Interval: ${args.slotLabel}`,
    '',
    `Detalii: ${eventURL}`,
  ].join('\n')
}

function getEmailTheme(event: ParticipationConfirmationEmailArgs['event']) {
  const colorsEnabled = event.useColors === true
  const background = colorsEnabled ? normalizeColor(event.primaryColor, '#0f172c') : '#0f172c'
  const accent = colorsEnabled ? normalizeColor(event.secondaryColor, '#00a2e0') : '#00a2e0'
  const card = colorsEnabled ? normalizeColor(event.cardColor, '#f7fafc') : '#f7fafc'

  return {
    accent,
    accentForeground: getContrastTextColor(accent) ?? '#ffffff',
    background,
    backgroundForeground: getContrastTextColor(background) ?? '#ffffff',
    card,
    cardForeground: getContrastTextColor(card) ?? '#0f172c',
  }
}

function normalizeColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function getEmailBaseURL(req?: PayloadRequest) {
  const origin = req?.origin || req?.headers?.get('origin') || getServerSideURL()
  return origin.replace(/\/$/, '')
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
