import React from 'react'
import { Media } from '@/components/Media'
import { AboutUsBlock as AboutUsProps } from '@/payload-types'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'
import MarkOfExcellence from '@/components/ui/MarkOfExcellence'

export const AboutUsBlock: React.FC<AboutUsProps> = ({
  title,
  interactContent,
  rotaryContent,
  relationshipContent,
  image,
  accentColor = 'blue',
}) => {
  const accentStyles = {
    blue: {
      bg: 'from-[#0194ce] to-[#017bb0]',
      text: 'text-[#0194ce]',
      light: 'bg-[#0194ce]/15',
      border: 'border-[#0194ce]/30',
    },
    royal: {
      bg: 'from-[#003366] to-[#002244]',
      text: 'text-[#003366]',
      light: 'bg-[#003366]/15',
      border: 'border-[#003366]/30',
    },
    gold: {
      bg: 'from-[#f7a81b] to-[#e09600]',
      text: 'text-[#f7a81b]',
      light: 'bg-[#f7a81b]/15',
      border: 'border-[#f7a81b]/30',
    },
  }

  const currentAccent = accentStyles[accentColor!]

  return (
    <section className="relative py-4 md:py-8 lg:py-16 px-4 sm:px-6 lg:px-12 bg-foreground overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-slate-100 to-transparent rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-slate-100 to-transparent rounded-full blur-3xl -z-10" />
      
      <div className="max-w-400 mx-auto">
        {/* Desktop Layout */}
        <div className="hidden lg:block relative">
          {/* Image positioned on the right */}
          <div className="absolute right-0 bottom-0 top-0 w-5/12 py-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-full">
              <div className="aspect-[4/5] w-full">
                {typeof image !== 'string' && image && (
                  <Media 
                    resource={image} 
                    fill 
                    imgClassName="object-cover w-full h-full" 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Text box - overlaps from the left */}
          <div className="relative w-8/12 z-10 ">
            <div className={cn(
              "rounded-2xl lg:rounded-3xl",
              "bg-primary/50 backdrop-blur-xl",
              "border shadow-2xl",
              currentAccent.border
            )}>
              <div className="absolute inset-0 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              
              <div className="relative p-6 md:p-8 lg:p-10 space-y-6 md:space-y-8">
                {/* Title */}
                <div className="space-y-3 md:space-y-4">
                  <div className={`inline-flex items-center gap-1 ${currentAccent.light} px-3 py-1 rounded-full backdrop-blur-sm`}>
                    {/* <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentAccent.bg}`} /> */}
                   
                    <MarkOfExcellence className='w-3 h-3' currentAccent={accentColor!}/>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${currentAccent.text}`}>
                    
                      About Us
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-secondary text-shadow-lg leading-tight">
                    {title}
                  </h2>
                </div>
                 <MarkOfExcellence className='absolute m-2 bottom-0 left-0 right-0 h-1/2 -z-1 opacity-50 backdrop-blur-xl' currentAccent={'blue'} animate/>
                {/* Two Column Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="group/card">
                    <div className="relative h-full p-6 bg-white  backdrop-blur-lg rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/95">
                      <div className="mb-4">
                        <div className="h-12 mb-3">
                          <img 
                            src="/interact.png" 
                            alt="Interact" 
                            className=" h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <RichText 
                        enableProse={false} 
                        enableGutter={false} 
                        data={interactContent} 
                        className="text-slate-600 text-sm md:text-base leading-relaxed" 
                      />
                     
                    </div>
                  </div>

                  <div className="group/card">
                    <div className="relative h-full p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/95">
                      <div className="mb-4">
                        <div className="h-12 mb-3">
                          <img 
                            src="/rotary.png" 
                            alt="Rotary" 
                            className="h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <RichText 
                        enableProse={false} 
                        enableGutter={false} 
                        data={rotaryContent} 
                        className="text-slate-600 text-sm md:text-base leading-relaxed" 
                      />
                     
                    </div>
                  </div>
                </div>

                {/* Partnership Card */}
                <div className={cn(
                  "relative p-6 md:p-8 rounded-2xl overflow-hidden",
                  "backdrop-blur-md shadow-xl",
                  `bg-gradient-to-br ${currentAccent.bg}`,
                  "border border-white/30"
                )}>
                  <div className="absolute inset-0 bg-white/15 backdrop-blur-[2px]" />
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 1px)`,
                      backgroundSize: '24px 24px'
                    }} />
                  </div>
                  
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-0.5 bg-white/60 rounded-full" />
                      <h4 className="text-base md:text-lg font-bold uppercase tracking-wider text-white">
                        The Partnership
                      </h4>
                      <div className="w-8 h-0.5 bg-white/60 rounded-full" />
                    </div>
                    <RichText 
                      enableProse={false} 
                      enableGutter={false} 
                      data={relationshipContent} 
                      className="text-white/95 text-sm md:text-base leading-relaxed [&_a]:text-white [&_a]:underline [&_a:hover]:no-underline" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block lg:hidden relative">
          {/* Image at the top */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <div className="aspect-[4/3] w-full">
              {typeof image !== 'string' && image && (
                <Media 
                  resource={image} 
                  fill 
                  imgClassName="object-cover w-full h-full" 
                />
              )}
            </div>
          </div>

          {/* Text box - overlaps from the bottom */}
          <div className="relative -mt-32 sm:-mt-48 z-10 px-4">
            <div className={cn(
              "rounded-2xl",
              "bg-foreground/70 backdrop-blur-xl",
              "border shadow-2xl",
              currentAccent.border
            )}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              
              <div className="relative p-5 sm:p-6 space-y-5 sm:space-y-6">
                {/* Title */}
                <div className="space-y-2 sm:space-y-3">
                  <div className={`inline-flex items-center gap-2 ${currentAccent.light} px-3 py-1 rounded-full backdrop-blur-sm`}>
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentAccent.bg}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${currentAccent.text}`}>
                      About Us
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-secondary leading-tight">
                    {title}
                  </h2>
                </div>
                
                {/* Two Column Content */}
                <div className="grid grid-cols-1 gap-5 sm:gap-6">
                  <div className="group/card">
                    <div className="relative p-4 sm:p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                      <div className="mb-3">
                        <div className="w-30 h-10 mb-2">
                          <img 
                            src="/interact.png" 
                            alt="Interact" 
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <RichText 
                        enableProse={false} 
                        enableGutter={false} 
                        data={interactContent} 
                        className="text-slate-600 text-sm leading-relaxed" 
                      />
                    </div>
                  </div>

                  <div className="group/card">
                    <div className="relative p-4 sm:p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                      <div className="mb-3">
                        <div className="w-30 h-10 mb-2">
                          <img 
                            src="/rotary.png" 
                            alt="Rotary" 
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <RichText 
                        enableProse={false} 
                        enableGutter={false} 
                        data={rotaryContent} 
                        className="text-slate-600 text-sm leading-relaxed" 
                      />
                    </div>
                  </div>
                </div>

                {/* Partnership Card */}
                <div className={cn(
                  "relative p-5 rounded-xl overflow-hidden",
                  "backdrop-blur-md shadow-lg",
                  `bg-gradient-to-br ${currentAccent.bg}`,
                  "border border-white/30"
                )}>
                  <div className="absolute inset-0 bg-white/15 backdrop-blur-[2px]" />
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 1px)`,
                      backgroundSize: '20px 20px'
                    }} />
                  </div>
                  
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                        The Partnership
                      </h4>
                      <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                    </div>
                    <RichText 
                      enableProse={false} 
                      enableGutter={false} 
                      data={relationshipContent} 
                      className="text-white/95 text-sm leading-relaxed [&_a]:text-white [&_a]:underline [&_a:hover]:no-underline" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative floating glass elements */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-white/30 to-transparent blur-3xl pointer-events-none -z-10 hidden lg:block" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-gradient-to-tr from-white/30 to-transparent blur-3xl pointer-events-none -z-10 hidden lg:block" />
      </div>
    </section>
  )
}

