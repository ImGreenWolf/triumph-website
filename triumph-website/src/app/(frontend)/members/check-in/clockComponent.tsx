'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

function ClockComponent(props: { className?: string }) {
  const { className } = props
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    function tick() {
      const now = new Date()

      setTime(now)
      timer = setTimeout(tick, 1000 - now.getMilliseconds())
    }

    tick()

    return () => clearTimeout(timer)
  }, [])

  return (
    <time className={cn('tabular-nums', className)} dateTime={time.toISOString()}>
      {time.toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </time>
  )
}

export default ClockComponent
