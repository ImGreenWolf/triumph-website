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
import { HandwritingHeadline } from './HandwritingHeadline'
import { observeHeroActivity } from './activity'
import { resolveHandwriting } from './settings'

type VideoHeroProps = Page['hero'] & {
  posterLandscape?: MediaType | string | null
  posterVertical?: MediaType | string | null
}

type PosterAsset = {
  fallbackUrl: string
  placeholderUrl: string
  srcSet: string
}

function Title({ title }: { title: Page['hero']['title'] }) {
  return (
    <>
      {title && title?.inputType == 'text' ? (
        <h1 className="w-full text-center text-5xl leading-tight font-medium text-balance text-white italic [overflow-wrap:anywhere] md:text-7xl lg:text-8xl">
          {title.text}
        </h1>
      ) : title?.media ? (
        <Media
          priority
          resource={title.media}
          htmlElement="h1"
          className="mx-auto w-full max-w-300"
          imgClassName="mx-auto w-auto max-w-full object-contain"
        />
      ) : null}
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
    media?.sizes?.large?.url ||
    media?.sizes?.medium?.url ||
    media?.sizes?.xlarge?.url ||
    media?.thumbnailURL ||
    media?.url

  return url ? getMediaUrl(url, media?.updatedAt) : ''
}

const getPosterAsset = (media: MediaType | null): PosterAsset | null => {
  if (!media) return null

  const candidates = [
    media.sizes?.small,
    media.sizes?.medium,
    media.sizes?.large,
    media.sizes?.xlarge,
    media.width && media.url ? { url: media.url, width: media.width } : null,
  ].filter((size): size is { url: string; width: number } => Boolean(size?.url && size.width))

  const placeholder =
    media.sizes?.thumbnail?.url || media.sizes?.small?.url || media.thumbnailURL || media.url
  const fallback = media.sizes?.medium?.url || media.sizes?.large?.url || media.url || placeholder

  if (!placeholder || !fallback) return null

  return {
    fallbackUrl: getMediaUrl(fallback, media.updatedAt),
    placeholderUrl: getMediaUrl(placeholder, media.updatedAt),
    srcSet: candidates
      .map((size) => `${getMediaUrl(size.url, media.updatedAt)} ${size.width}w`)
      .join(', '),
  }
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

const preloadHeroPoster = (asset: PosterAsset | null, mediaQuery?: string) => {
  if (!asset?.fallbackUrl) return

  preload(asset.fallbackUrl, {
    as: 'image',
    fetchPriority: 'high',
    imageSizes: '100vw',
    imageSrcSet: asset.srcSet || undefined,
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
  handwriting,
}) => {
  const handwritingSettings = resolveHandwriting(handwriting)
  const hasHandwriting = handwritingSettings.entries.length > 0
  const hasTitle = title?.inputType === 'text' ? Boolean(title.text?.trim()) : Boolean(title?.media)
  const landscapeMedia = getVideoMedia(mediaLandscape)
  const verticalMedia = getVideoMedia(mediaVertical)
  const landscapePosterMedia = getImageMedia(posterLandscape)
  const verticalPosterMedia = getImageMedia(posterVertical)
  const landscapeSrc = getVideoUrl(landscapeMedia)
  const verticalSrc = getVideoUrl(verticalMedia)
  const landscapePosterAsset = getPosterAsset(landscapePosterMedia)
  const verticalPosterAsset = getPosterAsset(verticalPosterMedia)
  const landscapePosterUrl = landscapePosterAsset?.fallbackUrl || getPosterUrl(landscapeMedia)
  const verticalPosterUrl = verticalPosterAsset?.fallbackUrl || getPosterUrl(verticalMedia)
  const posterUrl = landscapePosterUrl || verticalPosterUrl
  const landscapePlaceholderUrl = landscapePosterAsset?.placeholderUrl || landscapePosterUrl
  const verticalPlaceholderUrl = verticalPosterAsset?.placeholderUrl || verticalPosterUrl
  const placeholderUrl = landscapePlaceholderUrl || verticalPlaceholderUrl
  const isDesktop = useDesktopHeroVideo()
  const heroRef = useRef<HTMLElement>(null)
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  preloadHeroVideo(verticalMedia, mobileVideoQuery)
  preloadHeroVideo(landscapeMedia, desktopVideoQuery)
  preloadHeroPoster(verticalPosterAsset, mobileVideoQuery)
  preloadHeroPoster(landscapePosterAsset, desktopVideoQuery)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A responsive source change starts a new video load lifecycle.
    setIsVideoReady(false)

    const video = videoRef.current
    const hero = heroRef.current
    if (!video || !hero || !selectedSrc) return

    video.load()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let active = true
    const update = () => {
      setPrefersReducedMotion(motion.matches)
      if (active && !motion.matches) {
        video.play().catch(() => {
          // Muted autoplay can still be delayed by the browser; keep the poster visible.
        })
      } else video.pause()
    }
    const stopObserving = observeHeroActivity(hero, (visible) => {
      active = visible
      update()
    })
    motion.addEventListener('change', update)
    return () => {
      stopObserving()
      motion.removeEventListener('change', update)
      video.pause()
    }
  }, [selectedSrc])

  const description = richText ? (
    <RichText
      className="w-full max-w-xl text-base leading-relaxed text-pretty text-white [overflow-wrap:anywhere] [text-shadow:0_2px_12px_rgb(0_0_0_/_40%)] sm:text-lg"
      data={richText}
      enableGutter={false}
      enableProse={false}
    />
  ) : null
  const buttons =
    Array.isArray(links) && links.length > 0 ? (
      <ul
        className="mx-auto flex w-full max-w-sm list-none flex-col items-stretch justify-center gap-3 p-0 sm:max-w-none sm:flex-row sm:flex-wrap"
        data-hero-links=""
      >
        {links.map(({ link, id }, index) => (
          <li key={id || index}>
            <CMSLink
              {...link}
              appearance={link.appearance === 'outline' ? 'outline' : 'default'}
              className={cn(
                'h-auto min-h-13 w-full rounded-full border border-white/70 px-7 py-3 text-sm font-medium whitespace-normal shadow-none transition-[background-color,color,border-color] duration-200 [overflow-wrap:anywhere] focus-visible:ring-4 focus-visible:ring-black/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none sm:w-auto',
                link.appearance === 'outline'
                  ? 'bg-black/55 text-white hover:border-white hover:bg-white hover:text-primary-foreground active:bg-white/90'
                  : 'bg-white text-primary-foreground hover:border-white/90 hover:bg-white/90 active:bg-white/80',
              )}
            />
          </li>
        ))}
      </ul>
    ) : null

  return (
    <section
      className="relative isolate flex min-h-dvh items-center justify-center bg-black pt-[calc(8rem_+_env(safe-area-inset-top,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] pb-[calc(8rem_+_env(safe-area-inset-bottom,0px))] pl-[max(1.5rem,env(safe-area-inset-left,0px))] text-white selection:bg-white selection:text-primary-foreground lg:px-16"
      ref={heroRef}
    >
      <div className="relative z-3 w-full max-w-6xl text-center">
        {hasHandwriting && handwriting ? (
          <HandwritingHeadline
            actions={buttons}
            config={handwriting}
            finalTitle={!handwritingSettings.loop && hasTitle ? <Title title={title} /> : null}
            key={JSON.stringify([handwriting, title])}
          >
            {description}
          </HandwritingHeadline>
        ) : (
          <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
            <Title title={title} />
            {(description || buttons) && (
              <div className="flex w-full flex-col items-center gap-6">
                {description}
                {buttons}
              </div>
            )}
          </div>
        )}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-1"
        style={{ backgroundColor: `rgb(0 0 0 / ${handwritingSettings.backgroundDarkening}%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-2 bg-linear-to-t from-black/60 via-transparent to-black/15"
      >
        <ArrowDown
          className="absolute bottom-[calc(1.5rem_+_env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2"
          stroke="white"
        />
      </div>

      <div
        aria-hidden="true"
        className="select-none w-full absolute inset-0 h-full overflow-hidden bg-black"
      >
        {(landscapePlaceholderUrl || verticalPlaceholderUrl) && (
          <picture className="pointer-events-none absolute inset-0 h-full w-full">
            {verticalPlaceholderUrl && (
              <source
                media={landscapePlaceholderUrl ? mobileVideoQuery : undefined}
                srcSet={verticalPlaceholderUrl}
              />
            )}
            {landscapePlaceholderUrl && (
              <source
                media={verticalPlaceholderUrl ? desktopVideoQuery : undefined}
                srcSet={landscapePlaceholderUrl}
              />
            )}
            <img
              alt=""
              className="h-full w-full scale-105 object-cover blur-md"
              decoding="async"
              loading="eager"
              src={placeholderUrl}
            />
          </picture>
        )}

        {(landscapePosterUrl || verticalPosterUrl) && (
          <picture
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ease-out motion-reduce:transition-none',
              isVideoReady && !prefersReducedMotion ? 'opacity-0' : 'opacity-100',
            )}
          >
            {verticalPosterUrl && (
              <source
                media={landscapePosterUrl ? mobileVideoQuery : undefined}
                sizes="100vw"
                srcSet={verticalPosterAsset?.srcSet || verticalPosterUrl}
              />
            )}
            {landscapePosterUrl && (
              <source
                media={verticalPosterUrl ? desktopVideoQuery : undefined}
                sizes="100vw"
                srcSet={landscapePosterAsset?.srcSet || landscapePosterUrl}
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
            aria-hidden="true"
            key={selectedSrc}
            autoPlay={!prefersReducedMotion}
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none',
              selectedPosterUrl && (!isVideoReady || prefersReducedMotion)
                ? 'opacity-0'
                : 'opacity-100',
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
            tabIndex={-1}
          />
        )}
      </div>
    </section>
  )
}
