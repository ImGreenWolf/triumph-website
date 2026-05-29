'use client'

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { gsap } from 'gsap'

const useMedia = (
  queries: string[],
  values: number[],
  defaultValue: number,
): number => {
  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const index = queries.findIndex((q) =>
      window.matchMedia(q).matches,
    )

    return values[index] ?? defaultValue
  }

  const [value, setValue] = useState<number>(() => get())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => setValue(get())

    const mediaQueries = queries.map((q) =>
      window.matchMedia(q),
    )

    mediaQueries.forEach((mq) => {
      mq.addEventListener('change', handler)
    })

    return () => {
      mediaQueries.forEach((mq) => {
        mq.removeEventListener('change', handler)
      })
    }
  }, [queries])

  return value
}

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null)

  const [size, setSize] = useState({
    width: 0,
    height: 0,
  })

  useLayoutEffect(() => {
    if (
      typeof window === 'undefined' ||
      !ref.current ||
      typeof ResizeObserver === 'undefined'
    ) {
      return
    }

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect

      setSize({
        width,
        height,
      })
    })

    ro.observe(ref.current)

    return () => ro.disconnect()
  }, [])

  return [ref, size] as const
}

const preloadImages = async (
  urls: string[],
): Promise<void> => {
  if (typeof window === 'undefined') return

  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()

          img.src = src

          img.onload = img.onerror = () => resolve()
        }),
    ),
  )
}

interface Item {
  id: string
  img: string
  url: string
  height: number
  width?: number
  caption?: string
}

interface GridItem extends Item {
  x: number
  y: number
  w: number
  h: number
}

