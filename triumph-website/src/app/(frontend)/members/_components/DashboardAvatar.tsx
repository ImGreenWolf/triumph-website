'use client'

import { useState } from 'react'
import { UserCircle } from 'lucide-react'

/** The outer 80px circle belongs to the shell and never waits for the image. */
export default function DashboardAvatar({ src }: { src: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      {state !== 'ready' && <UserCircle className="size-9 text-muted-foreground" />}
      {state !== 'error' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={src}
          width={80}
          height={80}
          loading="eager"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${state === 'ready' ? '' : 'opacity-0'}`}
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
        />
      )}
    </span>
  )
}
