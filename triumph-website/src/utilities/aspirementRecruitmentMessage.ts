import type { Application, FormSubmission } from '@/payload-types'
import { getClientSideURL, getServerSideURL } from '@/utilities/getURL'

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

type RecruitmentMessageResult = {
  html: string
  text: string
  unresolvedPlaceholders: string[]
}

export function getInterviewScheduleURL(token: string, request?: Request) {
  const baseURL = getRequestBaseURL(request)
  return `${baseURL}/aspirement/interview/${encodeURIComponent(token)}`
}

export function getRequestBaseURL(request?: Request) {
  const origin = request?.headers.get('origin') || getClientSideURL() || getServerSideURL()
  return origin.replace(/\/$/, '')
}

export function createApplicantParameters(args: {
  application: Pick<Application, 'email' | 'formSubmission' | 'name'> & {
    reviewProcess?: Pick<NonNullable<Application['reviewProcess']>, 'interviewDate'>
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

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
