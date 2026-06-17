import React from 'react'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import CountUp from '@/components/ui/counterUp'
import { SectionIntroBlock as SectionIntroBlockProps, StatsBlock as StatsBlockTypes } from '@/payload-types'
import { outlineFont } from '@/app/(frontend)/layout'
import { GallerySlideshow } from '@/components/Gallery/component'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { ArrowUpRightIcon } from 'lucide-react'

const hasMediaObject = (media: unknown) => typeof media === 'object' && media !== null

export const SectionIntroBlock: React.FC<SectionIntroBlockProps> = ({ alignment, eyebrow, richText, sectionId }) => {
  return (
    <section className="container -my-8" id={sectionId ? sectionId : undefined}>
      <div
        className={cn('max-w-3xl', {
          'mx-auto text-center': alignment === 'center',
        })}
      >
        {eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </p>
        )}
        {richText && <RichText data={richText} enableGutter={false}  className='text-foreground'/>}
      </div>
    </section>
  )
}

export const SectionTitleBlock: React.FC<any> = ({ alignment, eyebrow, title, sectionId }) => {
  return (
    <section className="container" id={sectionId ? sectionId : undefined}>
      <div
        className={cn('max-w-3xl', {
          'mx-auto text-center': alignment === 'center',
        })}
      >
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div className='text-4xl whitespace-break-spaces'>
           <h2 className={cn(outlineFont.className, '-mb-16 text-6xl')}>
            {title}
          </h2>
          {/* <h2 className='absolute text-4xl'>
          {title}
        </h2> */}
        </div>
        
      </div>
    </section>
  )
}

