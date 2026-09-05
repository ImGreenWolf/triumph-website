import { linkGroup } from '@/fields/linkGroup'
import { hasBoardRole } from '@/utilities/membersAccess'
import type { GlobalConfig } from 'payload'

export const MembersDashboard: GlobalConfig = {
  slug: 'members-dashboard',

  access: {
    read: () => true,
    update: hasBoardRole
  },

  admin: {
    group: 'Site Configuration',
  },

  fields: [
    {
      name: 'dashboardTitle',
      type: 'text',
      defaultValue: 'Member Dashboard',
      required: true,
    },

    {
      name: 'welcomeMessage',
      type: 'textarea',
    },

    {
      name: 'announcement',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'message',
          type: 'textarea',
        },
      ],
    },
    linkGroup({
      appearances: false,
      overrides: { name: 'quickLinks' },
    }),

    {
      name: 'galleryUploadInstructions',
      label: 'Member Gallery Instructions',
      type: 'textarea',
      admin: {
        description: 'Shown on the member gallery upload page.',
      },
    },

    {
      name: 'duesInfoText',
      label: 'Dues Info Text',
      type: 'textarea',
      defaultValue:
        'Cotizațiile sunt calculate începând cu luna primei ședințe din mandatul curent. Luna curentă este marcată printr-un chip gol și nu este considerată restantă. Restanțele păstrează regula existentă: primele 4 luni sunt evaluate la 21 lei, apoi la 41 lei.',
    },

    {
      name: 'supportEmail',
      type: 'email',
    },
  ],
}
