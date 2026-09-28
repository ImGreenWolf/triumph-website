import type { Metadata } from 'next'

import type { Media, Page, Post, Config, Event } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { getCachedGlobal } from './getGlobals'


const config = await getCachedGlobal('siteConfig', 1)()

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = (typeof config.defaultOGImage == "object" ? config.defaultOGImage?.sizes?.og?.url : config.defaultOGImage)

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? ogUrl.startsWith('https') ? ogUrl :serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | Partial<Event> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  const title = 
  'name' in doc! ? doc.name : 
  ('title' in doc! && doc?.meta?.title
    ? doc?.meta?.title + ''
    : 'Interact Bucureşti Triumph')

  return {
    description: doc?.meta?.description,
    // icons: [
    //     {
    //       rel: 'icon',
    //       type: 'image/png',
    //       url: '/logo.png'
    //     }
    //   ],
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || config.defaultDescription || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
