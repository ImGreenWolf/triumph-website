'use client'

import { trackTeamMemberCardFlip } from '@/lib/ga4/appEvents'
import { cn } from '@/utilities/ui'
import { Media as MediaElem } from '../../components/Media'
import { useId, useState } from 'react'
import { ArrowUpRight as Arrow } from 'lucide-react'
import Logo from '@/components/Logo'
import defaultProfilePicture from '../../../public/profile_picture.png'
import { motion, useReducedMotion, type Variants } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
    y: 0,
  },
} satisfies Variants

export default function Card(props: { member: any; displayText?:boolean; mandateYear?: number; small?: boolean; extraSmall?: boolean }) {
  const { member, mandateYear, small = false, extraSmall = false, displayText=true } = props
  const [flipped, setFlipped] = useState(false)
  const descriptionID = useId()
  const reducedMotion = useReducedMotion()

  const toggleFlipped = () => {
    const nextFlipped = !flipped

    if (nextFlipped) {
      trackTeamMemberCardFlip({
        mandateYear,
        memberId: member.id,
        memberName: member.name,
        memberRole: member.role,
      })
    }

    setFlipped(nextFlipped)
  }

  return (
    <motion.div
      variants={cardVariants}
      className={cn('relative w-full', 'perspective-[2000px]')}
      onMouseLeave={() => setFlipped(false)}
    >
      <button
        type="button"
        aria-label={member.name}
        aria-expanded={flipped}
        aria-controls={descriptionID}
        className={cn(
          'relative block w-full cursor-pointer text-left transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]',
          '[transform-style:preserve-3d]',
          flipped ? 'rotate-y-180' : '',
          reducedMotion && 'duration-0'
        )}
        onClick={toggleFlipped}
      >
        {/* FRONT */}
        <div
          aria-hidden={flipped}
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
              'duration-300 ease-in-circ',
              'select-none'
            )}
            resource={member.picture && typeof member.picture === 'object' && member.picture.url ? member.picture : undefined}
            alt={member.name}
            src={!(member.picture && typeof member.picture === 'object' && member.picture.url) ? defaultProfilePicture : undefined}
          />
          {displayText && 
          <div className='absolute flex items-end inset-x-0 bottom-0 -mb-1 p-4 bg-gradient-to-t from-black/90 via-black/65 to-transparent'>
          <div>
            
            <p
              className={cn(
                'text-white/90 font-medium text-shadow-xl not-md:mb-1',
                extraSmall
                  ? 'text-[10px] md:text-xs md:leading-3'
                  : small
                    ? 'text-xs md:text-sm leading-4 md:leading-5'
                    : 'text-md md:text-lg leading-4 md:leading-6'
              )}
            >
              {member.role}
            </p>

            <p
              className={cn(
                'font-semibold text-white text-shadow-lg',
                extraSmall
                  ? 'text-base leading-6 md:text-xl'
                  : small
                    ? 'text-base md:text-2xl leading-5 md:leading-7'
                    : 'text-lg md:text-3xl leading-6 md:leading-7'
              )}
            >
              {member.name}
            </p>

          </div>
            <Arrow size={extraSmall ? 16 : small ? 20 : 35} className='opacity-70 transition-opacity group-hover:opacity-100 ml-auto' />
            
          </div>
          }
          
        </div>

        {/* BACK */}
        <div
          id={descriptionID}
          aria-hidden={!flipped}
          inert={!flipped}
          className={cn(
            'absolute inset-0 rounded-2xl border border-foreground/20',
            'bg-background',
            'p-3 flex gap-3 overflow-y-auto sm:p-4',
            'rotate-y-180',
            '[backface-visibility:hidden]',
            '[-webkit-backface-visibility:hidden]',
            'translate-z-1'
          )}
        >
          <p
            className={cn(
              'font-bold uppercase text-accent border-r border-dotted border-accent pr-2 shrink-0',
              extraSmall ? 'text-base' : small ? 'text-lg' : 'text-2xl md:text-4xl'
            )}
            style={{ writingMode: 'vertical-rl' }}
          >
            {member.role}
          </p>

          <div className='relative min-w-0 flex flex-col'>
            
            <Logo size={2} className='w-16 sm:w-20 mx-auto mb-4' />

            <p
              className={cn(
                'whitespace-pre-line leading-relaxed',
                extraSmall ? 'text-[10px] leading-3' : small ? 'text-xs' : 'text-xs md:text-sm '
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
      </button>
    </motion.div>
  )
}
