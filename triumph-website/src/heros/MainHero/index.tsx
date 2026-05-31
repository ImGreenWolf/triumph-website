'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { Link } from '@payloadcms/ui'
import { CMSLink } from '@/components/Link'
import Grainient from '@/components/ui/grainient'

export const MainHero: React.FC<Page['hero']> = ({ links, galery, richText }) => {
  const { setHeaderTheme, headerTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  

  return (
    <div
      className="relative items-center justify-center text-foreground h-200 not-md:overflow-hidden"
      
      data-theme="dark"
      
    >
      <div className='absolute inset-0'>
      
      <Grainient
        color1={headerTheme ===  'dark' ? '#e9e9e9' :"#1d2847"}
        color2={headerTheme === 'dark' ? '#e9e9e9' :"#36405c"}
        color3="#00a2e0"
        timeSpeed={0.25}
        colorBalance={0}
        warpStrength={1}
        warpFrequency={5}
        warpSpeed={2}
        warpAmplitude={50}
        blendAngle={180}
        blendSoftness={0.05}
        rotationAmount={500}
        noiseScale={2}
        grainAmount={0.05}
        grainScale={2}
        grainAnimated={false}
        contrast={1.3}
        gamma={0.8}
        saturation={1}
        centerX={0}
        centerY={0.75}
        zoom={0.8}
      />
      </div>
      
      <img src="/string_lights.png" className='absolute w-full right-0 left-0 top-[-500]' alt=""></img>
        
      <div
      className="relative grid md:grid-cols-2 items-center justify-center container h-200" 
      >
        <div className='max-w-150 w-full m-4 p-2 flex gap-6 flex-col'>
          <div className='flex items-end gap-6  z-1 '>
            <img src={'/logo.png'} className='h-35 -mx-5'/>
            <h1 className='text-xl md:text-4xl leading-8 md:leading-8 text-shadow-lg'>Interact Bucureşti <div className='text-5xl md:text-8xl font-bold text-accent'>Triumph</div></h1>
          </div>
          
          {richText && <RichText data={richText} enableProse={false}  className='p-0! z-1 text-foreground text-shadow-lg'></RichText> }

          {Array.isArray(links) && links.length > 0 && (
              <ul className="flex md:justify-left gap-4 z-1">
                {links.map(({ link }, i) => {
                  return (
                    <li key={i}>
                      <CMSLink {...link} />
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
        {/* <img src={'/logo.png'} className='absolute opacity-50 h-full -left-50'/> */}
        
          {galery && <div className='absolute w-250 right-0 top-[0px] not-lg:blur-xs not-lg:brightness-75'>
            
          
            
            {galery[0] && <div className='bg-foreground absolute top-20 right-[-50] p-2 py-2 pbe-12 flex -rotate-5'>
                <Media imgClassName=" object-cover  h-50 w-auto" priority resource={galery[0]} />
               
            </div>}

            <img src={'/detail.png'} className='absolute top-15 right-10 z-1 rotate-70 w-10'/>
            <img src={'/detail.png'} className='absolute top-70 right-70 z-1 rotate-70 w-10'/>
            <img src={'/detail.png'} className='absolute top-119 right-22 z-1 rotate-20 w-10'/>
            <img src={'/detail2.png'} className='absolute top-130 left-90 z-1  w-10'/>
            <img src={'/detail.png'} className='absolute top-18 right-150 z-1 rotate-20 w-10'/>

            {galery[1] && <div className='bg-foreground absolute top-70 right-70 p-2 py-2 pbe-12 flex rotate-3 shadow-2xl'>
                <Media imgClassName=" object-cover  h-40 w-auto" priority resource={galery[1]} />
               
            </div>}
            {galery[2] && <div className='bg-foreground absolute top-120 right-2 p-2 py-2 pbe-12 flex rotate-2 shadow-2xl'>
                <Media imgClassName=" object-cover  h-40 w-auto" priority resource={galery[2]} />
                
            </div>}
            {galery[3] && <div className=' bg-foreground absolute top-130 left-100 -translate-x-[50%] p-2 py-2 pbe-12 flex -rotate-5 shadow-2xl'>
                <Media imgClassName=" object-cover  h-40 w-auto" priority resource={galery[3]} />
                
            </div>}
            <img src="/Thread.svg" className='absolute'  alt="" ></img>
            {galery[4] && <div className='bg-foreground absolute top-20 right-140 p-2 py-2 pbe-12 flex rotate-2 shadow-2xl'>
                  <Media imgClassName=" object-cover h-40 w-auto" priority resource={galery[4]} />
                  
            </div>}
          </div>}
      </div>
      
    </div>
  )
}
