'use client'
import React, { useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'

import type { Media as MediaType, Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { getMediaUrl } from '@/utilities/getMediaUrl'

type VideoHeroProps = Page['hero'] & {
  posterLandscape?: MediaType | string | null
  posterVertical?: MediaType | string | null
}

function Title({ title }: any) {
  return (
    <>
      {title && title?.inputType == 'text' ? (
        <h1 className="text-6xl w-3/4 lg:text-[8em] lg:leading-28 text-center italic mb-8 text-primary">
          {title.text}
        </h1>
      ) : (
        <Media resource={title?.media} className="not-lg:mx-auto not-lg:max-w-100 w-full" />
      )}
    </>
  )
}

const desktopVideoQuery = '(min-width: 1024px)'
const mobileVideoQuery = '(max-width: 1023px)'

const getVideoMedia = (media: MediaType | string | null | undefined) => {
  return media && typeof media === 'object' ? media : null
}

const getImageMedia = (media: MediaType | string | null | undefined) => {
  return media && typeof media === 'object' && media.mimeType?.includes('image') ? media : null
}

const getVideoUrl = (media: MediaType | null) => {
  return media?.url ? getMediaUrl(media.url, media.updatedAt) : ''
}

const getPosterUrl = (media: MediaType | null) => {
  const url =
    media?.sizes?.xlarge?.url ||
    media?.sizes?.large?.url ||
    media?.sizes?.medium?.url ||
    media?.thumbnailURL ||
    media?.url

  return url ? getMediaUrl(url, media?.updatedAt) : ''
}

const preloadHeroVideo = (media: MediaType | null, mediaQuery?: string) => {
  const href = getVideoUrl(media)

  if (!href) return

  preload(href, {
    as: 'video',
    fetchPriority: 'high',
    media: mediaQuery,
    type: media?.mimeType || undefined,
  })
}

const preloadHeroPoster = (href: string, mediaQuery?: string) => {
  if (!href) return

  preload(href, {
    as: 'image',
    fetchPriority: 'high',
    media: mediaQuery,
  })
}

const useDesktopHeroVideo = () => {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopVideoQuery)
    const update = () => setIsDesktop(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)

    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isDesktop
}

export const VideoHero: React.FC<VideoHeroProps> = ({
  links,
  title,
  mediaVertical,
  mediaLandscape,
  posterLandscape,
  posterVertical,
  richText,
}) => {
  const landscapeMedia = getVideoMedia(mediaLandscape)
  const verticalMedia = getVideoMedia(mediaVertical)
  const landscapePosterMedia = getImageMedia(posterLandscape)
  const verticalPosterMedia = getImageMedia(posterVertical)
  const landscapeSrc = getVideoUrl(landscapeMedia)
  const verticalSrc = getVideoUrl(verticalMedia)
  const landscapePosterUrl = getPosterUrl(landscapePosterMedia) || getPosterUrl(landscapeMedia)
  const verticalPosterUrl = getPosterUrl(verticalPosterMedia) || getPosterUrl(verticalMedia)
  const posterUrl = landscapePosterUrl || verticalPosterUrl
  const isDesktop = useDesktopHeroVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const selectedSrc =
    isDesktop === null ? '' : isDesktop ? landscapeSrc || verticalSrc : verticalSrc || landscapeSrc
  const selectedPosterUrl =
    isDesktop === null
      ? posterUrl
      : isDesktop
        ? landscapePosterUrl || verticalPosterUrl
        : verticalPosterUrl || landscapePosterUrl
  const [isVideoReady, setIsVideoReady] = useState(false)

  preloadHeroVideo(verticalMedia, mobileVideoQuery)
  preloadHeroVideo(landscapeMedia, desktopVideoQuery)
  preloadHeroPoster(verticalPosterUrl, mobileVideoQuery)
  preloadHeroPoster(landscapePosterUrl, desktopVideoQuery)

  useEffect(() => {
    setIsVideoReady(false)

    const video = videoRef.current
    if (!video || !selectedSrc) return

    video.load()
    video.play().catch(() => {
      // Muted autoplay can still be delayed by the browser; keep the poster visible.
    })
  }, [selectedSrc])

  return (
    <div className="relative b-0 text-text -pt-24 max-h-[100dvh] h-[100dvh] flex flex-col justify-center items-end">
      <div className="lg:container h-full flex align-right items-center justify-end mx-auto">
        <div
          className={cn(
            'mb-8 z-10 overflow-hidden relative',
            'flex flex-col text-center justify-center items-center h-2/3',
            'lg:text-right lg:items-end lg:justify-center lg:justify-items-end lg:h-1/2 lg:my-auto lg:w-1/3 lg:align-right lg:text-shadow-lg',
          )}
        >
          <Title title={title} />

          {richText && (
            <RichText
              className="mb-16 text-sm lg:text-md not-lg:mx-12"
              data={richText}
              enableGutter={false}
              enableProse={false}
            />
          )}

          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex justify-center gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink
                      {...link}
                      className={cn(
                        'rounded-full transition-50 px-4 h-8 lg:h-10 lg:px-6 text-xs xl:text-base border border-accent ',
                        link.appearance == 'outline' &&
                          'bg-foreground/25 text-primary backdrop-blur-xl ',
                        link.appearance != 'outline' && 'bg-accent text-primary hover:text-accent',
                      )}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="absolute w-full top-1/2 inset-0 overflow-hidden bg-linear-to-t lg:bg-radial-[at_100%_100%] from-black to-60% to-transparent z-2">
        <ArrowDown className="absolute w-full bottom-8" stroke="white" />
      </div>

      <div className="select-none w-full absolute inset-0 h-full overflow-hidden bg-black">
        {(landscapePosterUrl || verticalPosterUrl) && (
          <picture
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ease-out',
              isVideoReady ? 'opacity-0' : 'opacity-100',
            )}
          >
            {verticalPosterUrl && (
              <source
                media={landscapePosterUrl ? mobileVideoQuery : undefined}
                srcSet={verticalPosterUrl}
              />
            )}
            {landscapePosterUrl && (
              <source
                media={verticalPosterUrl ? desktopVideoQuery : undefined}
                srcSet={landscapePosterUrl}
              />
            )}
            <img
              alt=""
              className="h-full w-full object-cover"
              decoding="async"
              loading="eager"
              src={posterUrl}
            />
          </picture>
        )}

        {selectedSrc && (
          <video
            key={selectedSrc}
            autoPlay
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out',
              selectedPosterUrl && !isVideoReady ? 'opacity-0' : 'opacity-100',
            )}
            controls={false}
            loop
            muted
            onCanPlay={() => setIsVideoReady(true)}
            onLoadedData={() => setIsVideoReady(true)}
            onPlaying={() => setIsVideoReady(true)}
            playsInline
            preload="auto"
            ref={videoRef}
            src={selectedSrc}
          />
        )}
      </div>
    </div>
  )
}
