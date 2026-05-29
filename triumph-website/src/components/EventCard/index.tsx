'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Event, Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { Button } from '@payloadcms/ui'
import { CMSLink } from '../Link'
import { Calendar1Icon, CalendarIcon } from 'lucide-react'


export type CardPostData = Pick<Event, 'slug' | 'meta' | 'name' | 'days'>

export const EventCard: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  showCategories?: boolean
  title?: string
  showDescription: boolean
   small: boolean
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, title: titleFromProps, showDescription = true, small} = props

  const { slug, meta, name,  days} = doc || {}
  const { description, image: metaImage } = meta || {}

  const titleToUse = titleFromProps || name
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/events/${slug}`

  return (
    <article
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer flex flex-col text-sm',
        className,
      )}
      ref={card.ref}
    >
      <div className="relative w-full">
        {!metaImage && <div className="">No image</div>}
        {metaImage && typeof metaImage !== 'string' && <Media resource={metaImage} size={"33vw"}  imgClassName='h-full  object-cover' className='aspect-3/4 h-full'/>}
      </div>
      <div className="p-4 flex flex-col h-full">
        {days && <p className='text-accent flex gap-2 items-center'><CalendarIcon className='size-[1em]'/>{new Date(days[0].eventDate!).toDateString()}</p>}
        {titleToUse && (
          <div className="prose mt-2">
            <h3>
              <Link className="not-prose" href={href} ref={link.ref}>
                {titleToUse}
              </Link>
            </h3>
            
          </div>
        )}
        
        {description && showDescription && <div className="">{description && <p>{sanitizedDescription}</p>}</div>}
        {!small && <div className='h-full'/>}
        {!small && <CMSLink url={`/events/${slug}`} appearance={small ? 'ghost' : 'default'} className={cn('mbs-4', small)}>Detalii Eveniment</CMSLink>}
      </div>
    </article>
  )
}
