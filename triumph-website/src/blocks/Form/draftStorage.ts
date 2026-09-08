type FormDraft = {
  formID: string
  updatedAt: string
  values: Record<string, unknown>
}

const DATABASE_NAME = 'triumph-form-drafts'
const DATABASE_VERSION = 1
const STORE_NAME = 'drafts'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Unable to open draft storage.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'formID' })
      }
    }
  })
}

function completeRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('Draft storage request failed.'))
    request.onsuccess = () => resolve(request.result)
  })
}

export async function clearFormDraft(formID: string) {
  const database = await openDatabase()

  try {
    await completeRequest(
      database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(formID),
    )
  } finally {
    database.close()
  }
}

export async function loadFormDraft(formID: string) {
  const database = await openDatabase()

  try {
    return (await completeRequest(
      database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(formID),
    )) as FormDraft | undefined
  } finally {
    database.close()
  }
}

export async function saveFormDraft(formID: string, values: Record<string, unknown>) {
  const database = await openDatabase()
  const draft: FormDraft = {
    formID,
    updatedAt: new Date().toISOString(),
    values,
  }

  try {
    await completeRequest(
      database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(draft),
    )
  } finally {
    database.close()
  }
}
