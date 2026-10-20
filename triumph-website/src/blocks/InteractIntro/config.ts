import type { Block } from 'payload'

export const InteractIntro: Block = {
  slug: 'interactIntro',
  interfaceName: 'InteractIntroBlock',
  labels: {
    singular: 'Ce este Interact?',
    plural: 'Introduceri Interact',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Supratitlu',
      defaultValue: 'Descoperă Interact',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titlu',
      required: true,
      defaultValue: 'Ce este Interact?',
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Ce este Interact',
      required: true,
      defaultValue:
        'Interact reunește tineri cu vârste între 12 și 18 ani care se implică în proiecte de voluntariat și își dezvoltă abilitățile de leadership, cu sprijinul cluburilor Rotary.',
    },
    {
      name: 'clubTitle',
      type: 'text',
      label: 'Titlul prezentării Triumph',
      required: true,
      defaultValue: 'Dintr-o comunitate internațională, aici, în București.',
    },
    {
      name: 'clubDescription',
      type: 'textarea',
      label: 'Despre Triumph',
      required: true,
      defaultValue:
        'La Interact București Triumph, transformăm ideile în proiecte de voluntariat, învățăm împreună și construim prietenii. Clubul nostru este sponsorizat de Rotary Cișmigiu.',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Fotografia clubului',
      filterOptions: { mimeType: { contains: 'image/' } },
      admin: {
        description:
          'Alege o fotografie a clubului și completează textul alternativ în Media. Fără fotografie, blocul afișează doar textul.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Legenda fotografiei',
      admin: {
        description: 'Se afișează sub fotografie, doar când este aleasă o imagine.',
      },
    },
  ],
}
