import type { Payload, PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'

import type { Event } from '@/payload-types'
import { formatEventSlotLabel } from '@/utilities/eventRegistration'

type RegistrationCreateData = RequiredDataFromCollectionSlug<'event-registrations'>
type ImportPayload = Pick<Payload, 'create' | 'find'>

export type ParticipantCSVError = {
  message: string
  row: number
}

export type ParsedParticipantCSVRow = {
  data: RegistrationCreateData
  email: string
  name: string
  row: number
}

export type ParticipantBulkUploadResult = {
  created: {
    email: string
    id: string
    name: string
    row: number
  }[]
  errors: ParticipantCSVError[]
  skipped: {
    email: string
    reason: string
    row: number
  }[]
}

const headerAliases = {
  day: ['day', 'date', 'event date', 'event_date', 'zi', 'data'],
  email: ['email', 'e-mail', 'mail'],
  name: ['name', 'full name', 'full_name', 'nume', 'nume complet'],
  phone: ['phone', 'phone number', 'phone_number', 'telephone', 'tel', 'telefon'],
  questions: ['questions', 'question', 'notes', 'mentions', 'observatii', 'observații'],
  slot: ['slot', 'shift', 'time slot', 'time_slot', 'tura', 'tură', 'interval'],
} as const

type CSVColumn = keyof typeof headerAliases

const requiredColumns: CSVColumn[] = ['name', 'email', 'phone', 'day', 'slot']
const normalizedHeaderAliases = new Map<string, CSVColumn>(
  Object.entries(headerAliases).flatMap(([column, aliases]) =>
    aliases.map((alias) => [normalizeHeader(alias), column as CSVColumn]),
  ),
)

export function parseParticipantsCSV(
  csv: string,
  event: Pick<Event, 'days' | 'id'>,
): {
  errors: ParticipantCSVError[]
  rows: ParsedParticipantCSVRow[]
} {
  const errors: ParticipantCSVError[] = []
  const table = parseCSVTable(csv)
  const [headers, ...records] = table.filter((row) => row.some((cell) => cell.trim()))

  if (!headers) {
    return {
      errors: [{ message: 'Fișierul CSV este gol.', row: 1 }],
      rows: [],
    }
  }

  const columns = getColumnIndexes(headers, errors)
  const missingColumns = requiredColumns.filter((column) => columns[column] === undefined)

  for (const column of missingColumns) {
    errors.push({ message: `Lipsește coloana obligatorie "${column}".`, row: 1 })
  }

  if (missingColumns.length > 0) return { errors, rows: [] }

  const rows: ParsedParticipantCSVRow[] = []
  const seenEmails = new Map<string, number>()
  const eventDays = getEventDayOptions(event)

  records.forEach((record, recordIndex) => {
    const rowNumber = recordIndex + 2
    const rowErrors: string[] = []
    const name = getRequiredCell(record, columns.name)
    const email = getRequiredCell(record, columns.email).toLowerCase()
    const phone = getRequiredCell(record, columns.phone)
    const dayValue = getRequiredCell(record, columns.day)
    const slotValue = getRequiredCell(record, columns.slot)
    const questions = getOptionalCell(record, columns.questions)

    if (!name) rowErrors.push('Numele este obligatoriu.')

    if (!email) {
      rowErrors.push('Emailul este obligatoriu.')
    } else if (!isValidEmail(email)) {
      rowErrors.push('Emailul nu este valid.')
    } else if (seenEmails.has(email)) {
      rowErrors.push(`Emailul dublează rândul ${seenEmails.get(email)} din acest CSV.`)
    } else {
      seenEmails.set(email, rowNumber)
    }

    if (!phone) rowErrors.push('Telefonul este obligatoriu.')

    const day = eventDays.get(dayValue)
    if (!day) {
      rowErrors.push(`Ziua "${dayValue}" nu există în eveniment. Folosește formatul YYYY-MM-DD.`)
    }

    const matchingSlots = day?.slots.get(normalizeSlot(slotValue)) ?? []
    if (!slotValue) {
      rowErrors.push('Tura este obligatorie.')
    } else if (day && matchingSlots.length === 0) {
      rowErrors.push(`Tura "${slotValue}" nu există în ziua selectată.`)
    } else if (matchingSlots.length > 1) {
      rowErrors.push(`Tura "${slotValue}" este ambiguă în ziua selectată.`)
    }

    if (rowErrors.length > 0 || !day || matchingSlots.length !== 1) {
      errors.push({ message: rowErrors.join(' '), row: rowNumber })
      return
    }

    const data: RegistrationCreateData = {
      day: day.id,
      donation: 0,
      email,
      event: event.id,
      guests: 0,
      name,
      phone,
      slot: matchingSlots[0].id,
      status: 'registered',
    }

    if (questions) data.questions = questions

    rows.push({ data, email, name, row: rowNumber })
  })

  return { errors, rows }
}

export async function importParticipantsFromCSV(args: {
  csv: string
  event: Pick<Event, 'days' | 'id'>
  payload: ImportPayload
  user: PayloadRequest['user']
}): Promise<ParticipantBulkUploadResult> {
  const parsed = parseParticipantsCSV(args.csv, args.event)
  const result: ParticipantBulkUploadResult = {
    created: [],
    errors: [...parsed.errors],
    skipped: [],
  }

  for (const row of parsed.rows) {
    try {
      const existing = await args.payload.find({
        collection: 'event-registrations',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          and: [
            { event: { equals: args.event.id } },
            { email: { equals: row.email } },
            { status: { not_equals: 'cancelled' } },
          ],
        },
      })

      if (existing.totalDocs > 0) {
        result.skipped.push({
          email: row.email,
          reason: 'Există deja o înscriere activă cu acest email la eveniment.',
          row: row.row,
        })
        continue
      }

      const created = await args.payload.create({
        collection: 'event-registrations',
        context: {
          eventRegistrationImport: true,
        },
        data: row.data,
        overrideAccess: true,
        user: args.user,
      })

      result.created.push({
        email: created.email ?? row.email,
        id: created.id,
        name: created.name,
        row: row.row,
      })
    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : 'Participantul nu a putut fi importat.',
        row: row.row,
      })
    }
  }

  return result
}