interface MasonryProps {
  items: Item[]
  ease?: string
  duration?: number
  stagger?: number
  animateFrom?:
    | 'bottom'
    | 'top'
    | 'left'
    | 'right'
    | 'center'
    | 'random'
  scaleOnHover?: boolean
  hoverScale?: number
  blurToFocus?: boolean
  colorShiftOnHover?: boolean
  columnProps?: number[]
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  columnProps,
}) => {
  const columns = useMedia(
    [
      '(min-width:1500px)',
      '(min-width:1000px)',
      '(min-width:600px)',
      '(min-width:400px)',
    ],
    columnProps ?? [5, 4, 3, 2],
    1,
  )

  const [containerRef, { width }] =
    useMeasure<HTMLDivElement>()

  const [imagesReady, setImagesReady] =
    useState(false)

  const getInitialPosition = (item: GridItem) => {
    const containerRect =
      containerRef.current?.getBoundingClientRect()

    if (!containerRect) {
      return {
        x: item.x,
        y: item.y,
      }
    }

    let direction = animateFrom

    if (animateFrom === 'random') {
      const dirs = [
        'top',
        'bottom',
        'left',
        'right',
      ]

      direction =
        dirs[
          Math.floor(Math.random() * dirs.length)
        ] as typeof animateFrom
    }

    switch (direction) {
      case 'top':
        return {
          x: item.x,
          y: -200,
        }

      case 'bottom':
        return {
          x: item.x,
          y:
            typeof window !== 'undefined'
              ? window.innerHeight + 200
              : item.y,
        }

      case 'left':
        return {
          x: -200,
          y: item.y,
        }

      case 'right':
        return {
          x:
            typeof window !== 'undefined'
              ? window.innerWidth + 200
              : item.x,
          y: item.y,
        }

      case 'center':
        return {
          x:
            containerRect.width / 2 -
            item.w / 2,
          y:
            containerRect.height / 2 -
            item.h / 2,
        }

      default:
        return {
          x: item.x,
          y: item.y + 100,
        }
    }
  }

  useEffect(() => {
    let mounted = true

    setImagesReady(false)

    preloadImages(items.map((i) => i.img)).then(() => {
      if (mounted) {
        setImagesReady(true)
      }
    })

    return () => {
      mounted = false
    }
  }, [items])

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return []

    const colHeights = new Array(columns).fill(0)

    const gap = 16

    const totalGaps = (columns - 1) * gap

    const columnWidth =
      (width - totalGaps) / columns

    return items.map((child) => {
      const col = colHeights.indexOf(
        Math.min(...colHeights),
      )

      const x = col * (columnWidth + gap)

      const aspectRatio =
        child.width && child.height
          ? child.width / child.height
          : 1

      const height = columnWidth / aspectRatio

      const y = colHeights[col]

      colHeights[col] += height + gap

      return {
        ...child,
        x,
        y,
        w: columnWidth,
        h: height,
      }
    })
  }, [columns, items, width])

  useEffect(() => {
    if (!containerRef.current || !grid.length)
      return

    const maxHeight = Math.max(
      ...grid.map((item) => item.y + item.h),
    )

    containerRef.current.style.height = `${maxHeight}px`
  }, [grid])

  const hasMounted = useRef(false)

  useLayoutEffect(() => {
    if (!imagesReady) return

    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`

      const animProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      }

      if (!hasMounted.current) {
        const start = getInitialPosition(item)

        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: start.x,
            y: start.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && {
              filter: 'blur(10px)',
            }),
          },
          {
            opacity: 1,
            ...animProps,
            ...(blurToFocus && {
              filter: 'blur(0px)',
            }),
            duration: 0.8,
            ease: 'power3.out',
            delay: index * stagger,
          },
        )
      } else {
        gsap.to(selector, {
          ...animProps,
          duration,
          ease,
          overwrite: 'auto',
        })
      }
    })

    hasMounted.current = true
  }, [
    grid,
    imagesReady,
    stagger,
    animateFrom,
    blurToFocus,
    duration,
    ease,
  ])

  const handleMouseEnter = (
    id: string,
    element: HTMLElement,
  ) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${id}"]`, {
        scale: hoverScale,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    if (colorShiftOnHover) {
      const overlay = element.querySelector(
        '.color-overlay',
      ) as HTMLElement

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0.3,
          duration: 0.3,
        })
      }
    }

    const text = element.querySelector(
      'p',
    ) as HTMLElement

    if (text) {
      gsap.to(text, {
        opacity: 1,
      })
    }
  }

  const handleMouseLeave = (
    id: string,
    element: HTMLElement,
  ) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${id}"]`, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    if (colorShiftOnHover) {
      const overlay = element.querySelector(
        '.color-overlay',
      ) as HTMLElement

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.3,
        })
      }
    }

    const text = element.querySelector(
      'p',
    ) as HTMLElement

    if (text) {
      gsap.to(text, {
        opacity: 0,
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
    >
      {grid.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          className="absolute box-content"
          style={{
            willChange:
              'transform, width, height, opacity',
          }}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.open(
                item.url,
                '_blank',
                'noopener',
              )
            }
          }}
          onMouseEnter={(e) =>
            handleMouseEnter(
              item.id,
              e.currentTarget,
            )
          }
          onMouseLeave={(e) =>
            handleMouseLeave(
              item.id,
              e.currentTarget,
            )
          }
        >
          <div className="relative w-full h-full rounded-[10px] overflow-hidden shadow-[0px_10px_50px_-10px_rgba(0,0,0,0.2)] text-[10px]">
            <img
              alt={item.caption || ''}
              className="block h-full w-full object-cover"
              draggable={false}
              src={item.img}
            />

            {colorShiftOnHover && (
              <div className="color-overlay absolute inset-0 rounded-[10px] bg-gradient-to-tr from-pink-500/50 to-sky-500/50 opacity-0 pointer-events-none" />
            )}

            {item.caption && (
              <p className="opacity-0 text-lg text-left bottom-0 p-4 pb-6 absolute w-full bg-black/20 backdrop-blur-xs font-bold">
                {item.caption}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Masonry