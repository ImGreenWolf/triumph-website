'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RemoteProjectData } from '@/utilities/eventOperationsTypes'

export function useProjectPage(
  eventId: string,
  params: {
    page: number
    query: string
    shift: string
    status: string
    sort?: string
    direction?: string
  },
  enabled: boolean,
) {
  const [result, setResult] = useState<{ key: string; data: RemoteProjectData } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [generation, setGeneration] = useState(0)
  const etag = useRef<{ key: string; value: string } | null>(null)
  const refresh = useCallback(() => {
    etag.current = null
    setGeneration((value) => value + 1)
  }, [])
  const search = new URLSearchParams({
    eventId,
    page: String(params.page),
    q: params.query,
    shift: params.shift,
    status: params.status,
    sort: params.sort || '',
    direction: params.direction || '',
  }).toString()
  useEffect(() => {
    if (!enabled || !eventId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let inFlight = false
    setLoading(true)
    async function poll() {
      if (controller.signal.aborted || inFlight || document.hidden) return
      inFlight = true
      try {
        const response = await fetch(`/members/projects/data?${search}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: etag.current?.key === search ? { 'If-None-Match': etag.current.value } : {},
        })
        if (response.status === 304) {
          setLastSynced(Date.now())
          setError(null)
          return
        }
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Lista nu a putut fi actualizată.')
        if (controller.signal.aborted) return
        etag.current = { key: search, value: response.headers.get('ETag') || '' }
        setResult({ key: search, data })
        setLastSynced(Date.now())
        setError(null)
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Lista nu a putut fi actualizată.')
      } finally {
        inFlight = false
        if (!controller.signal.aborted) {
          setLoading(false)
          timer = setTimeout(poll, 5000)
        }
      }
    }
    function resume() {
      clearTimeout(timer)
      void poll()
    }
    timer = setTimeout(poll, params.query ? 200 : 0)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      controller.abort()
      clearTimeout(timer)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [enabled, eventId, search, generation, params.query])
  return {
    data: result?.data.eventId === eventId ? result.data : null,
    matches: result?.key === search,
    loading,
    error,
    lastSynced,
    refresh,
  }
}
