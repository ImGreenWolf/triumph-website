import type { Payload, PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'

type UserCreateData = RequiredDataFromCollectionSlug<'users'> & {
  password: string
}

type ImportPayload = Pick<Payload, 'create' | 'find'>

export type MemberCSVError = {
  message: string
  row: number
}

export type ParsedMemberCSVRow = {
  data: UserCreateData
  email: string
  row: number
}

export type MemberBulkUploadResult = {
  created: {
    email: string
    id: string
    row: number
  }[]
  errors: MemberCSVError[]
  skipped: {
    email: string
    reason: string
    row: number
  }[]
}

const allowedRoles = new Set<UserCreateData['role']>([
  'aspirer',
  'active',
  'president',
  'pr-director',
  'hr-director',
  'secretary',
  'tresoursier',
])

const headerAliases = {
  birthday: ['birthday', 'birthdate', 'birth date', 'date of birth', 'dob'],
  email: ['email', 'e-mail', 'mail'],
  joinedAt: ['joinedat', 'joined_at', 'joined at', 'joined date', 'date joined', 'joined'],
  name: ['name', 'full name', 'full_name', 'nume'],
  password: ['password', 'parola'],
  role: ['role', 'rol'],
} as const

type CSVColumn = keyof typeof headerAliases

const normalizedHeaderAliases = new Map<string, CSVColumn>(
  Object.entries(headerAliases).flatMap(([column, aliases]) =>
    aliases.map((alias) => [normalizeHeader(alias), column as CSVColumn]),
  ),
)

export function parseMembersCSV(
  csv: string,
  options: { now?: Date } = {},
): {
  errors: MemberCSVError[]
  rows: ParsedMemberCSVRow[]
} {
  const errors: MemberCSVError[] = []
  const table = parseCSVTable(csv)
  const [headers, ...records] = table.filter((row) => row.some((cell) => cell.trim()))

  if (!headers) {
    return {
      errors: [{ message: 'CSV file is empty.', row: 1 }],
      rows: [],
    }
  }

  const columns = getColumnIndexes(headers, errors)
  const rows: ParsedMemberCSVRow[] = []
  const seenEmails = new Map<string, number>()
  const now = options.now ?? new Date()

  if (columns.email === undefined) {
    errors.push({ message: 'Missing required email column.', row: 1 })
  }

  if (columns.password === undefined) {
    errors.push({ message: 'Missing required password column.', row: 1 })
  }

  if (columns.email === undefined || columns.password === undefined) {
    return { errors, rows }
  }

  const emailColumn = columns.email
  const passwordColumn = columns.password

  records.forEach((record, recordIndex) => {
    const rowNumber = recordIndex + 2
    const rowErrors: string[] = []
    const email = getCell(record, emailColumn).toLowerCase()
    const password = getCell(record, passwordColumn)
    const name = getOptionalCell(record, columns.name)
    const role = getOptionalCell(record, columns.role) || 'active'
    const joinedAtValue = getOptionalCell(record, columns.joinedAt)
    const birthdayValue = getOptionalCell(record, columns.birthday)

    if (!email) {
      rowErrors.push('Email is required.')
    } else if (!isValidEmail(email)) {
      rowErrors.push('Email is invalid.')
    } else if (seenEmails.has(email)) {
      rowErrors.push(`Email duplicates row ${seenEmails.get(email)} in this CSV.`)
    } else {
      seenEmails.set(email, rowNumber)
    }

    if (!password) {
      rowErrors.push('Password is required.')
    } else if (password.length < 8) {
      rowErrors.push('Password must be at least 8 characters.')
    }

    if (!allowedRoles.has(role as UserCreateData['role'])) {
      rowErrors.push(`Role "${role}" is not valid.`)
    }

    const joinedAt = joinedAtValue
      ? parseDateOnly(joinedAtValue, 'joinedAt', rowErrors)
      : now.toISOString()
    const birthday = birthdayValue ? parseDateOnly(birthdayValue, 'birthday', rowErrors) : null

    if (rowErrors.length > 0) {
      errors.push({
        message: rowErrors.join(' '),
        row: rowNumber,
      })
      return
    }

    const data: UserCreateData = {
      email,
      joinedAt,
      password,
      role: role as UserCreateData['role'],
    }

    if (name) {
      data.name = name
    }

    if (birthday) {
      data.birthday = birthday
      data.birthdayConfirmed = true
    }

    rows.push({
      data,
      email,
      row: rowNumber,
    })
  })

  return { errors, rows }
}

export async function importMembersFromCSV(args: {
  csv: string
  payload: ImportPayload
  user: PayloadRequest['user']
}): Promise<MemberBulkUploadResult> {
  const parsed = parseMembersCSV(args.csv)
  const result: MemberBulkUploadResult = {
    created: [],
    errors: [...parsed.errors],
    skipped: [],
  }

  for (const row of parsed.rows) {
    try {
      const existing = await args.payload.find({
        collection: 'users',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          email: {
            equals: row.email,
          },
        },
      })

      if (existing.totalDocs > 0) {
        result.skipped.push({
          email: row.email,
          reason: 'A user with this email already exists.',
          row: row.row,
        })
        continue
      }

      const created = await args.payload.create({
        collection: 'users',
        data: row.data,
        overrideAccess: true,
        user: args.user,
      })

      result.created.push({
        email: created.email,
        id: created.id,
        row: row.row,
      })
    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : 'User could not be created.',
        row: row.row,
      })
    }
  }

  return result
}

function parseCSVTable(input: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const csv = input.replace(/^\uFEFF/, '')

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

    if (!inQuotes && char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''

      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)

  return rows
}

function getColumnIndexes(headers: string[], errors: MemberCSVError[]) {
  const columns: Partial<Record<CSVColumn, number>> = {}

  headers.forEach((header, index) => {
    const column = normalizedHeaderAliases.get(normalizeHeader(header))

    if (!column) return

    if (columns[column] !== undefined) {
      errors.push({
        message: `Duplicate ${column} column.`,
        row: 1,
      })
      return
    }

    columns[column] = index
  })

  return columns
}

function getCell(record: string[], index: number) {
  return (record[index] ?? '').trim()
}

function getOptionalCell(record: string[], index: number | undefined) {
  if (index === undefined) return null

  return getCell(record, index) || null
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function parseDateOnly(value: string, field: string, errors: string[]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${field} must use YYYY-MM-DD format.`)
    return ''
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.push(`${field} is not a valid date.`)
    return ''
  }

  return parsed.toISOString()
}
