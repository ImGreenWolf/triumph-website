import type { PayloadRequest } from 'payload'

import type { User } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

type ForgotPasswordEmailArgs = {
  req?: PayloadRequest
  token?: string
  user?: User
}

export function generateForgotPasswordEmailHTML(args: ForgotPasswordEmailArgs = {}) {
  const baseURL = getEmailBaseURL(args.req)
  const resetURL = `${baseURL}/admin/reset/${encodeURIComponent(args.token || '')}`
  const logoURL = `${baseURL}/logo_full.png`
  const displayName = escapeHTML(args.user?.name || 'membru Triumph')

  return `
<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>Resetează parola</title>
  </head>
  <body style="margin:0; padding:0; background:#eef3f8; color:#0f172c; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background:#eef3f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; max-width:640px; overflow:hidden; border-radius:18px; background:#ffffff; box-shadow:0 18px 48px rgba(15,23,44,0.14);">
            <tr>
              <td style="padding:0; background:#0f172c;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:28px 30px 22px;">
                      <img src="${logoURL}" alt="Interact Bucuresti Triumph" width="220" style="display:block; max-width:220px; width:100%; height:auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 30px 34px;">
                      <div style="display:inline-block; margin-bottom:14px; padding:6px 10px; border:1px solid rgba(0,162,224,0.45); border-radius:999px; color:#00a2e0; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                        Interact Bucureşti Triumph
                      </div>
                      <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.15; font-weight:800;">
                        Resetează parola contului tău
                      </h1>
                      <p style="margin:14px 0 0; max-width:500px; color:rgba(255,255,255,0.74); font-size:16px; line-height:1.6;">
                        Am primit o cerere de resetare a parolei pentru contul tău Interact București Triumph.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 30px 10px;">
                <p style="margin:0 0 16px; color:#0f172c; font-size:16px; line-height:1.6;">
                  Salut, ${displayName},
                </p>
                <p style="margin:0; color:#526071; font-size:15px; line-height:1.7;">
                  Apasă butonul de mai jos pentru a alege o parolă nouă. Linkul expiră în curând din motive de securitate.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:28px 30px 26px;">
                <a href="${resetURL}" style="display:inline-block; border-radius:10px; background:#00a2e0; color:#ffffff; font-size:15px; font-weight:800; line-height:1; padding:16px 22px; text-decoration:none; box-shadow:0 12px 26px rgba(0,162,224,0.28);">
                  Resetează parola
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 30px 30px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-radius:12px; background:#f7fafc;">
                  <tr>
                    <td style="padding:18px 20px; border-left:4px solid #00a2e0;">
                      <p style="margin:0; color:#526071; font-size:14px; line-height:1.6;">
                        Dacă nu ai cerut resetarea parolei, poți ignora acest email. Contul tău rămâne protejat.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 30px 34px;">
                <p style="margin:0 0 10px; color:#8b95a5; font-size:12px; line-height:1.6;">
                  Dacă butonul nu funcționează, copiază acest link în browser:
                </p>
                <p style="margin:0; color:#00a2e0; font-size:12px; line-height:1.6; word-break:break-all;">
                  <a href="${resetURL}" style="color:#00a2e0; text-decoration:underline;">${resetURL}</a>
                </p>
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

export function generateForgotPasswordEmailSubject() {
  return 'Resetează parola contului tău Interact Triumph'
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
