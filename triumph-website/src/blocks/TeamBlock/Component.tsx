import React from 'react'

import type { TeamBlock as TeamBlockProps } from '@/payload-types'

import Card from './MemberCard'

export const TeamBlock: React.FC<TeamBlockProps> = (props) => {
  const { mandates } = props

  return (
    <div className="relative overflow-hidden bg-position-[50%50%] bg-size-[4200] text-white">
      <div className="flex flex-col gap-20 md:gap-28">
        {mandates?.map((mandate, i) => {
          const isFourCols =
            mandate.members && mandate.members.length % 4 === 0 || false

          return (
            <div key={i} className="relative overflow-hidden">
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
                <div
                  className={`
                    mx-auto grid justify-items-center gap-4
                    perspective-midrange

                    grid-cols-1

                   
                  `}
                  style={{gridTemplateColumns: `repeat(${mandate.columns}, 1fr)`}}
                >
                  {mandate.members?.map((member, memberIndex) => {
                    return (
                      member.name ? <Card
                        key={member.id || memberIndex}
                        member={member}
                        small={isFourCols}
                      /> : <div key={member.id || memberIndex}></div>
                    )
                  })}
                </div>

                {/* Footer */}
                <h2 className="m-6 text-center prose-xl">
                  <span className="text-3xl sm:text-4xl">+133</span>{' '}
                  membri activi
                </h2>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
