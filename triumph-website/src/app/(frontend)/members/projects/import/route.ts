import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import { importParticipantsFromCSV } from '@/collections/Events/bulkUpload'
import type { Event, User } from '@/payload-types'

const MAX_CSV_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Cerere nepermisă.' }, { status: 403 })
  }

  const payload = await getPayload({ config: payloadConfig })
  const authHeaders = new Headers(request.headers)
  // The browser Origin can differ from Payload's configured public serverURL in local
  // development or behind a proxy. Cross-site requests were rejected above, so let
  // Payload validate the cookie using the browser-controlled Sec-Fetch-Site header.
  authHeaders.delete('origin')
  if (!authHeaders.has('sec-fetch-site')) {
    authHeaders.set('sec-fetch-site', 'same-origin')
  }
  const auth = await payload.auth({ headers: authHeaders })

  if (!auth.user) {
    return Response.json(
      { message: 'Sesiunea a expirat. Autentifică-te din nou.' },
      { status: 401 },
    )
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return Response.json({ message: 'Formularul trimis nu este valid.' }, { status: 400 })
  }

  const file = formData.get('file')
  const eventID = formData.get('eventId')

  if (typeof eventID !== 'string' || !eventID.trim()) {
    return Response.json({ message: 'Selectează evenimentul pentru import.' }, { status: 400 })
  }

  if (!isUploadedFile(file) || file.size === 0) {
    return Response.json({ message: 'Selectează un fișier CSV.' }, { status: 400 })
  }

  if (file.size > MAX_CSV_SIZE) {
    return Response.json({ message: 'Fișierul CSV nu poate depăși 5 MB.' }, { status: 400 })
  }

  if (!isCSVFile(file)) {
    return Response.json({ message: 'Fișierul trebuie să aibă extensia .csv.' }, { status: 400 })
  }

  let event: Event

  try {
    event = (await payload.findByID({
      collection: 'events',
      depth: 0,
      id: eventID,
      overrideAccess: true,
    })) as Event
  } catch {
    return Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 })
  }

  const user = auth.user as User
  const canManage = (event.coordonators ?? []).some(
    (coordinator) => getRelationshipID(coordinator) === user.id,
  )

  if (!canManage) {
    return Response.json(
      { message: 'Nu ai permisiunea de a importa participanți în acest eveniment.' },
      { status: 403 },
    )
  }

  const result = await importParticipantsFromCSV({
    csv: await file.text(),
    event,
    payload,
    user,
  })
  const issueCount = result.errors.length + result.skipped.length
  const status = result.created.length === 0 && issueCount > 0 ? 400 : 200
  const message =
    result.created.length > 0
      ? `${result.created.length} participant${result.created.length === 1 ? '' : 'i'} importați.`
      : 'Nu a fost importat niciun participant.'

  return Response.json({ message, ...result }, { status })
}

function getRelationshipID(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'name' in value &&
    'size' in value &&
    'text' in value &&
    typeof value.text === 'function',
  )
}

function isCSVFile(file: File) {
  return file.name.toLocaleLowerCase().endsWith('.csv')
}
