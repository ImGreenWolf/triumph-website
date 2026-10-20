import font from './font/glyphs.json'

type Glyph = {
  advance: number
  outline?: string
  bounds: number[]
  fallback?: string
}
type PlacedGlyph = { glyph: Glyph; x: number; y: number; scale: number }

const glyphs: Record<string, Glyph> = font
export function getGlyph(character: string): Glyph {
  return (
    glyphs[character] ?? {
      advance: 750,
      bounds: [0, -200, 750, 800],
      fallback: character,
    }
  )
}

function measure(text: string) {
  let advance = 0
  let left = 0
  let right = 0
  for (const character of Array.from(text)) {
    const glyph = getGlyph(character)
    left = Math.min(left, advance + glyph.bounds[0])
    right = Math.max(right, advance + glyph.bounds[2])
    advance += glyph.advance
  }
  return { left, width: Math.max(right, advance) - left }
}

function wrap(text: string, width: number) {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (current && measure(next).width > width) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Reserve a shared frame and align visible ink along its bottom edge. */
export function layoutEntries(texts: string[], availableWidth: number, strokeWidth: number) {
  const padding = Math.max(strokeWidth * 2, 40)
  const width = Math.max(availableWidth, padding * 2 + 1)
  const contentWidth = width - padding * 2
  const lines = texts.map((text) => wrap(text, contentWidth))
  const allGlyphs = texts.flatMap((text) => Array.from(text, getGlyph))
  const top = Math.max(850, ...allGlyphs.map((glyph) => glyph.bounds[3]))
  const bottom = Math.min(-250, ...allGlyphs.map((glyph) => glyph.bounds[1]))
  const lineHeight = top - bottom + 100
  const scales = lines.map((entry) =>
    Math.min(1, contentWidth / Math.max(1, ...entry.map((line) => measure(line).width))),
  )
  const inkBounds = lines.map((entry) => {
    const ink = entry.flatMap((line, index) =>
      Array.from(line, getGlyph)
        .filter((glyph) => glyph.outline || glyph.fallback)
        .map((glyph) => ({
          top: index * lineHeight - glyph.bounds[3],
          bottom: index * lineHeight - glyph.bounds[1],
        })),
    )
    return {
      top: ink.length ? Math.min(...ink.map(({ top }) => top)) : 0,
      bottom: ink.length ? Math.max(...ink.map(({ bottom }) => bottom)) : 0,
    }
  })
  const entryHeights = inkBounds.map(({ top, bottom }, index) => (bottom - top) * scales[index])
  const height = padding * 2 + Math.max(1, ...entryHeights)

  const entries = lines.map((entryLines, entryIndex) => {
    const placed: PlacedGlyph[] = []
    const scale = scales[entryIndex]
    // Keep the gap to the description constant even when entries have different
    // line counts, descenders, accents, or scales. Extra room belongs above them.
    const baseline = height - padding - inkBounds[entryIndex].bottom * scale
    entryLines.forEach((line, index) => {
      const measured = measure(line)
      let x = (width - measured.width * scale) / 2 - measured.left * scale
      const y = baseline + index * lineHeight * scale
      for (const character of Array.from(line)) {
        const glyph = getGlyph(character)
        if (glyph.outline || glyph.fallback) placed.push({ glyph, x, y, scale })
        x += glyph.advance * scale
      }
    })
    return placed
  })
  return { width, height, entries, lineCounts: lines.map((entry) => entry.length) }
}

const pathCommands = /([MLCQHVZ])([^MLCQHVZ]*)/g
const pathNumbers = /-?\d+(?:\.\d+)?/g
const format = (value: number) => String(Math.round(value * 1000) / 1000)

/** Bake placement into the font contours so the complete phrase is a single SVG path. */
function placeOutline(d: string, x: number, y: number, scale: number) {
  return Array.from(d.matchAll(pathCommands), ([, command, values]) => {
    const numbers = Array.from(values.matchAll(pathNumbers), ([number]) => Number(number))
    if (command === 'Z') return 'Z'
    if (command === 'H') return `H${numbers.map((value) => format(x + value * scale)).join(' ')}`
    if (command === 'V') return `V${numbers.map((value) => format(y - value * scale)).join(' ')}`
    return (
      command +
      numbers
        .map((value, index) => format(index % 2 ? y - value * scale : x + value * scale))
        .join(' ')
    )
  }).join(' ')
}

/** Join all contours into one continuous route; SVG dash offsets then progress across the whole phrase. */
function continuousRoute(outline: string) {
  let current = [0, 0]
  let contourStart = [0, 0]
  let started = false
  return Array.from(outline.matchAll(pathCommands), ([, command, values]) => {
    const numbers = Array.from(values.matchAll(pathNumbers), ([number]) => Number(number))
    if (command === 'M') {
      const next = numbers.slice(-2)
      contourStart = next
      const connector = started
        ? `C${format(current[0] + (next[0] - current[0]) / 3)} ${format(current[1])} ${format(next[0] - (next[0] - current[0]) / 3)} ${format(next[1])} ${next.join(' ')}`
        : `M${next.join(' ')}`
      current = next
      started = true
      return connector
    }
    if (command === 'Z') {
      current = contourStart
      return `L${current.join(' ')}`
    }
    if (command === 'H') current = [numbers.at(-1)!, current[1]]
    else if (command === 'V') current = [current[0], numbers.at(-1)!]
    else current = numbers.slice(-2)
    return command + values.trim()
  }).join(' ')
}

export function composeEntry(placed: PlacedGlyph[]) {
  const outline = placed
    .map(({ glyph, x, y, scale }) =>
      glyph.outline ? placeOutline(glyph.outline, x, y, scale) : '',
    )
    .join(' ')
  return {
    outline,
    reveal: continuousRoute(outline),
    scale: placed[0]?.scale ?? 1,
    fallbacks: placed.filter(({ glyph }) => glyph.fallback),
  }
}
