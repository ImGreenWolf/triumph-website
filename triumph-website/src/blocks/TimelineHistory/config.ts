// blocks/EventTimeline/config.ts

import type { Block } from 'payload'

export const EventTimeline: Block = {
  slug: 'eventTimeline',
  interfaceName: 'EventTimelineBlock',
  labels: {
    singular: 'Event Timeline',
    plural: 'Event Timelines',
  },
  fields: [
    {
      name: 'layout',
      type: 'select',
      label: 'Timeline Layout',
      defaultValue: 'vertical',
      options: [
        {
          label: 'Vertical Timeline',
          value: 'vertical',
        },
        {
          label: 'Horizontal Carousel',
          value: 'horizontal',
        },
      ],
      admin: {
        description: 'Choose how the timeline should be displayed',
      },
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Number of Events',
      defaultValue: 10,
      min: 1,
      max: 50,
      admin: {
        description: 'Maximum number of events to display',
        step: 1,
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Section Title',
      defaultValue: 'Our Impact',
      admin: {
        description: 'Title displayed above the timeline',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Section Subtitle',
      admin: {
        description: 'Optional subtitle text',
        rows: 2,
      },
    },
    {
      name: 'showPastYears',
      type: 'checkbox',
      label: 'Show Events from Past Years',
      defaultValue: true,
      admin: {
        description: 'Display completed events from previous years',
      },
    },
    {
      name: 'showStatistics',
      type: 'checkbox',
      label: 'Show Event Statistics',
      defaultValue: true,
      admin: {
        description: 'Display attendees count, donation amounts, etc.',
      },
    },
    {
      name: 'accentColor',
      type: 'select',
      label: 'Accent Color',
      defaultValue: 'blue',
      options: [
        {
          label: 'Blue',
          value: 'blue',
        },
        {
          label: 'Royal Blue',
          value: 'royal',
        },
        {
          label: 'Gold',
          value: 'gold',
        },
      ],
      admin: {
        description: 'Choose the accent color for timeline nodes and highlights',
      },
    },
    {
      name: 'customAccentColor',
      type: 'text',
      label: 'Custom Accent Color',
      admin: {
        description: 'Enter a custom hex color (e.g., #FF5733)',
        placeholder: '#FF5733',
        condition: (_, siblingData) => siblingData?.accentColor === 'custom',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      label: 'Background Color',
      defaultValue: 'white',
      options: [
        {
          label: 'White',
          value: 'white',
        },
        {
          label: 'Gray',
          value: 'gray',
        },
        {
          label: 'Slate',
          value: 'slate',
        },
        {
          label: 'Custom',
          value: 'custom',
        },
      ],
    },
    {
      name: 'customBackgroundColor',
      type: 'text',
      label: 'Custom Background Color',
      admin: {
        description: 'Enter a custom hex color for the background',
        placeholder: '#F8F9FA',
        condition: (_, siblingData) => siblingData?.backgroundColor === 'custom',
      },
    },
    {
      name: 'padding',
      type: 'group',
      label: 'Section Padding',
      fields: [
        {
          name: 'top',
          type: 'select',
          defaultValue: 'large',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        {
          name: 'bottom',
          type: 'select',
          defaultValue: 'large',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
      ],
    },
    {
      name: 'animation',
      type: 'group',
      label: 'Animation Settings',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Enable Animations',
          defaultValue: true,
        },
        {
          name: 'duration',
          type: 'number',
          label: 'Animation Duration (ms)',
          defaultValue: 500,
          min: 0,
          max: 2000,
          admin: {
            step: 100,
            condition: (_, siblingData) => siblingData?.enabled === true,
          },
        },
      ],
    },
    {
      name: 'filterByCause',
      type: 'relationship',
      label: 'Filter by Cause',
      relationTo: 'causes',
      hasMany: true,
      admin: {
        description: 'Only show events related to specific causes',
      },
    },
    {
      name: 'minimumDonation',
      type: 'number',
      label: 'Minimum Donation Amount',
      admin: {
        description: 'Only show events that raised at least this amount',
        step: 100,
      },
    },
    {
      name: 'minimumAttendance',
      type: 'number',
      label: 'Minimum Attendance',
      admin: {
        description: 'Only show events with at least this many attendees',
        step: 5,
      },
    },
  ],
}