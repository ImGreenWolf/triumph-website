import { mongooseAdapter } from '@payloadcms/db-mongodb'

import { nodemailerAdapter, } from '@payloadcms/email-nodemailer'
import nodemailer from 'nodemailer'
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
import { SiteConfig } from './globals/SiteConfig/config'
import dashboardLayout from './components/Dashboard/dashboardLayout'
import dashboardWidgets from './components/Dashboard/dashboardWidgets'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL = new URL(getServerSideURL()).origin

const configuredOrigins = (process.env.PAYLOAD_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = Array.from(
  new Set(
    [
      serverURL,
      ...configuredOrigins,
      ...(process.env.NODE_ENV === 'development'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : []),
    ].map((origin) => new URL(origin).origin),
  ),
)

export default buildConfig({
  admin: {
    dashboard: {
      defaultLayout: dashboardLayout,
      widgets: dashboardWidgets,
    },
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      graphics: {
        Logo: '@/components/Logo',
        Icon: '@/components/Logo/icon.tsx',
      },
      views: {
        // dashboard: {
        //   Component: '@/components/Dashboard'
        // }
      }
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
  cors: allowedOrigins,
  // Payload appends serverURL automatically during config sanitization.
  csrf: allowedOrigins.filter((origin) => origin !== serverURL),
  globals: [Header, Footer, MembersDashboard, SiteConfig],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  serverURL,
  email: nodemailerAdapter({
    defaultFromAddress: 'hello@interact-triumph.org',
    defaultFromName: 'Interact Bucureşti Triumph',
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT as number | undefined,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }),
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
