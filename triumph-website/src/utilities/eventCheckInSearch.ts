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
