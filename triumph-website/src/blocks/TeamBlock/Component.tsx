'use client'
import React from 'react'

import type { TeamBlock as TeamBlockProps } from '@/payload-types'

import Card from './MemberCard'
import { motion, type Variants } from 'framer-motion'


export const TeamBlock: React.FC<TeamBlockProps> = (props) => {
  const { mandates } = props


  const mainVariants = {
    exit: {
      opacity: 0,
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
      y: -8,
    },
    hidden: { opacity: 0, y: 12,filter: 'blur(12px)', },
    visible: {
      opacity: 1,
      filter: 'blur(0)',
      transition: {
        delayChildren: 0.04,
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1] as const,
        staggerChildren: 0.075,
      },
      y: 0,
    },
  } satisfies Variants


  
  return (
    <div className="relative overflow-hidden bg-position-[50%50%] bg-size-[4200] text-white">
      <div className="flex flex-col gap-20 md:gap-28">
        {mandates?.map((mandate, i) => {
          const isFourCols =
            mandate.members && mandate.members.length % 4 === 0 || false
          const isFiveCols = mandate.columns === 5

          return (
            <div key={i} className="relative">
              {/* Background Year */}
              <div
                className="
                  pointer-events-none absolute bottom-0 right-0
                  text-right font-bold leading-none text-card
                  text-[72px]
                  sm:text-[120px]
                  md:text-[180px]
                  lg:text-[256px]
                "
              >
                {mandate.year?.toString().substring(2)}
                <br />
                {((mandate.year || 26) + 1).toString().substring(2)}
              </div>

              <div className="container mx-auto relative z-10 px-4">
                {/* Heading */}
                <h2 className="mb-10 text-center">
                  <div className="text-base font-bold sm:text-xl">
                    {i === 0 ? 'Meet the board' : 'Mandatul'}
                  </div>

                  <div className="text-3xl font-bold text-accent sm:text-4xl md:text-6xl">
                    “{mandate.year} - {(mandate.year || 2026) + 1}”
                  </div>
                </h2>

                {/* Members Grid */}
                <motion.main
                  className={`
                    mx-auto grid justify-items-center gap-4
                    perspective-midrange
                    not-sm:grid-cols-2!
                  `}
                  style={{gridTemplateColumns: `repeat(${mandate.columns}, 1fr)`}}
                  variants={mainVariants}
                  initial="hidden"
                  viewport={{ once: true, amount: 0.2 }}
                  whileInView="visible"
                >
                  {mandate.members?.map((member, memberIndex) => {
                    return (
                      member.name ? <Card
                        key={member.id || memberIndex}
                        member={member}
                        small={isFourCols}
                        extraSmall={isFiveCols}
                      /> : <div key={member.id || memberIndex}></div>
                    )
                  })}
                </motion.main>

                {/* Footer */}
                {/* <h2 className="m-6 text-center prose-xl">
                  <span className="text-3xl sm:text-4xl">+133</span>{' '}
                  membri activi
                </h2> */}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