export const FeatureGridBlock: React.FC<any> = ({ features, introContent }) => {
  return (
    <section className="container">
      {introContent && (
        <RichText className="mx-auto mb-10 max-w-3xl text-center" data={introContent} />
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {(features || []).map((feature: any, index: number) => (
          <article className="rounded border border-border bg-card p-6" key={index}>
            {feature.label && (
              <p className="mb-4 text-sm font-semibold text-muted-foreground">{feature.label}</p>
            )}
            <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
            {feature.description && (
              <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export const StatsBlock: React.FC<any> = async ({ introContent, stats, gallery }: StatsBlockTypes) => {
  const payload = await getPayload({ config: payloadConfig })
  const req = await payload.find({
    collection: 'events',
    limit: 4,
    sort: '-createdAt',
  })
  const events = req.docs
  const statsItems = stats || []
  const hasGallery = Boolean(gallery?.some(hasMediaObject))
  const hasEventList = events.length > 0

  return (
    <section className="container">
      {introContent && (
        <RichText className="mx-auto mb-10 max-w-3xl text-center" data={introContent} />
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        {statsItems.map((stat, index) => (
          <article
            className="min-w-0 rounded-lg border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
            key={stat.id || index}
          >
            <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1 text-accent">
              <CountUp
                to={stat.value}
                from={0}
                separator=","
                className="text-4xl font-bold leading-none tracking-normal tabular-nums sm:text-5xl"
              />
              {stat.unit && (
                <span className="pb-1 text-xl font-semibold leading-none text-card-foreground/85 sm:text-2xl">
                  {stat.unit}
                </span>
              )}
            </div>

            <div className="mt-4 text-base font-semibold leading-snug [overflow-wrap:anywhere]">
              {stat.label}
            </div>
            {stat.description && (
              <p className="mt-3 text-sm leading-6 text-card-foreground/70 [overflow-wrap:anywhere]">
                {stat.description}
              </p>
            )}
          </article>
        ))}

        {hasGallery && (
          <div
            className={cn(
              'min-w-0 overflow-hidden rounded-xl sm:col-span-2',
              hasEventList ? 'lg:col-span-3' : 'lg:col-span-4',
            )}
          >
            <GallerySlideshow gallery={gallery || []} />
          </div>
        )}

        {hasEventList && (
          <aside
            className={cn(
              'min-w-0 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm',
              hasGallery ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2 lg:col-span-2',
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold leading-tight">Evenimentele Noastre</h3>
              <a
                className="hidden min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90 sm:inline-flex"
                href="/events"
              >
                Toate
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-3 grid gap-2.5">
              {events.map(event => {
                const eventImage = event.meta?.image
                const eventHref = event.slug ? `/events/${event.slug}` : '/events'

                return (
                  <article
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-md border border-border/60 bg-primary/5 p-2"
                    key={event.id || event.slug}
                  >
                    {hasMediaObject(eventImage) ? (
                      <Media
                        resource={eventImage}
                        className="aspect-[9/16] h-18 overflow-hidden rounded-md bg-primary/10 sm:h-20"
                        imgClassName="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="aspect-[9/16] h-18 rounded-md bg-primary/10 sm:h-20"
                        aria-hidden="true"
                      />
                    )}

                    <div className="min-w-0 self-center">
                      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
                        {event.name}
                      </h4>
                      <a
                        href={eventHref}
                        className="mt-1.5 inline-flex min-h-7 items-center gap-1.5 text-xs font-semibold text-accent transition hover:text-primary"
                      >
                        Mai multe
                        <ArrowUpRightIcon className="size-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>

            <a
              className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent/90 sm:hidden"
              href="/events"
            >
              Toate Evenimentele
              <ArrowUpRightIcon className="size-4" aria-hidden="true" />
            </a>
          </aside>
        )}
      </div>
    </section>
  )
}



export const SplitMediaBlock: React.FC<any> = ({ links, media, mediaPosition, richText }) => {
  return (
    <section className="mx-8">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div
          className={cn('order-1', {
            'lg:order-1': mediaPosition === 'left',
            'lg:order-2': mediaPosition !== 'left',
          })}
        >
          {hasMediaObject(media) && (
            <Media
              className="aspect-[4/3] overflow-hidden rounded object-cover "
              imgClassName="h-full w-full object-scale-down"
              resource={media as any}
            />
          )}
        </div>
        <div
          className={cn('order-1 mx-12', {
            'lg:order-2': mediaPosition === 'left',
            'lg:order-1': mediaPosition !== 'left',
          })}
        >
          {richText && <RichText data={richText} enableProse={false} enableGutter={false} />}
          {Boolean(links?.length) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {links.map(({ link }: any, index: number) => (
                <CMSLink className='text-card-foreground' key={index} {...link} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export const ProcessBlock: React.FC<any> = ({ introContent, steps }) => {
  return (
    <section className="container">
      {introContent && <RichText className="mb-10 max-w-3xl" data={introContent} />}
      <div className="grid gap-4 md:grid-cols-3">
        {(steps || []).map((step: any, index: number) => (
          <article className="border-l border-border pl-5" key={index}>
            <div className="mb-4 text-sm font-semibold text-muted-foreground">
              {String(index + 1).padStart(2, '0')}
            </div>
            <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
            {step.description && (
              <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export const TestimonialBlock: React.FC<any> = ({ introContent, testimonials }) => {
  return (
    <section className="container">
      {introContent && (
        <RichText className="mx-auto mb-10 max-w-3xl text-center" data={introContent} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(testimonials || []).map((testimonial: any, index: number) => (
          <figure className="rounded border border-border bg-card p-6" key={index}>
            <blockquote className="text-lg leading-8">&ldquo;{testimonial.quote}&rdquo;</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {hasMediaObject(testimonial.avatar) && (
                <Media
                  className="size-12 overflow-hidden rounded-full"
                  imgClassName="h-full w-full object-cover"
                  resource={testimonial.avatar as any}
                />
              )}
              <div>
                <div className="font-medium">{testimonial.authorName}</div>
                {testimonial.authorRole && (
                  <div className="text-sm text-muted-foreground">{testimonial.authorRole}</div>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export const LogoCloudBlock: React.FC<any> = ({ introContent, logos }) => {
  return (
    <section className="container">
      {introContent && (
        <RichText className="mx-auto mb-10 max-w-3xl text-center" data={introContent} />
      )}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border md:grid-cols-4">
        {(logos || []).map((logo: any, index: number) => {
          const content = (
            <div className="flex h-28 items-center justify-center bg-background p-6">
              {hasMediaObject(logo.logo) ? (
                <Media
                  className="max-h-12 max-w-36"
                  imgClassName="max-h-12 w-auto object-contain"
                  resource={logo.logo as any}
                />
              ) : (
                <span className="text-sm font-medium">{logo.name}</span>
              )}
            </div>
          )

          if (logo.url) {
            return (
              <a href={logo.url} key={index} rel="noreferrer" target="_blank">
                {content}
              </a>
            )
          }

          return <div key={index}>{content}</div>
        })}
      </div>
    </section>
  )
}
