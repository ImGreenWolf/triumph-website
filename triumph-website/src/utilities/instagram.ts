const instagramHosts = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com'])

export function normalizeInstagramUsername(value: unknown) {
  if (typeof value !== 'string') return ''

  const input = value.trim()
  if (!input) return ''

  const profileURL = extractInstagramURL(input)
  if (profileURL) {
    try {
      const url = new URL(profileURL)
      if (instagramHosts.has(url.hostname.toLocaleLowerCase('en-US'))) {
        const username = url.pathname.split('/').filter(Boolean)[0]
        if (isInstagramUsername(username)) return username.toLocaleLowerCase('en-US')
      }
    } catch {
      // Fall through to a direct username when the submitted URL is malformed.
    }
  }

  const username = input.replace(/^@/, '').replace(/^\/+|\/+$/g, '')
  return isInstagramUsername(username) ? username.toLocaleLowerCase('en-US') : ''
}

function extractInstagramURL(value: string) {
  const markdownLink = value.match(/\]\((https?:\/\/[^\s)]+)\)/i)?.[1]
  const plainURL = value.match(/https?:\/\/[^\s\])]+/i)?.[0]
  const candidate = markdownLink || plainURL || value

  if (/^https?:\/\//i.test(candidate)) return candidate
  if (/^(?:www\.)?instagram\.com\//i.test(candidate)) return `https://${candidate}`

  return ''
}

function isInstagramUsername(value: string | undefined) {
  return Boolean(value && /^[a-z0-9._]{1,30}$/i.test(value))
}
