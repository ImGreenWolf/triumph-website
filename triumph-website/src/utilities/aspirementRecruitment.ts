import { randomBytes } from 'node:crypto'

import type { Application, AspirementConfig, Comission, FormSubmission } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

type LexicalNode = {
  children?: LexicalNode[]
  fields?: {
    url?: string | null
  }
  tag?: string
  text?: string
  type?: string
  url?: string | null
}

type LexicalValue = {
  root?: LexicalNode
}

export type RecruitmentApplication = Application & {
  reviewProcess?: Application['reviewProcess'] & {
    finalMailSentAt?: string | null
    finalMailSentBy?: string | null
    interviewMailSentAt?: string | null
    interviewMailSentBy?: string | null
    interviewScheduleToken?: string | null
    interviewScheduleTokenCreatedAt?: string | null
  }
}

export type InterviewSlot = {
  end: string
  id: string
  label: string
  start: string
}

type RecruitmentMessageResult = {
  html: string
  text: string
  unresolvedPlaceholders: string[]
}

export function generateInterviewScheduleToken() {
  return randomBytes(24).toString('base64url')
}

export function getInterviewScheduleURL(token: string, request?: Request) {
  const baseURL = getRequestBaseURL(request)
  return `${baseURL}/aspirement/interview/${encodeURIComponent(token)}`
}

export function getRequestBaseURL(request?: Request) {
  const origin = request?.headers.get('origin') || getServerSideURL()
  return origin.replace(/\/$/, '')
}

export function generateInterviewSlots(
  intervals: NonNullable<AspirementConfig['recruitment']>['interviewIntervals'],
) {
  const slots: InterviewSlot[] = []

  for (const interval of intervals ?? []) {
    const intervalStart = parseDate(interval.startDateTime)
    const intervalEnd = parseDate(interval.endDateTime)
    const durationMinutes = normalizePositiveNumber(interval.interviewDuration)

    if (!intervalStart || !intervalEnd || !durationMinutes || intervalStart >= intervalEnd) {
      continue
    }

    const durationMs = durationMinutes * 60_000
    const pauseMs = Math.max(0, interval.pauseBetween ?? 0) * 60_000
    const breaks = (interval.breaks ?? [])
      .map((item) => ({
        end: parseDate(item.endTime),
        start: parseDate(item.startTime),
      }))
      .filter((item): item is { end: Date; start: Date } => Boolean(item.start && item.end))

    for (
      let startMs = intervalStart.getTime();
      startMs + durationMs <= intervalEnd.getTime();
      startMs += durationMs + pauseMs
    ) {
      const start = new Date(startMs)
      const end = new Date(startMs + durationMs)

      if (breaks.some((item) => rangesOverlap(start, end, item.start, item.end))) {
        continue
      }

      const isoStart = start.toISOString()
      slots.push({
        end: end.toISOString(),
        id: isoStart,
        label: formatInterviewSlotLabel(start, end),
        start: isoStart,
      })
    }
  }

  return slots.sort((left, right) => left.start.localeCompare(right.start))
}

export function createApplicantParameters(args: {
  application: Pick<Application, 'email' | 'formSubmission' | 'name'> & {
    reviewProcess?: Application['reviewProcess']
  }
  commissionLabel?: string
  scheduleLink?: string
}) {
  const parameters = new Map<string, string>()

  getSubmissionParameters(args.application.formSubmission).forEach((value, key) => {
    parameters.set(key, value)
  })

  parameters.set('commission', args.commissionLabel ?? '')
  parameters.set('email', args.application.email)
  parameters.set(
    'interviewDate',
    formatInterviewDate(args.application.reviewProcess?.interviewDate),
  )
  parameters.set('name', args.application.name)
  parameters.set('scheduleLink', args.scheduleLink ?? '')

  return parameters
}

export function renderRecruitmentMessage(args: {
  fallback: string
  message?: unknown
  parameters: Map<string, string>
}): RecruitmentMessageResult {
  const lexical = isLexicalValue(args.message) ? args.message : null
  const sourceHTML = lexical ? renderLexicalToHTML(lexical) : ''
  const sourceText = lexical ? renderLexicalToText(lexical) : ''
  const html = sourceHTML || `<p>${escapeHTML(args.fallback)}</p>`
  const text = sourceText || args.fallback
  const htmlResult = replacePlaceholders(html, args.parameters, true)
  const textResult = replacePlaceholders(text, args.parameters, false)

  return {
    html: htmlResult.value,
    text: textResult.value,
    unresolvedPlaceholders: [
      ...new Set([...htmlResult.unresolvedPlaceholders, ...textResult.unresolvedPlaceholders]),
    ],
  }
}

