import React from 'react'
import { Media } from '@/components/Media'
import type { AboutUsBlock as AboutUsProps } from '@/payload-types'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'
import MarkOfExcellence from '@/components/ui/MarkOfExcellence'

type RichTextData = AboutUsProps['interactContent']
type AccentName = 'blue' | 'royal' | 'gold' | 'cranberry'

type AboutUsBlockProps = AboutUsProps & {
  rotaractContent?: RichTextData
}

const accentStyles = {
  blue: {
    bg: 'bg-[#0194ce]',
    bgOnDark: 'bg-[#00a2e0]',
    text: 'text-[#0194ce]',
    textOnDark: 'text-[#72d8ff]',
    soft: 'bg-[#0194ce]/15',
    border: 'border-[#0194ce]',
    ring: 'ring-[#0194ce]/25',
  },
  royal: {
    bg: 'bg-[#003366]',
    bgOnDark: 'bg-[#6aa4ee]',
    text: 'text-[#003366]',
    textOnDark: 'text-[#9cc5ff]',
    soft: 'bg-[#003366]/15',
    border: 'border-[#003366]',
    ring: 'ring-[#003366]/25',
  },
  gold: {
    bg: 'bg-[#f7a81b]',
    bgOnDark: 'bg-[#f7a81b]',
    text: 'text-[#f7a81b]',
    textOnDark: 'text-[#f7c866]',
    soft: 'bg-[#f7a81b]/15',
    border: 'border-[#f7a81b]',
    ring: 'ring-[#f7a81b]/25',
  },
  cranberry: {
    bg: 'bg-[#d91b5c]',
    bgOnDark: 'bg-[#d91b5c]',
    text: 'text-[#d91b5c]',
    textOnDark: 'text-[#ff7aa8]',
    soft: 'bg-[#d91b5c]/15',
    border: 'border-[#d91b5c]',
    ring: 'ring-[#d91b5c]/25',
  },
} satisfies Record<
  AccentName,
  {
    bg: string
    bgOnDark: string
    text: string
    textOnDark: string
    soft: string
    border: string
    ring: string
  }
>

const defaultRichText = (text: string): RichTextData =>
  ({
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }) as RichTextData

const DEFAULT_ROTARACT_CONTENT = defaultRichText(
  'Rotaract este puntea dintre Interact si Rotary: o comunitate pentru tineri adulti care continua spiritul voluntariatului prin leadership, proiecte de impact si conexiuni internationale in familia Rotary.',
)

export const AboutUsBlock: React.FC<AboutUsBlockProps> = ({
  title,
  interactContent,
  rotaryContent,
  rotaractContent = DEFAULT_ROTARACT_CONTENT,
  relationshipContent,
  image,
  accentColor = 'blue',
}) => {
  const currentAccentName = (accentColor ?? 'blue') as AccentName
  const currentAccent = accentStyles[currentAccentName] ?? accentStyles.blue
  const organizationCards = [
    {
      accent: accentStyles.blue,
      content: interactContent,
      logo: '/interact.png',
      mark: 'blue',
      name: 'Interact',
    },
    {
      accent: accentStyles.cranberry,
      content: rotaractContent,
      logo: '/rotaract.png',
      mark: 'cranberry',
      name: 'Rotaract',
    },
    {
      accent: accentStyles.gold,
      content: rotaryContent,
      logo: '/rotary.png',
      mark: 'gold',
      name: 'Rotary',
    },
  ] satisfies {
    accent: (typeof accentStyles)[AccentName]
    content: RichTextData
    logo: string
    mark: AccentName
    name: string
  }[]

  return (
    <section className="relative overflow-hidden bg-card py-14 text-card-foreground md:py-20">
      <div
        aria-hidden
        className="halftone-background pointer-events-none absolute inset-0 opacity-20 [--halftone-color:var(--accent)]"
      />
      <div aria-hidden className={cn('absolute inset-x-0 top-0 h-1', currentAccent.bgOnDark)} />

      <div className="container relative">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-end">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <span className={cn('h-px w-10', currentAccent.bgOnDark)} />
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-md',
                  currentAccent.soft,
                )}
              >
                <MarkOfExcellence className="size-4" currentAccent={currentAccentName} />
              </span>
              <p
                className={cn(
                  'text-xs font-semibold uppercase tracking-normal',
                  currentAccent.textOnDark,
                )}
              >
                Despre organizația noastră
              </p>
            </div>

            <h2 className="max-w-3xl text-4xl font-bold leading-tight text-card-foreground md:text-6xl">
              {title}
            </h2>

            <div className="mt-8 max-w-xl border-l border-card-foreground/20 pl-5">
              <p className="text-sm font-semibold uppercase tracking-normal text-accent">
                Parteneriatul
              </p>
              <RichText
                enableProse={false}
                enableGutter={false}
                data={relationshipContent}
                className="mt-3 text-sm leading-6 text-card-foreground/75 [&_a]:text-accent [&_a]:underline-offset-4 [&_p]:my-0 [&_p+p]:mt-3 [&_strong]:text-white"
              />
            </div>
          </div>

          <figure className="relative aspect-[4/3] overflow-hidden rounded-lg border border-card-foreground/15 bg-card-foreground/10 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            {typeof image !== 'string' && image && (
              <Media resource={image} fill imgClassName="h-full w-full object-cover" />
            )}
            <figcaption className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-card/85 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-card-foreground backdrop-blur-md">
              Interact / Rotaract / Rotary
            </figcaption>
          </figure>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {organizationCards.map((card) => (
            <article
              className={cn(
                'relative min-w-0 overflow-hidden rounded-lg border bg-white p-5 text-[#141e34] shadow-sm ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-6',
                card.accent.border,
                card.accent.ring,
              )}
              key={card.name}
            >
              <div aria-hidden className={cn('absolute inset-x-0 top-0 h-1', card.accent.bg)} />
              <div className="mb-6 flex min-h-12 items-center justify-between gap-4">
                <div className="min-w-0">
                  <img
                    src={card.logo}
                    alt={card.name}
                    className="h-10 max-w-36 object-contain object-left"
                    loading="lazy"
                  />
                </div>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-md',
                    card.accent.soft,
                  )}
                >
                  <MarkOfExcellence className="size-4" currentAccent={card.mark} />
                </span>
              </div>
              <RichText
                enableProse={false}
                enableGutter={false}
                data={card.content}
                className="text-sm leading-6 text-[#4f5b6e] [&_a]:font-semibold [&_a]:text-[#00a2e0] [&_a]:underline-offset-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_p]:my-0 [&_p+p]:mt-3 [&_strong]:text-[#141e34]"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
