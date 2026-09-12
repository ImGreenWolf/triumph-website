export const CUSTOM_MAIL_SUBJECT_MAX_LENGTH = 200
export const CUSTOM_MAIL_BODY_MAX_LENGTH = 20_000
export const DEFAULT_CUSTOM_MAIL_SENDER = 'hello@interact-triumph.org'

export function getCustomMailSenderAddress(user: { clubMail?: string | null }) {
  const clubMail = user.clubMail?.trim().toLowerCase() ?? ''

  return /^[^\s@]+@interact-triumph\.org$/i.test(clubMail) ? clubMail : DEFAULT_CUSTOM_MAIL_SENDER
}

export function getCustomMailFromHeader(user: { clubMail?: string | null; name?: string | null }) {
  const address = getCustomMailSenderAddress(user)
  const name = user.name?.replace(/[\r\n"]/g, '').trim()

  return name ? `"${name}" <${address}>` : address
}

export function insertTextAtSelection(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))
  const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`

  return {
    cursor: start + insertion.length,
    value: nextValue,
  }
}