export function buildRecruitmentEmailHTML(args: {
  cta?: {
    href: string
    label: string
  }
  messageHTML: string
  preheader: string
  title: string
}) {
  const logoURL = `${getServerSideURL().replace(/\/$/, '')}/logo_full.png`
  const cta = args.cta
    ? `<tr>
              <td align="center" style="padding:8px 30px 34px;">
                <a href="${escapeHTML(args.cta.href)}" style="display:inline-block; border-radius:10px; background:#00a2e0; color:#ffffff; font-size:15px; font-weight:800; line-height:1; padding:16px 22px; text-decoration:none;">
                  ${escapeHTML(args.cta.label)}
                </a>
              </td>
            </tr>`
    : ''

  return `
<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>${escapeHTML(args.title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#eef3f8; color:#0f172c; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHTML(args.preheader)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background:#eef3f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; max-width:640px; overflow:hidden; border-radius:18px; background:#ffffff; box-shadow:0 18px 48px rgba(15,23,44,0.14);">
            <tr>
              <td style="padding:28px 30px 34px; background:#141e34; color:#ffffff;">
                <img src="${escapeHTML(logoURL)}" alt="Interact Bucuresti Triumph" width="220" style="display:block; max-width:220px; width:100%; height:auto; margin-bottom:28px;" />
                <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.15; font-weight:800;">
                  ${escapeHTML(args.title)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 24px; color:#526071; font-size:15px; line-height:1.7;">
                ${args.messageHTML}
              </td>
            </tr>
            ${cta}
            <tr>
              <td style="padding:20px 30px; background:#0f172c;">
                <p style="margin:0; color:rgba(255,255,255,0.68); font-size:12px; line-height:1.5;">
                  Interact Bucuresti Triumph
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

export function formatInterviewDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getCommissionLabel(value: Comission | string | null | undefined) {
  if (!value || typeof value === 'string') return ''
  return `Comisia ${value.commissionNumber}`
}

function getSubmissionParameters(value: FormSubmission | string | null | undefined) {
  const parameters = new Map<string, string>()
  if (!value || typeof value === 'string') return parameters

  for (const item of value.submissionData ?? []) {
    parameters.set(item.field, String(item.value ?? ''))
  }

  return parameters
}

function renderLexicalToHTML(value: LexicalValue) {
  return (value.root?.children ?? []).map(renderLexicalNodeToHTML).filter(Boolean).join('')
}

function renderLexicalNodeToHTML(node: LexicalNode): string {
  if (node.type === 'text') return escapeHTML(node.text ?? '')
  if (node.type === 'linebreak') return '<br />'

  const children = (node.children ?? []).map(renderLexicalNodeToHTML).join('')

  if (node.type === 'paragraph') {
    return `<p style="margin:0 0 14px;">${children || '&nbsp;'}</p>`
  }

  if (node.type === 'heading') {
    const tag = ['h1', 'h2', 'h3', 'h4'].includes(node.tag ?? '') ? node.tag : 'h2'
    return `<${tag} style="margin:0 0 14px; color:#0f172c;">${children}</${tag}>`
  }

  if (node.type === 'list') {
    const tag = node.tag === 'ol' ? 'ol' : 'ul'
    return `<${tag} style="margin:0 0 14px; padding-left:22px;">${children}</${tag}>`
  }

  if (node.type === 'listitem') {
    return `<li style="margin:0 0 6px;">${children}</li>`
  }

  if (node.type === 'link' || node.type === 'autolink') {
    const href = node.fields?.url || node.url || '#'
    return `<a href="${escapeHTML(href)}" style="color:#00a2e0; font-weight:700;">${children}</a>`
  }

  return children
}

function renderLexicalToText(value: LexicalValue) {
  return (value.root?.children ?? []).map(renderLexicalNodeToText).filter(Boolean).join('\n\n')
}

function renderLexicalNodeToText(node: LexicalNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'linebreak') return '\n'

  return (node.children ?? []).map(renderLexicalNodeToText).join('')
}

function replacePlaceholders(
  value: string,
  parameters: Map<string, string>,
  escapeReplacement: boolean,
) {
  const unresolvedPlaceholders: string[] = []
  const replaced = value.replace(/{{\s*([^{}]+?)\s*}}/g, (placeholder, key: string) => {
    const parameter = parameters.get(key.trim())
    if (parameter === undefined) {
      unresolvedPlaceholders.push(key.trim())
      return placeholder
    }

    return escapeReplacement ? escapeHTML(parameter) : parameter
  })

  return {
    unresolvedPlaceholders,
    value: replaced,
  }
}

function isLexicalValue(value: unknown): value is LexicalValue {
  return Boolean(value && typeof value === 'object' && 'root' in value)
}

function normalizePositiveNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.floor(value)
}

function rangesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && leftEnd > rightStart
}

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatInterviewSlotLabel(start: Date, end: Date) {
  const day = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(start)
  const time = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${day}, ${time.format(start)} - ${time.format(end)}`
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
