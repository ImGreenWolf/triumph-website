import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { SiteConfig } from '@/payload-types'
import { getCachedGlobal } from './getGlobals'


const config = await getCachedGlobal('siteConfig', 1)()



const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Site-ul oficial al clubului Interact Bucuresti Triumph.',
  images: [
    {
      url:  (typeof config.defaultOGImage == "object" ? config.defaultOGImage?.sizes?.og?.url : config.defaultOGImage) || `${getServerSideURL()}/website-template-OG.webp`,
      
    },
  ],
  siteName: 'Interact Bucureşti Triumph',
  title: 'Interact Bucureşti Triumph',
}
export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
