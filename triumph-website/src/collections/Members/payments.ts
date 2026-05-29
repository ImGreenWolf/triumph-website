import { CollectionConfig } from "payload";

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'member',
    group: "Club Administration",
  },
    indexes: [
    {
        fields: ['member', 'month'],
        unique: true,
    },
  ],
  fields: [
  {
    name: 'member',
    type: 'relationship',
    relationTo: 'users',
    required: true,
  },
  
  {
    name: 'month',
    type: 'date',
    required: true,
    defaultValue: () => new Date(),
    admin: {
        date: {
        pickerAppearance: 'monthOnly',
      },
    }
  },
  {
    name: 'amount',
    type: 'number',
    defaultValue: 21,
  },
  {
    name: 'type',
    type: 'select',
    defaultValue: 'paid',
    options: [
      {
        label: 'Paid',
        value: 'paid',
      },
      {
        label: 'Waived',
        value: 'waived',
      },
    ],
  },
  
],
timestamps: true
}
