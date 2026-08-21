import { NextResponse } from 'next/server'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'
import { createCPanelWebmailSession } from '@/utilities/cpanelWebmail'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({
      config: payloadConfig,
    })

    const authHeaders = new Headers(request.headers)
    if (!authHeaders.has('sec-fetch-site')) {
      authHeaders.set('sec-fetch-site', 'same-origin')
    }

    const auth = await payload.auth({
      headers: authHeaders,
    })

    if (!auth.user) {
      return NextResponse.redirect(new URL('/members/login', request.url))
    }

    const member = (await payload.findByID({
      collection: 'users',
      depth: 0,
      id: (auth.user as User).id,
      overrideAccess: true,
    })) as User

    if (!member.clubMail || !member.clubMailPassword) {
      return renderWebmailError(
        'Contul tău de email Interact nu este complet configurat încă.',
        400,
      )
    }

    const webmailSession = await createCPanelWebmailSession({
      email: member.clubMail,
      password: member.clubMailPassword,
      remoteAddress: getRequestIPv4(request.headers),
    })

    return renderWebmailRedirect(webmailSession)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nu am putut deschide sesiunea de webmail în acest moment.'

    return renderWebmailError(message, 502)
  }
}

function renderWebmailRedirect(args: { action: string; session: string }) {
  return new Response(
    `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8">
    <meta content="noindex" name="robots">
    <title>Deschidere Webmail</title>
  </head>
  <body>
    <form action="${escapeHTML(args.action)}" id="webmail-login" method="post">
      <input name="session" type="hidden" value="${escapeHTML(args.session)}">
      <noscript>
        <button type="submit">Deschide Webmail</button>
      </noscript>
    </form>
    <script>
      document.getElementById('webmail-login').submit()
    </script>
  </body>
</html>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
      },
    },
  )
}

function renderWebmailError(message: string, status: number) {
  return new Response(
    `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8">
    <meta content="noindex" name="robots">
    <title>Webmail indisponibil</title>
  </head>
  <body style="font-family: system-ui, sans-serif; margin: 2rem; max-width: 42rem;">
    <h1>Webmail indisponibil</h1>
    <p>${escapeHTML(message)}</p>
    <p><a href="/members">Înapoi la dashboard</a></p>
  </body>
</html>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
      status,
    },
  )
}

function getRequestIPv4(headers: Headers) {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const candidates = [
    forwardedFor,
    headers.get('x-real-ip')?.trim(),
    headers.get('cf-connecting-ip')?.trim(),
  ]

  return candidates.find((candidate) => candidate && isIPv4Address(candidate))
}

function isIPv4Address(value: string) {
  const parts = value.split('.')

  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d+$/.test(part)) return false

      const number = Number(part)

      return number >= 0 && number <= 255
    })
  )
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
