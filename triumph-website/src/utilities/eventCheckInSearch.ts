const romanianLetters: Record<string, string> = {
  ă: 'a',
  â: 'a',
  î: 'i',
  ș: 's',
  ş: 's',
  ț: 't',
  ţ: 't',
}
const letterPatterns: Record<string, string> = {
  a: '[aăâ]',
  i: '[iî]',
  s: '[sșş]',
  t: '[tțţ]',
}

export function normalizeCheckInSearch(value: string) {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('ro')
    .replace(/[ăâîșşțţ]/g, (letter) => romanianLetters[letter]!)
}

export function checkInSearchTerms(value: string) {
  return [...new Set(normalizeCheckInSearch(value).trim().split(/\s+/u).filter(Boolean))]
}

export function matchesCheckInSearch(values: readonly string[], terms: readonly string[]) {
  if (!terms.length) return true
  const normalized = values.map(normalizeCheckInSearch)
  return terms.every((term) => normalized.some((value) => value.includes(term)))
}

/** Classify the original query without changing the participant's spelling or phone format. */
export function getParticipantSearchPrefill(query: string) {
  const value = query.trim()
  const fields = { name: '', email: '', phone: '' }
  if (/^[^\s@<>:]+@[^\s@<>:]+\.[^\s@<>:]+$/.test(value)) fields.email = value
  else if (/^\+?[\d\s().-]+$/.test(value) && /^\d{6,15}$/.test(value.replace(/\D/g, '')))
    fields.phone = value
  else if (/^[\p{L}\p{M}\s.'’\p{Pd}]+$/u.test(value) && /\p{L}/u.test(value)) fields.name = value
  return fields
}

/** MongoDB regex ignores collation; expand Romanian variants without changing stored names. */
export function checkInSearchPattern(value: string) {
  return Array.from(normalizeCheckInSearch(value))
    .map((letter) => {
      const pattern = letterPatterns[letter]
      // Also match imported names that store the accent as a separate Unicode character.
      return pattern ? `${pattern}[\u0300-\u036f]*` : letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
}
