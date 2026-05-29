'use client'

import { useState } from 'react'

import { useDocumentInfo } from '@payloadcms/ui'

export default function MeetingCheckInField() {
  const { id } = useDocumentInfo()

  const [copied, setCopied] = useState(false)

  if (!id) {
    return (
      <div className="field-type">
        <label className="field-label">
          Meeting Check-in Link
        </label>

        <p className="field-description">
          Save the meeting first to generate
          a check-in link.
        </p>
      </div>
    )
  }

  const link = `${location.origin}/members/meetings/${id}/check-in`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="field-type">
      <label className="field-label">
        Meeting Check-in Link
      </label>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
        }}
        className='.field-type.text'
      >
        <input
          readOnly
          value={link}
          className="text"
          style={{
            flex: 1,
          }}
        />

        <button
          type="button"
          className="btn btn--style-primary btn--size-small"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <p className="field-description">
        Share this link or convert it into a QR
        code for attendance check-in.
      </p>
    </div>
  )
}