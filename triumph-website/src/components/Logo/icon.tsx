'use client'

import { useSiteConfig } from '@/providers/SiteConfig'
import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  size?: 1 | 2 | 3 | 4
  lightSrc?: string | null
  darkSrc?: string | null
}

export const Logo = (props: Props) => {
  const {
    loading: loadingFromProps,
    priority: priorityFromProps,
    className,
    size = 2,
    lightSrc,
    darkSrc,
  } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const siteConfig = useSiteConfig()
  const lightIconSrc =
    lightSrc || siteConfig.lightModeIcon || darkSrc || siteConfig.darkModeIcon || '/logo.png'
  const darkIconSrc = darkSrc || siteConfig.darkModeIcon || lightIconSrc
  const imageClassName = className
    ? `${className} object-contain`
    : clsx('max-w-[2rem] w-full object-contain')

  const imageProps = {
    alt: 'Interact Bucuresti Triumph',
    decoding: 'async' as const,
    fetchPriority: priority,
    height: 128 * size,
    loading,
    width: 128 * size,
  }

  if (lightIconSrc === darkIconSrc) {
    return (
      /* eslint-disable @next/next/no-img-element */
      <img {...imageProps} className={imageClassName} src={lightIconSrc} />
    )
  }

  return (
    /* eslint-disable @next/next/no-img-element */
    <>
      <img {...imageProps} className={clsx(imageClassName, 'dark:hidden')} src={lightIconSrc} />
      <img
        {...imageProps}
        className={clsx(imageClassName, 'hidden dark:block')}
        src={darkIconSrc}
      />
    </>
  )
}

export default Logo
