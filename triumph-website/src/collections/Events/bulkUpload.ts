import { slotPeople } from '@/utilities/eventMongo'
import { createEventOperationState, releaseEventOperation } from '@/utilities/eventOperationGuard'
import type { Payload, PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'

import type { Event, EventRegistration } from '@/payload-types'
import { formatEventSlotLabel } from '@/utilities/eventRegistration'
import { isAgeGroup } from '@/utilities/eventPayment'
import { getEventSlotDateRange } from '@/utilities/eventDisplay'
import {
  createRegistrationImportBatch,
  type ImportEvent,
} from '@/utilities/eventRegistrationImportContext'

type RegistrationCreateData = RequiredDataFromCollectionSlug<'event-registrations'> &
  Pick<EventRegistration, 'donation'>
type ImportPayload = Pick<Payload, 'create' | 'find' | 'count'>

export type ParticipantCSVError = {
  message: string
  row: number
}

export type ParsedParticipantCSVRow = {
  data: RegistrationCreateData
  automaticSlots?: Array<{ day: string; slot: string; capacity: number }>
  email?: string
  name: string
  row: number
}

export type ParticipantBulkUploadResult = {
  created: {
    email?: string
    id: string
    name: string
    row: number
  }[]
  errors: ParticipantCSVError[]
  skipped: {
    email?: string
    reason: string
    row: number
  }[]
}

const headerAliases = {
  ageGroup: ['ageGroup', 'age_group', 'categorie varsta', 'categorie vârstă'],
  day: ['day', 'date', 'event date', 'event_date', 'zi', 'data'],
  email: ['email', 'e-mail', 'mail'],
  name: ['name', 'full name', 'full_name', 'nume', 'nume complet'],
  phone: ['phone', 'phone number', 'phone_number', 'telephone', 'tel', 'telefon'],
  questions: ['questions', 'question', 'notes', 'mentions', 'observatii', 'observații'],
  slot: ['slot', 'shift', 'time slot', 'time_slot', 'tura', 'tură', 'interval'],
  donation: ['donation', 'donatie', 'donație', 'donation_value', 'value', 'donation_val'],
} as const

type CSVColumn = keyof typeof headerAliases

const requiredColumns: CSVColumn[] = ['name', 'phone']
const NO_AVAILABLE_SLOT =
  'Nu există niciun interval cu locuri disponibile pentru ziua și tura indicate.'
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
  const eventSlots = getEventSlotOptions(event)

  records.forEach((record, recordIndex) => {
    const rowNumber = recordIndex + 2
    const rowErrors: string[] = []
    const name = getRequiredCell(record, columns.name)
    const email = getOptionalCell(record, columns.email)?.toLowerCase() ?? undefined
    const phone = getOptionalCell(record, columns.phone)
    const dayValue = getRequiredCell(record, columns.day)
    const slotValue = getRequiredCell(record, columns.slot)
    const questions = getOptionalCell(record, columns.questions)
    const ageValue = getOptionalCell(record, columns.ageGroup)?.toLowerCase()
    const ageGroup = ageValue === 'major' ? 'adult' : ageValue
    const donationValue = getOptionalCell(record, columns.donation)
    const donation = donationValue ? Number(donationValue.replace(',', '.')) : 0

    if (!name) rowErrors.push('Numele este obligatoriu.')
    if (ageGroup && !isAgeGroup(ageGroup)) {
      rowErrors.push('Categoria de vârstă trebuie să fie minor, adult sau major.')
    }

    if (email) {
      if (!isValidEmail(email)) {
        rowErrors.push('Emailul nu este valid.')
      } else if (seenEmails.has(email)) {
        rowErrors.push(`Emailul dublează rândul ${seenEmails.get(email)} din acest CSV.`)
      } else {
        seenEmails.set(email, rowNumber)
      }
    }

    if (!Number.isFinite(donation) || donation < 0) {
      rowErrors.push('Donația trebuie să fie un număr pozitiv sau zero.')
    }

    // if (!phone) rowErrors.push('Telefonul este obligatoriu.')

    if (
      dayValue &&
      !event.days?.some(
        (day) => day.id && day.eventDate && formatDateInput(day.eventDate) === dayValue,
      )
    ) {
      rowErrors.push(`Ziua "${dayValue}" nu există în eveniment. Folosește formatul YYYY-MM-DD.`)
    }

    const matchingSlots = eventSlots.filter(
      (option) =>
        (!dayValue || option.date === dayValue) &&
        (!slotValue || option.label === normalizeSlot(slotValue)),
    )
    if (slotValue && matchingSlots.length === 0 && rowErrors.length === 0) {
      rowErrors.push(
        dayValue
          ? `Tura "${slotValue}" nu există în ziua selectată.`
          : `Tura "${slotValue}" nu există în eveniment.`,
      )
    } else if (dayValue && slotValue && matchingSlots.length > 1) {
      rowErrors.push(`Tura "${slotValue}" este ambiguă în ziua selectată.`)
    }

    const automatic = !dayValue || !slotValue
    const candidates = automatic
      ? matchingSlots.filter((option) => option.capacity > 0)
      : matchingSlots
    if (rowErrors.length === 0 && candidates.length === 0) rowErrors.push(NO_AVAILABLE_SLOT)

    if (rowErrors.length > 0) {
      errors.push({ message: rowErrors.join(' '), row: rowNumber })
      return
    }

    const data: RegistrationCreateData = {
      ...(isAgeGroup(ageGroup) ? { ageGroup } : {}),
      day: candidates[0].day,
      donation,
      email,
      event: event.id,
      guests: 0,
      name,
      phone,
      slot: candidates[0].slot,
      status: donation > 0 ? 'present' : 'registered',
    }

    if (questions) data.questions = questions

    rows.push({
      data,
      email,
      name,
      row: rowNumber,
      ...(automatic
        ? { automaticSlots: candidates.map(({ day, slot, capacity }) => ({ day, slot, capacity })) }
        : {}),
    })
  })

  return { errors, rows }
}

