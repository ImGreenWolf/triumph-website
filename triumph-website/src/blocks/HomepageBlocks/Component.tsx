import React from 'react'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import Counter from '@/components/ui/counter'
import CountUp from '@/components/ui/counterUp'
import { Media as MediaType, SectionIntroBlock as  SectionIntroBlockProps, StatsBlock as StatsBlockTypes} from '@/payload-types'
import { outlineFont } from '@/app/(frontend)/layout'
import { GallerySlideshow } from '@/components/Gallery/component'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { ArrowUpLeftFromSquareIcon, ArrowUpRightIcon } from 'lucide-react'

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

export  const StatsBlock: React.FC<any> = async ({ introContent, stats, gallery }: StatsBlockTypes) => {
  const payload = await getPayload({config: payloadConfig});
  const req = await payload.find({
    collection: 'events',
    limit: 5,
    sort: '-createdAt',
  })
  const events = req.docs

  return (
    <section className="container">
      {introContent && (
        <RichText className="mx-auto mb-10 max-w-3xl text-center" data={introContent} />
      )}
      <div className="grid gap-px overflow-hidden rounded border border-border grid-cols-1 md:grid-cols-4 text-card-foreground auto-cols-min">
        {(stats || []).map((stat: any, index: number) => (
          <div className="bg-card m-2 p-6 rounded-md " key={index}>
            {/* <div className="text-3xl font-semibold">{stat.value}</div> */}
            <div className='flex gap-2 text-5xl font-semibold text-primary'>
              <CountUp
              to={stat.value}
              from={0}
              className=''
            />
            <div className="">{stat.unit}</div>
            </div>
            
            <div className="mt-2 font-medium">{stat.label}</div>
            {stat.description && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{stat.description}</p>
            )}
          </div>
        ))}

        <div className='lg:col-start-1 lg:-col-end-2 not-lg:col-[1/3] p-8'>
          {gallery && <GallerySlideshow gallery={gallery}/>}
        </div>

        <div className='not-lg:row-[1_/_span_4] not-lg:row-start-1 col-2 lg:-col-2 m-2 bg-card overflow-hidden p-4 rounded-xl '>
          <h3 className='text-center px-8'>Evenimentele Noastre</h3>
            <div className='grid grid-rows-5 gap-4 p-4'>

          
            {events.map(event => {
              return ( <div key={event.id || event.slug} className='grid grid-cols-[auto_1fr] grid-rows-2 auto-cols-max'>
                <Media resource={event.meta?.image} className='h-18 row-span-full col-1 aspect-4/5 overflow-hidden mr-2' imgClassName=' overflow-hidden h-18  w-auto object-cover'/>
                <span className='text-xl font-bold leading-5'>{event.name}</span>
                <a href={'/events/'+event.slug} className='flex gap-2 text-xs'>Mai multe <ArrowUpRightIcon size={16}/></a>
              </div>)
            })}
           </div>
           <a className='px-8 py-4 rounded-xl bg-primary text-card font-bold flex items-center gap-4' href='/events'>Toate Evenimentele <ArrowUpRightIcon/></a>
        </div>
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
