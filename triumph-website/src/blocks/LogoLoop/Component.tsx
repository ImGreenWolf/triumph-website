import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { LogoLoopBlock as LogoLoopBlockProps, Media } from '@/payload-types'
import configPromise from '@payload-config'
import LogoLoop from '@/components/ui/logoLoop'
import { getPayload } from 'payload'

type Props = LogoLoopBlockProps & {
  breakout?: boolean
  captionClassName?: string
  className?: string
  enableGutter?: boolean
  imgClassName?: string
  staticImage?: StaticImageData
  disableInnerContainer?: boolean
}

export const LogoLoopBlock: React.FC<Props> = async (props) => {
  const {
    captionClassName,
    className,
    enableGutter = true,
    imgClassName,
    media,
    staticImage,
    disableInnerContainer,
    type,
  } = props

   const payload = await getPayload({ config: configPromise })

  let logos: typeof media = media;
  let fetchedPosts
  switch (type) {
    case 'manual':
        logos = media

    break;
    case 'causes':
   
    
    
       const fetchedCauses = await payload.find({
        collection: 'causes',

      })
    
        logos = fetchedCauses.docs.map(cause => (cause.logo!)).filter(e => Boolean);
    break;
    case 'sponsors':
        const fetchedSponsors = await payload.find({
        collection: 'sponsors',
      })
    
        logos = fetchedSponsors.docs.map(sponsor => (sponsor.logo!)).filter(e => Boolean)


    break;
  }
  if(!logos)
    return(<div></div>)
  
  return (
    <LogoLoop logos={logos.filter((e) => e).map(logo => typeof logo == 'object' ? {src: logo.url!} : {src: logo})} fadeOut={true} logoHeight={75}  fadeOutColor='1d2847'/>
  )
}
