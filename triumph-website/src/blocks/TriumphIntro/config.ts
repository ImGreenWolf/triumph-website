import type { Block } from 'payload'

export const TriumphIntro: Block = {
  slug: 'triumphIntro',
  interfaceName: 'TriumphIntroBlock',
  labels: {
    singular: 'Despre Triumph',
    plural: 'Blocuri despre Triumph',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Supratitlu',
      defaultValue: 'Oameni. Idei. Fapte bune.',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titlu',
      required: true,
      defaultValue: 'Ce este Interact București Triumph?',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descriere',
      required: true,
      defaultValue:
        'Suntem o comunitate de tineri din București care transformă ideile în proiecte de voluntariat. La Interact București Triumph, ne implicăm în comunitate, învățăm împreună și construim prietenii prin fiecare proiect.',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Fotografia clubului',
      filterOptions: { mimeType: { contains: 'image/' } },
      admin: {
        description:
          'Alege o fotografie a clubului și completează textul alternativ în Media. Fără fotografie, blocul afișează o compoziție grafică.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Legendă',
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Ce ne aduce împreună',
      labels: { singular: 'Valoare', plural: 'Valori' },
      maxRows: 3,
      defaultValue: [
        {
          title: 'Voluntariat',
          description: 'Dăm timp și energie cauzelor în care credem.',
          icon: 'heart',
        },
        {
          title: 'Prietenie',
          description: 'Creștem împreună și legăm prietenii la fiecare pas.',
          icon: 'people',
        },
        {
          title: 'Impact în comunitate',
          description: 'Transformăm inițiativele noastre în sprijin pentru ceilalți.',
          icon: 'spark',
        },
      ],
      fields: [
        { name: 'title', type: 'text', label: 'Titlu', required: true },
        { name: 'description', type: 'textarea', label: 'Descriere scurtă' },
        {
          name: 'icon',
          type: 'select',
          label: 'Pictogramă',
          defaultValue: 'heart',
          required: true,
          options: [
            { label: 'Inimă', value: 'heart' },
            { label: 'Oameni', value: 'people' },
            { label: 'Scânteie', value: 'spark' },
          ],
        },
      ],
    },
  ],
}
