import { AccordionGalleryBlock } from '@/blocks/AccordionGallery/config'
import type { Block } from 'payload'

export const HomepageEvents: Block = {
  slug: 'homepageEvents',
  interfaceName: 'HomepageEventsBlock',
  labels: { singular: 'Evenimente evidențiate', plural: 'Secțiuni de evenimente' },
  fields: [
    {
      name: 'title',
      type: 'text',
      defaultValue: 'Evenimentele noastre',
      required: true,
      label: 'Titlu',
    },
    { name: 'description', type: 'textarea', label: 'Introducere' },
    ...AccordionGalleryBlock.fields.filter(
      (field) => 'name' in field && field.name === 'introContent',
    ),
    {
      name: 'presentation',
      type: 'select',
      label: 'Afișarea evenimentelor evidențiate',
      defaultValue: 'gallery',
      options: [
        { label: 'Galerie interactivă', value: 'gallery' },
        { label: 'Carduri', value: 'cards' },
      ],
    },
    {
      name: 'highlightGallery',
      type: 'group',
      label: 'Imaginile și etichetele galeriei',
      fields: AccordionGalleryBlock.fields.filter(
        (field) => 'name' in field && ['items', 'showLabels', 'expandRatio'].includes(field.name),
      ),
    },
    {
      name: 'featuredEvent',
      type: 'relationship',
      relationTo: 'events',
      label: 'Eveniment viitor evidențiat',
      filterOptions: { _status: { equals: 'published' } },
      admin: {
        description:
          'Este afișat numai înainte de începere. Fără selecție, apare următorul eveniment viitor publicat. Dacă nu există unul, galeria și butonul către arhivă rămân vizibile.',
      },
    },
    {
      name: 'highlightedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      label: 'Evenimente evidențiate, în ordinea afișării',
      maxRows: 6,
      filterOptions: { _status: { equals: 'published' } },
    },
    {
      name: 'archiveLabel',
      type: 'text',
      defaultValue: 'Vezi toate evenimentele',
      label: 'Textul butonului',
    },
  ],
}
