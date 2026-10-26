import React from 'react'
import { createRoot } from 'react-dom/client'
import CardNav from '@/Header/Nav/CardNav'
import { BlockReveal } from '@/blocks/BlockReveal.client'
import { StaggeredStats } from '@/blocks/StatsBlock/StaggeredStats.client'
import { HomepageEventsView } from '@/blocks/HomepageEvents/View'
import type { EventCardData } from '@/components/EventCard'
import data from './data.json'
const highlights = data.highlights as unknown as EventCardData[]
const scenario = new URLSearchParams(location.search).get('case')
const nav =
  scenario === 'header-empty'
    ? []
    : scenario === 'header-many'
      ? Array.from({ length: 6 }, (_, index) => ({
          ...data.nav![index % data.nav!.length],
          label: `Destinație de test cu un titlu foarte lung ${index + 1}`,
        }))
      : data.nav!
const featured =
  scenario === 'upcoming'
    ? {
        ...highlights[0],
        name: 'Eveniment de test — în curând',
        days: [{ eventDate: '2099-10-25', slots: [] }],
      }
    : undefined
const blockMotion =
  scenario === 'block-motion' ? (
    <div className="pt-[1200px]">
      {['content', 'formBlock', 'teamBlock', 'textLoop'].map((type, index) => (
        <BlockReveal
          key={type}
          blockType={type}
          className={`cms-block cms-block--${type} mb-[1000px] ${index === 0 ? 'min-h-[1800px]' : 'min-h-[400px]'}`}
        >
          <div id={`entrance-block-${index}`}>
            {type === 'formBlock' ? (
              <form>
                <label>
                  Test input
                  <input aria-label="Test input" />
                </label>
              </form>
            ) : (
              `Test block ${index}`
            )}
          </div>
        </BlockReveal>
      ))}
      <StaggeredStats>
        {[1, 2, 3, 4].map((value) => (
          <article key={value} data-stat className="min-h-32 bg-card p-4">
            <span>{value}</span> Test stat
          </article>
        ))}
      </StaggeredStats>
    </div>
  ) : null
createRoot(document.getElementById('root')!).render(
  <>
    <header className="fixed inset-x-0 top-0 z-20">
      <CardNav
        items={nav}
        pathname="/"
        baseColor="var(--card)"
        buttonUrl="/members"
        buttonText="Contul meu"
      />
    </header>
    <main className="pb-16 pt-32">
      {blockMotion || (
        <HomepageEventsView
          title={data.title || 'Evenimentele noastre'}
          highlights={scenario === 'empty' ? [] : highlights}
          presentation={scenario === 'gallery' ? 'gallery' : 'cards'}
          featured={featured}
          renderedAt={Date.now()}
        />
      )}
    </main>
  </>,
)
