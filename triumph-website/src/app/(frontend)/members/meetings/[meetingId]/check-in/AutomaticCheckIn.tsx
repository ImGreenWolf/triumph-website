'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Result = { status: 'present' | 'late'; meetingDate: string }

export default function AutomaticCheckIn({ meetingId }: { meetingId: string }) {
  const router = useRouter()
  const submission = useRef<Promise<Result> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    submission.current ??= fetch(
      `/members/meetings/${encodeURIComponent(meetingId)}/check-in/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    ).then(async (response) => {
      if (response.status === 401) {
        router.replace(
          `/members/login?redirect=${encodeURIComponent(`/members/meetings/${meetingId}/check-in`)}`,
        )
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Check-in indisponibil.')
      return data as Result
    })
    submission.current
      .then((data) => {
        if (active) {
          setResult(data)
          router.refresh()
        }
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof Error ? failure.message : 'Check-in indisponibil.')
      })
    return () => {
      active = false
    }
  }, [attempt, meetingId, router])

  return (
    <div className="halftone-background flex min-h-screen items-center justify-center bg-background p-6">
      <section
        aria-live="polite"
        aria-busy={!result && !error}
        className="w-full max-w-md rounded-xl bg-card p-8 shadow"
      >
        <h1 className="mb-4 text-3xl font-bold">
          {result
            ? result.status === 'late'
              ? 'Întârziere înregistrată'
              : 'Prezență înregistrată'
            : error
              ? 'Check-in indisponibil'
              : 'Se înregistrează prezența'}
        </h1>
        {result && (
          <p>
            {new Date(result.meetingDate).toLocaleString('ro-RO', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
        )}
        {error && (
          <>
            <p>{error}</p>
            <button
              className="mt-4 rounded bg-accent px-4 py-2 text-white"
              onClick={() => {
                submission.current = null
                setError('')
                setAttempt((value) => value + 1)
              }}
            >
              Încearcă din nou
            </button>
          </>
        )}
      </section>
    </div>
  )
}