export async function importParticipantsFromCSV(args: {
  csv: string
  event: ImportEvent
  invalidate?: (tags: string[]) => void
  payload: ImportPayload
  user: PayloadRequest['user']
}): Promise<ParticipantBulkUploadResult> {
  const parsed = parseParticipantsCSV(args.csv, args.event)
  const result: ParticipantBulkUploadResult = {
    created: [],
    errors: [...parsed.errors],
    skipped: [],
  }

  if (parsed.rows.length === 0) return result

  const batch = createRegistrationImportBatch(args.event, Boolean(args.invalidate))
  const existingEmails = new Set<string>()
  // Bound the email query size even for a large CSV.
  const emails = parsed.rows.flatMap((row) => (row.email ? [row.email] : []))
  for (let offset = 0; offset < emails.length; offset += 500) {
    const chunk = emails.slice(offset, offset + 500)
    const existing = await args.payload.find({
      collection: 'event-registrations',
      depth: 0,
      limit: 0,
      pagination: false,
      select: { email: true },
      overrideAccess: true,
      where: {
        and: [
          { event: { equals: args.event.id } },
          { email: { in: chunk } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
    })
    for (const doc of existing.docs) if (doc.email) existingEmails.add(doc.email)
  }

  const occupancy = new Map<string, number>()
  const slotKey = (day: string, slot: string) => JSON.stringify([day, slot])
  try {
    for (const row of parsed.rows) {
      let selection = { day: row.data.day, slot: row.data.slot }
      let attemptedCreate = false
      const operationState = createEventOperationState()
      try {
        if (row.email && existingEmails.has(row.email)) {
          result.skipped.push({
            email: row.email,
            reason: 'Există deja o înscriere activă cu acest email la eveniment.',
            row: row.row,
          })
          continue
        }

        if (row.automaticSlots) {
          let available = false
          for (const candidate of row.automaticSlots) {
            const key = slotKey(candidate.day, candidate.slot)
            let count = occupancy.get(key)
            if (count === undefined) {
              count = await slotPeople(args.payload, args.event.id, candidate.day, candidate.slot)
              occupancy.set(key, count)
            }
            if (count < candidate.capacity) {
              selection = { day: candidate.day, slot: candidate.slot }
              available = true
              break
            }
          }
          if (!available) throw new Error(NO_AVAILABLE_SLOT)
        }

        // Keep independent transactions: one invalid row must not roll back the upload.
        // Collection hooks still perform live duplicate and capacity checks.
        attemptedCreate = true
        const created = await args.payload.create({
          collection: 'event-registrations',
          context: {
            eventRegistrationImport: true,
            eventRegistrationImportBatch: batch,
            eventOperationState: operationState,
          },
          data: { ...row.data, ...selection },
          depth: 0,
          overrideAccess: true,
          user: args.user,
        })
        if (operationState.event) {
          if (batch.capacityState.token !== operationState.previousToken) occupancy.clear()
          batch.capacityState.token = operationState.token
          if (operationState.capacity) {
            batch.capacityState.counts.set(
              operationState.capacity.key,
              operationState.capacity.people,
            )
            occupancy.set(operationState.capacity.key, operationState.capacity.people)
          }
        }
        if (row.email) existingEmails.add(row.email)
        const key = slotKey(selection.day, selection.slot)
        if (!operationState.event && occupancy.has(key)) occupancy.set(key, occupancy.get(key)! + 1)
        result.created.push({
          email: created.email ?? row.email,
          id: created.id,
          name: created.name,
          row: row.row,
        })
      } catch (error) {
        await releaseEventOperation(args.payload as Payload, operationState)
        // A concurrent registration may have changed availability. Refresh on the next row.
        if (attemptedCreate) occupancy.delete(slotKey(selection.day, selection.slot))
        result.errors.push({
          message: error instanceof Error ? error.message : 'Participantul nu a putut fi importat.',
          row: row.row,
        })
      }
    }
  } finally {
    if (batch.invalidationTags?.size) args.invalidate?.([...batch.invalidationTags])
  }

  return result
}

function getEventSlotOptions(event: Pick<Event, 'days'>) {
  const options: Array<{
    day: string
    slot: string
    capacity: number
    date: string
    label: string
    start: number
  }> = []

  for (const day of event.days ?? []) {
    if (!day?.id || !day.eventDate) continue

    for (const slot of day.slots ?? []) {
      if (!slot?.id) continue

      options.push({
        day: day.id,
        slot: slot.id,
        capacity: Math.max(0, Math.floor(slot.capacity ?? 0)),
        date: formatDateInput(day.eventDate),
        label: normalizeSlot(formatEventSlotLabel(slot.startTime, slot.endTime)),
        start: getEventSlotDateRange(day.eventDate, slot).start?.getTime() ?? 0,
      })
    }
  }

  return options.sort(
    (left, right) => left.date.localeCompare(right.date) || left.start - right.start,
  )
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
