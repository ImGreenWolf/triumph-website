import * as React from 'react'

import { cn } from '@/utilities/ui'

export const Width: React.FC<{
  children: React.ReactNode
  className?: string
  width?: number | string
}> = ({ children, className, width }) => {
  return <div className={cn('min-w-0', getWidthClass(width), className)}>{children}</div>
}

function getWidthClass(width?: number | string) {
  const value = typeof width === 'string' ? Number(width) : width

  if (!value || Number.isNaN(value) || value >= 100) return 'md:col-span-12'
  if (value <= 25) return 'md:col-span-3'
  if (value <= 34) return 'md:col-span-4'
  if (value <= 50) return 'md:col-span-6'
  if (value <= 67) return 'md:col-span-8'
  if (value <= 75) return 'md:col-span-9'

  return 'md:col-span-12'
}
