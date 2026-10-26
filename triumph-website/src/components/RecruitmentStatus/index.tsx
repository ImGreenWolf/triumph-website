'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { RecruitmentStatus } from '@/utilities/recruitmentStatus'

type Status = RecruitmentStatus & { isRecruitmentForm: boolean }
export function useRecruitmentStatus(formID?: string) {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    let boundary: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const query = formID ? `?formId=${encodeURIComponent(formID)}` : ''
        const response = await fetch(`/api/aspirement/recruitment-status${query}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Status unavailable')
        const next = (await response.json()) as Status
        if (!active) return
        setStatus(next)
        setError(false)
        clearTimeout(boundary)
        if (next.nextChange) {
          const delay = Math.max(100, new Date(next.nextChange).getTime() - Date.now())
          boundary = setTimeout(refresh, Math.min(delay, 60_000))
        }
      } catch (failure) {
        if (active && !(failure instanceof DOMException && failure.name === 'AbortError'))
          setError(true)
      }
    }
    void refresh()
    const interval = setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      controller?.abort()
      clearTimeout(boundary)
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [formID, attempt])
  return { status, error, retry: () => setAttempt((value) => value + 1) }
}

export function RecruitmentNotice({ showLink = false }: { showLink?: boolean }) {
  const { status, error, retry } = useRecruitmentStatus()
  return (
    <div aria-live="polite" className="space-y-3">
      <p>
        {error
          ? 'Nu am putut verifica perioada de înscrieri.'
          : status?.message || 'Se verifică perioada de înscrieri…'}
      </p>
      {error && (
        <button type="button" className="min-h-11 underline underline-offset-4" onClick={retry}>
          Încearcă din nou
        </button>
      )}
      {showLink && (
        <Link
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          href="/inscrie-te"
        >
          Vezi pagina de înscriere
        </Link>
      )}
      {status && !status.isOpen && (
        <p>
          <Link
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href="/contact"
          >
            Ai întrebări? Contactează-ne
          </Link>
        </p>
      )}
    </div>
  )
}
