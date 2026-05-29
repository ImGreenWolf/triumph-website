import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { EventHero } from '@/heros/EventHero'


import { Media } from '@/components/Media'
import Masonry from '@/blocks/Masonry/MasonyComponent'
import type { LocationValue } from '@/fields/location-selector'
import { CalendarIcon, HandHelpingIcon, HeartIcon, MapPin, PinIcon, Star, StarHalfIcon, StarIcon, Stars, TimerIcon } from 'lucide-react'

import SignupForm from './SignupForm'
import { getEventSlotAvailability } from '@/utilities/eventRegistration'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const events = await payload.find({
    collection: 'events',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = events.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Event({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/events/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })
  
  if (!post) return <PayloadRedirects url={url} />
  const payload = await getPayload({ config: configPromise })
  const registrations = await payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    select: {
      day: true,
      slot: true,
      status: true,
    },
    where: {
      event: {
        equals: post.id,
      },
    },
  })
  const slotAvailability = getEventSlotAvailability({
    event: post,
    registrations: registrations.docs,
  })
  const location = post.location ? post.location as any as LocationValue : undefined
  return (
    <article className="pt-16 pb-16" style={post.useColors ? {backgroundColor: post.primaryColor!, color: getTextColor(post.primaryColor!)} : {}}>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <EventHero event={post} />
      <div className='flex container justify-center m-4' >
        <div className=" gap-4 pt-8 w-full max-w-[48rem]">
          <div className="container">
            <h2>Despre Eveniment</h2>
            <RichText enableProse={false} className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
            {post.inspoboard && <h2 className='mt-8 mb-2'>Inspoboard</h2>}
            {post.inspoboard && <Masonry columnProps={[4, 4, 3, 2]} items={post.inspoboard.map(i => (typeof i == 'object' ? {img: i.url!, url: i.url!, id: i.id!, height: i.height!, width: i.width!} : null)).filter(e=>e!=null)}/>}
          </div>
        </div>
        <div className='flex flex-col gap-2' style={post.useColors ? {color: getTextColor(post.secondaryColor!)} : {}}>
          <div className='w-50'>
            {post.cause && typeof post.cause == 'object' && <div className='rounded-md bg-card p-4 not-prose' style={post.useColors ? {backgroundColor: post.secondaryColor!, color: getTextColor(post.secondaryColor!)} : {}}>
                <p className='flex text-sm items-center gap-1 opacity-50'><HeartIcon className='h-4 w-4'/>Cauza</p>
              <div className='flex items-center gap-2'>
                {post.cause.logo && <Media resource={post.cause.logo} imgClassName='rounded-full' className='max-w-10'/>}
                <p className='font-bold text-md leading-4'>{post.cause.name}</p>
              </div>
            </div>}
          </div>

          <div className='w-50'>
            <div className='rounded-md bg-card p-4' style={post.useColors ? {backgroundColor: post.secondaryColor!, color: getTextColor(post.secondaryColor!)} : {}}>
              <p className='flex text-sm items-center gap-1 opacity-50'><HandHelpingIcon className='h-4 w-4'/>Donație Minimǎ</p>
              <p className='font-bold text-lg leading-4 mt-1'>{post.donation} lei</p>

            </div>
          </div>

          {location && (
            <div className='w-50 relative group'>
              <div
                className='rounded-md bg-card p-4 '
                style={
                  post.useColors
                    ? { backgroundColor: post.secondaryColor!, color: getTextColor(post.secondaryColor!) }
                    : {}
                }
              >
                <p className='flex text-sm items-center gap-1 opacity-50'><MapPin className='h-4 w-4'/>Locatie</p>
                <p className='font-bold text-md leading-4 mt-1'>{location.name}</p>
                
                
                <div className='absolute top-[100%] -right-100 left-0 bg-card p-4 rounded-md flex flex-col gap-4 shadow-lg hidden duration-250'
                  style={
                    post.useColors
                      ? { backgroundColor: post.secondaryColor!, color: getTextColor(post.secondaryColor!) }
                      : {}
                  }
              
                >
                  <div>
                    {typeof location.rating === 'number' && <StarRating rating={location.rating}/>}
                    <i>{location.formattedAddress}</i>
                  </div>

                  {location.description && <p>{location.description}</p>}
                  {!!location.photos?.length && (
                    <div>
                      <Masonry
                      columnProps={[3,2,1,1]}
                        items={location.photos.map((photo, i) => ({
                          height: photo.heightPx,
                          width: photo.widthPx,
                          id: i.toFixed(),
                          img: photo.photoURL,
                          url: photo.photoURL,
                        }))}
                      />
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          )}
           <div className='w-50'>
            <div className='rounded-md bg-card p-4' style={post.useColors ? {backgroundColor: post.secondaryColor!, color: getTextColor(post.secondaryColor!)} : {}}>
              <p className='flex text-sm items-center gap-1 opacity-50'><CalendarIcon className='h-4 w-4'/>Data</p>
              <div className='font-bold text-md leading-4 mt-1'>
                {post.days?.map((day, i) => <div key={i}>{new Date(day.eventDate!).toLocaleDateString('ro-RO', {dateStyle: 'long'})}: {day.slots?.length} ture</div>)}
                </div>

            </div>
          </div>
         <SignupForm event={post} slotAvailability={slotAvailability} />
        </div>
      </div>
      
    </article>
  )
}


function StarRating(props: {rating: number}) {
  const {rating} = props
  const stars = []
  for(let i=1;i<=5;i++) {

    if(i<Math.ceil(rating)) {
      
      if(i>=Math.trunc(rating) && i<=Math.ceil(rating)) {
        stars.push(<StarHalfIcon fill='var(--accent)' strokeWidth={0}/>)
      } else
        stars.push(<StarIcon fill='var(--accent)' strokeWidth={0}/>)
    } 
    // else {
    //   stars.push(<Star fill='#111'/>)
    // }

  }
  return (<div className='flex'>{...stars}</div>)
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'events',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})



function getTextColor(hexString: string) {
  if(!hexString) 
    return undefined;
  const hex = hexString[0] == '#' ? hexString.substring(1) : hexString;

  const avg = (parseInt(hex.substring(0,2), 16) + parseInt(hex.substring(2,4), 16) + parseInt(hex.substring(5,6), 16))/3
  return avg > 255/2 ? '#000000' : '#ffffffff'
}
