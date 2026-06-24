'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import './MembersBeforeList.scss'


type BulkUploadIssue = {
  email?: string
  message?: string
  reason?: string
  row: number
}

type BulkUploadResponse = {
  created?: {
    email: string
    id: string
    row: number
  }[]
  errors?: BulkUploadIssue[]
  message?: string
  skipped?: BulkUploadIssue[]
}

type UploadState = {
  response?: BulkUploadResponse
  tone: 'error' | 'success'
}

export default function MemberActions() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)



  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      setUploadState({
        response: { message: 'Select a CSV file before uploading.' },
        tone: 'error',
      })
      return
    }

    setIsUploading(true)
    setUploadState(null)

    try {
      const response = await fetch('/api/users/bulk-upload', {
        body: formData,
        credentials: 'include',
        method: 'POST',
      })
      const data = (await response.json()) as BulkUploadResponse
      const createdCount = data.created?.length ?? 0

      setUploadState({
        response: data,
        tone: response.ok && createdCount > 0 ? 'success' : 'error',
      })

      if (response.ok && createdCount > 0) {
        formRef.current?.reset()
        router.refresh()
      }
    } catch (error) {
      setUploadState({
        response: {
          message: error instanceof Error ? error.message : 'CSV upload failed.',
        },
        tone: 'error',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const createdCount = uploadState?.response?.created?.length ?? 0
  const skipped = uploadState?.response?.skipped ?? []
  const errors = uploadState?.response?.errors ?? []

  return (
    <section className="members-before-list container" aria-label="Bulk upload members">
      <div>
        <h2 className="members-before-list__title">Bulk upload members</h2>
        <p className="members-before-list__description">
          Upload a CSV with email and password columns. Optional columns: name, phone, status (or
          role), join date (or joinedAt), and birthday. Join date uses MM/YYYY; birthday uses
          YYYY-MM-DD.
        </p>
      </div>

      <form className="members-before-list__form" ref={formRef} onSubmit={handleSubmit}>
        <label className="members-before-list__field" htmlFor="members-csv-file">
          <span>CSV file</span>
          <input
            accept=".csv,text/csv"
            disabled={isUploading}
            id="members-csv-file"
            name="file"
            type="file"
          />
        </label>

        <button className="members-before-list__button" disabled={isUploading} type="submit">
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </form>

      {uploadState && (
        <div
          className={`members-before-list__result members-before-list__result--${uploadState.tone}`}
        >
          <p className="members-before-list__message">
            {uploadState.response?.message || 'CSV upload finished.'}
          </p>

          {(createdCount > 0 || skipped.length > 0 || errors.length > 0) && (
            <div className="members-before-list__summary">
              <span>{createdCount} created</span>
              <span>{skipped.length} skipped</span>
              <span>{errors.length} errors</span>
            </div>
          )}

          {(skipped.length > 0 || errors.length > 0) && (
            <ul className="members-before-list__issues">
              {skipped.map((issue) => (
                <li key={`skipped-${issue.row}-${issue.email}`}>
                  Row {issue.row}: {issue.email ? `${issue.email} - ` : ''}
                  {issue.reason || 'Skipped.'}
                </li>
              ))}
              {errors.map((issue) => (
                <li key={`error-${issue.row}-${issue.message}`}>
                  Row {issue.row}: {issue.message || 'Could not import row.'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
