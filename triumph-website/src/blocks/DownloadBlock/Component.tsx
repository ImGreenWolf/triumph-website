import React from 'react'
import { Download, FileText } from 'lucide-react'

import type { DownloadFilesBlock as DownloadFilesBlockType } from '@/payload-types'

export const DownloadFilesBlock: React.FC<DownloadFilesBlockType> = ({ title, description, files }) => (
  <section className="container">
    {title && <h2 className="block-title max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h2>}
    {description && <p className="mt-4 max-w-prose text-base leading-7 text-foreground/80">{description}</p>}
    <ul className="mt-10 grid border-t border-foreground/25">
      {files?.map((item, index) => {
        const file = typeof item.file === 'object' ? item.file : null
        if (!file?.url) return null
        return (
          <li key={item.id || index}>
            <a className="group flex min-h-24 items-center gap-4 border-b border-foreground/25 py-6 text-foreground transition-colors hover:bg-card/30 sm:gap-6 sm:px-4" download href={file.url}>
              <FileText aria-hidden className="size-5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 text-xl font-semibold sm:text-2xl">{item.label || file.filename}</span>
              <Download aria-hidden className="size-7 shrink-0 text-accent" />
            </a>
          </li>
        )
      })}
    </ul>
  </section>
)
