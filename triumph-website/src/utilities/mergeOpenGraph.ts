import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { getCachedGlobal } from './getGlobals'


const config = await getCachedGlobal('siteConfig', 1)()



const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  locale: 'ro_RO',
  description: 'Site-ul oficial al clubului Interact București Triumph.',
  images: [
    {
      url:  (typeof config.defaultOGImage == "object" ? config.defaultOGImage?.sizes?.og?.url : config.defaultOGImage) || `${getServerSideURL()}/website-template-OG.webp`,
      
    },
  ],
  siteName: 'Interact București Triumph',
  title: 'Interact București Triumph',
}
export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
