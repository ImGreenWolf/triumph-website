import React from 'react'
import { Heart, Sparkles, UsersRound } from 'lucide-react'

import { Media } from '@/components/Media'
import type { TriumphIntroBlock as TriumphIntroProps } from '@/payload-types'

const icons = {
  heart: Heart,
  people: UsersRound,
  spark: Sparkles,
}

export const TriumphIntroBlock: React.FC<TriumphIntroProps> = ({
  eyebrow,
  title,
  description,
  photo,
  caption,
  highlights,
}) => {
  const image =
    photo && typeof photo === 'object' && photo.url && photo.mimeType?.startsWith('image/')
      ? photo
      : null

  return (
    <section className="container">
      <div className="relative isolate overflow-hidden rounded-3xl border border-foreground/10 bg-card/30 px-5 py-8 sm:px-8 sm:py-12 lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-48 -z-10 size-96 rounded-full bg-accent/5 blur-3xl"
        />

        <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-accent [overflow-wrap:anywhere] sm:text-sm">
                <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
                {eyebrow}
              </p>
            )}

            <h2 className="text-3xl font-semibold leading-[1.15] text-foreground [overflow-wrap:anywhere] sm:text-4xl xl:text-5xl">
              {title}
            </h2>
            <p className="mt-5 whitespace-pre-line text-base leading-7 text-foreground/80 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
              {description}
            </p>

            {Boolean(highlights?.length) && (
              <ul className="mt-8 grid gap-5 border-t border-foreground/15 pt-7">
                {highlights?.map((highlight, index) => {
                  const Icon = icons[highlight.icon] || Heart

                  return (
                    <li className="flex min-w-0 items-start gap-4" key={highlight.id || index}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                        <Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0 [overflow-wrap:anywhere]">
                        <h3 className="text-base font-semibold leading-6 text-foreground">
                          {highlight.title}
                        </h3>
                        {highlight.description && (
                          <p className="mt-1 text-sm leading-6 text-foreground/75">
                            {highlight.description}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <figure className="min-w-0">
            <div className="relative isolate p-5 sm:p-8">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 480 560"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-accent/45"
                fill="none"
              >
                <path d="M20 200V86a66 66 0 0 1 66-66h190" stroke="currentColor" />
                <path d="M460 350v124a66 66 0 0 1-66 66H204" stroke="currentColor" />
                <path
                  d="M8 154V80A72 72 0 0 1 80 8h126M472 406v74a72 72 0 0 1-72 72h-92"
                  stroke="currentColor"
                  strokeOpacity=".4"
                />
              </svg>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 -z-10 h-28 w-28 text-accent/40 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:10px_10px]"
              />

              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-xl sm:aspect-[4/3] lg:aspect-[4/5]">
                {image ? (
                  <Media
                    resource={image}
                    alt={image.alt || 'Comunitatea Interact București Triumph'}
                    fill
                    size="(min-width: 1536px) 520px, (min-width: 1024px) 40vw, (min-width: 640px) 75vw, 85vw"
                    imgClassName="h-full w-full object-cover"
                  />
                ) : (
                  <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--card),transparent_75%)]" />
                    <div className="absolute left-1/2 top-1/2 flex aspect-square w-4/5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/20">
                      <div className="flex aspect-square w-3/4 items-center justify-center rounded-full border border-dashed border-accent/30">
                        <div className="flex aspect-square w-2/3 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                          <Heart className="size-12 sm:size-16" strokeWidth={1.2} />
                        </div>
                      </div>
                      <span className="absolute left-[5%] top-[10%] flex size-14 items-center justify-center rounded-2xl border border-accent/30 bg-card text-accent shadow-lg sm:size-16">
                        <UsersRound className="size-7" strokeWidth={1.5} />
                      </span>
                      <span className="absolute bottom-[10%] right-[5%] flex size-12 items-center justify-center rounded-2xl border border-accent/30 bg-card text-accent shadow-lg sm:size-14">
                        <Sparkles className="size-6" strokeWidth={1.5} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 flex size-10 items-center justify-center rounded-full border border-accent/30 bg-background text-accent sm:size-12"
              >
                <Sparkles className="size-5" strokeWidth={1.4} />
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1 left-1 flex size-8 items-center justify-center rounded-full bg-accent text-background sm:size-10"
              >
                <Heart className="size-4" strokeWidth={1.6} />
              </span>
            </div>
            {caption && (
              <figcaption className="mt-3 px-5 text-center text-sm leading-6 text-foreground/75 [overflow-wrap:anywhere] sm:px-8">
                {caption}
              </figcaption>
            )}
          </figure>
        </div>
      </div>
    </section>
  )
}
