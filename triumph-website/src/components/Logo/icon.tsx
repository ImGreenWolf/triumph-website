import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low',
  size?: 1 | 2 | 3 | 4
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className, size=2 } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    /* eslint-disable @next/next/no-img-element */
    <img
      alt="Interact Bucuresti Triumph"
      width={128 * size}
      height={128 * size}
      loading={loading}
      fetchPriority={priority}
      decoding="async"
      className={className ? className + " object-contain" : clsx('max-w-[2rem] w-full object-contain', className)}
      src="/logo.png"
    />
  )
}

export default Logo