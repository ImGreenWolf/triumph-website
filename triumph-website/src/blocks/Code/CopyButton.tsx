'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function CopyButton({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <div className="mt-4 flex justify-end">
      <Button aria-label="Copiază codul" data-copy-state={status} className="min-h-11 gap-2" type="button" variant="secondary" onClick={async () => {
        if (timer.current) clearTimeout(timer.current)
        try { await navigator.clipboard.writeText(code); setStatus('copied') } catch { setStatus('error') }
        timer.current = setTimeout(() => setStatus('idle'), 2500)
      }}>
        {status === 'copied' ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        <span role="status">{status === 'copied' ? 'Copiat!' : status === 'error' ? 'Încearcă din nou' : 'Copiază'}</span>
      </Button>
    </div>
  )
}