function getEventDayOptions(event: Pick<Event, 'days'>) {
  const days = new Map<
    string,
    {
      id: string
      slots: Map<string, Array<{ id: string }>>
    }
  >()

  for (const day of event.days ?? []) {
    if (!day?.id || !day.eventDate) continue

    const slots = new Map<string, Array<{ id: string }>>()

    for (const slot of day.slots ?? []) {
      if (!slot?.id) continue

      const label = normalizeSlot(formatEventSlotLabel(slot.startTime, slot.endTime))
      const candidates = slots.get(label) ?? []
      candidates.push({ id: slot.id })
      slots.set(label, candidates)
    }

    days.set(formatDateInput(day.eventDate), { id: day.id, slots })
  }

  return days
}

function parseCSVTable(input: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const csv = input.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(csv)

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const nextChar = csv[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''

      if (char === '\r' && nextChar === '\n') index += 1
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function detectDelimiter(csv: string) {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? ''
  let commas = 0
  let semicolons = 0
  let inQuotes = false

  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes
    if (inQuotes) continue
    if (char === ',') commas += 1
    if (char === ';') semicolons += 1
  }

  return semicolons > commas ? ';' : ','
}

function getColumnIndexes(headers: string[], errors: ParticipantCSVError[]) {
  const columns: Partial<Record<CSVColumn, number>> = {}

  headers.forEach((header, index) => {
    const column = normalizedHeaderAliases.get(normalizeHeader(header))
    if (!column) return

    if (columns[column] !== undefined) {
      errors.push({ message: `Coloana "${column}" apare de mai multe ori.`, row: 1 })
      return
    }

    columns[column] = index
  })

  return columns
}

function getRequiredCell(record: string[], index: number | undefined) {
  return index === undefined ? '' : (record[index] ?? '').trim()
}

function getOptionalCell(record: string[], index: number | undefined) {
  return getRequiredCell(record, index) || null
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLocaleLowerCase('ro')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '')
}

function normalizeSlot(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('ro')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\./g, ':')
}

function formatDateInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
  }).format(date)
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
