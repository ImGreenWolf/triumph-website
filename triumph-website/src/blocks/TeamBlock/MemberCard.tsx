'use client'

import { cn } from '@/utilities/ui'
import { Media as MediaElem } from '../../components/Media'
import { useRef, useState } from 'react'
import { ArrowUpRight as Arrow } from 'lucide-react'
import Logo from '@/components/Logo'

export default function Card(props: { member: any; small?: boolean }) {
  const { member, small = false } = props
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={cn(
        'relative w-full ',
        'perspective-[2000px]'
      )}
      onMouseLeave={() => setFlipped(false)}
    >
      <div
        className={cn(
          'relative duration-500 ease-in-out',
          '[transform-style:preserve-3d]',
          flipped ? 'rotate-y-180' : ''
        )}
        onClick={() => setFlipped((v) => !v)}
      >
        {/* FRONT */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-border bg-card',
            '[backface-visibility:hidden]',
            '[-webkit-backface-visibility:hidden]',
            'group'
          )}
        >
          <MediaElem
            imgClassName={cn(
              'w-full aspect-[3/4] object-cover rounded-2xl',
              'group-hover:scale-105 duration-300 ease-in-circ',
              'select-none'
            )}
            resource={member.picture || '/profile_picture.png'}
          />

          <div className='absolute flex items-end inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent'>
          <div>
            
            <p
              className={cn(
                'text-primary/60 font-thin text-shadow-xl',
                small ? 'text-sm leading-4' : 'text-lg leading-6'
              )}
            >
              {member.role}
            </p>

            <p
              className={cn(
                'font-bold text-primary text-shadow-lg',
                small
                  ? 'text-2xl leading-7'
                  : 'text-3xl sm:text-4xl leading-tighter'
              )}
            >
              {member.name}
            </p>

          </div>
            <Arrow size={small ? 20 : 35} className='opacity-70 transition-opacity group-hover:opacity-100 ml-auto' />
            
          </div>

          
        </div>

        {/* BACK */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl border-2 border-border',
            'bg-gradient-to-r from-background to-card',
            'p-4 flex gap-4 overflow-hidden',
            'rotate-y-180',
            '[backface-visibility:hidden]',
            '[-webkit-backface-visibility:hidden]',
            'translate-z-1'
          )}
        >
          <p
            className={cn(
              'font-bold uppercase text-accent border-r-2 border-dotted border-accent pr-2 shrink-0',
              small ? 'text-lg' : 'text-2xl md:text-4xl'
            )}
            style={{ writingMode: 'vertical-rl' }}
          >
            {member.role}
          </p>

          <div className='relative flex flex-col max-h-full'>
            
            <Logo size={2} className='w-16 sm:w-20 mx-auto mb-4' />

            <p
              className={cn(
                'indent-2',
                small ? 'text-xs' : 'text-xs md:text-sm '
              )}
            >
              {member.description}
            </p>

            {member.secondPicture && (
              <MediaElem
                imgClassName={cn(
                  'object-scale-down object-top rounded-xl opacity-80 h-full w-auto ml-auto mask-radial-furthest-side mask-radial-from-50%',
                
                )}
                className='min-h-0 grow -m-4 -mt-8 '
                resource={member.secondPicture}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}