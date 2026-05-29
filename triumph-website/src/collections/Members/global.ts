import type { GlobalConfig } from 'payload'

export const MembersDashboard: GlobalConfig = {
  slug: 'members-dashboard',

  access: {
    read: () => true,
    update: ({ req }) => {
      return !!req.user
    },
  },

  admin: {
    group: 'Club Administration',
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

    {
      name: 'quickLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },

    {
      name: 'duesInfoText',
      label: 'Dues Info Text',
      type: 'textarea',
      defaultValue:
        'Luna curentă este marcată printr-un chip gol și nu este considerată restantă. Restanțele păstrează regula existentă: primele 4 luni sunt evaluate la 21 lei, apoi la 41 lei.',
    },

    {
      name: 'supportEmail',
      type: 'email',
    },
  ],
}
