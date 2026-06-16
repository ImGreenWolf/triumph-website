import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { postgresAdapter } from '@payloadcms/db-postgres'

import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { EventRegistrations, Events } from './collections/Events'
import { Partners } from './Partners/config'
import { Causes, Sponsors } from './collections/Partners'
import { TeamBlock } from './blocks/TeamBlock/config'
import { MembersDashboard } from './collections/Members/global'
import { Meetings } from './collections/Meetings'
import { Attendance } from './collections/Attendance'
import { AbsenceMotivations } from './collections/AbsenceMotivations'
import { Payments } from './collections/Members/payments'
import { GalleryPhotos } from './collections/GalleryPhotos'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      graphics: {
        Logo: '@/components/Logo',
        Icon: '@/components/Logo/icon.tsx',
      },
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below
    },
    meta: {
      title: 'Interact Bucureşti Triumph',
      description:
        'ONG-ul de voluntariat Interact Bucureşti Triumph, ramura a Rotary International',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/logo.png',
        },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },

    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },

  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Meetings,
    Attendance,
    AbsenceMotivations,
    Events,
    EventRegistrations,
    Sponsors,
    Causes,
    Payments,
    GalleryPhotos,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, MembersDashboard],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
