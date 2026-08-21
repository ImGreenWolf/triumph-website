type WebmailSessionArgs = {
  email: string
  password: string
  remoteAddress?: string | null
}

type WebmailSessionResult = {
  action: string
  session: string
}

type CPanelSessionData = {
  hostname?: string | null
  session?: string
  token?: string
}

type CPanelResult = {
  data?: unknown
  errors?: unknown
  messages?: unknown
  status?: number
  warnings?: unknown
}

type CPanelResponse = CPanelResult & {
  result?: CPanelResult
}

const CPANEL_PORT = '2083'
const WEBMAIL_PORT = '2096'

export async function createCPanelWebmailSession(
  args: WebmailSessionArgs,
): Promise<WebmailSessionResult> {
  const authToken = process.env.CPANEL_AUTH_TOKEN

  if (!authToken) {
    throw new Error('CPANEL_AUTH_TOKEN is not configured.')
  }

  const { domain, login } = splitEmailAddress(args.email)
  const apiBaseURL = getCPanelAPIBaseURL()
  const requestURL = new URL(
    `${apiBaseURL}/execute/Session/create_webmail_session_for_mail_user_check_password`,
  )

  requestURL.searchParams.set('login', login)
  requestURL.searchParams.set('domain', domain)
  requestURL.searchParams.set('password', args.password)

  if (args.remoteAddress && isIPv4Address(args.remoteAddress)) {
    requestURL.searchParams.set('remote_address', args.remoteAddress)
  }

  const response = await fetch(requestURL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: authToken,
    },
  })

  const body = await parseJSONResponse(response)

  if (!response.ok) {
    throw new Error(`cPanel returned HTTP ${response.status}.`)
  }

  const result = getCPanelResult(body)

  if (typeof result.status === 'number' && result.status !== 1) {
    throw new Error(getCPanelErrorMessage(result))
  }

  const data = getCPanelSessionData(result.data)
  const session = getRequiredString(data.session, 'session')
  const token = normalizeToken(getRequiredString(data.token, 'token'))
  const hostname = getWebmailHostname(data.hostname, apiBaseURL)

  return {
    action: `https://${hostname}:${WEBMAIL_PORT}${token}/login`,
    session,
  }
}

function getCPanelAPIBaseURL() {
  const configuredBaseURL =
    process.env.CPANEL_API_URL || `${process.env.NEXT_PUBLIC_SERVER_URL}:${CPANEL_PORT}`

  return configuredBaseURL.replace(/\/$/, '')
}

function splitEmailAddress(email: string) {
  const trimmedEmail = email.trim()
  const separatorIndex = trimmedEmail.lastIndexOf('@')

  if (separatorIndex <= 0 || separatorIndex === trimmedEmail.length - 1) {
    throw new Error('The configured webmail address is invalid.')
  }

  return {
    domain: trimmedEmail.slice(separatorIndex + 1),
    login: trimmedEmail.slice(0, separatorIndex),
  }
}

async function parseJSONResponse(response: Response): Promise<CPanelResponse> {
  const text = await response.text()

  try {
    return JSON.parse(text) as CPanelResponse
  } catch {
    throw new Error('cPanel returned an invalid JSON response.')
  }
}

function getCPanelResult(body: CPanelResponse): CPanelResult {
  return body.result || body
}

function getCPanelSessionData(value: unknown): CPanelSessionData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('cPanel did not return webmail session data.')
  }

  return value as CPanelSessionData
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`cPanel did not return a ${field} value.`)
  }

  return value
}

function normalizeToken(token: string) {
  const normalizedToken = token.startsWith('/') ? token : `/${token}`

  return normalizedToken.replace(/\/$/, '')
}

function getWebmailHostname(hostname: string | null | undefined, apiBaseURL: string) {
  if (hostname) {
    try {
      return new URL(hostname.includes('://') ? hostname : `https://${hostname}`).hostname
    } catch {
      return hostname.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    }
  }

  return new URL(apiBaseURL).hostname
}

function getCPanelErrorMessage(result: CPanelResult) {
  const messages = [...toMessageList(result.errors), ...toMessageList(result.messages)]

  return messages.length ? messages.join(' ') : 'cPanel could not create a webmail session.'
}

function toMessageList(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap(toMessageList)
  }

  if (typeof value === 'string') {
    return [value]
  }

  if (value instanceof Error) {
    return [value.message]
  }

  return [String(value)]
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
