import type { GroupField, NumberField } from 'payload'

import { colorField } from '@/fields/color-picker/field'
import { handwritingDefaults, handwritingRanges } from './settings'

const number = (
  name: keyof typeof handwritingRanges,
  label: string,
  description?: string,
  width?: string,
): NumberField => ({
  name,
  label,
  type: 'number',
  defaultValue: handwritingDefaults[name],
  min: handwritingRanges[name][0],
  max: handwritingRanges[name][1],
  admin: {
    step: name.includes('Size') || name === 'backgroundDarkening' ? 1 : 0.1,
    description,
    width,
  },
})

export const handwritingField: GroupField = {
  name: 'handwriting',
  label: 'Looping handwriting',
  type: 'group',
  admin: {
    condition: (_, { type } = {}) => type === 'videoHero',
    description:
      'Add words or short phrases in playback order. Leave the list empty to use the existing title. Buttons appear after the first entry finishes writing.',
  },
  fields: [
    {
      name: 'loop',
      type: 'checkbox',
      label: 'Loop animation',
      defaultValue: handwritingDefaults.loop,
      admin: {
        description:
          'When disabled, plays all entries once, then fades to the existing title or title media. Without a title, the last entry stays visible.',
      },
    },
    {
      name: 'entries',
      type: 'array',
      label: 'Words or phrases',
      labels: { singular: 'Entry', plural: 'Entries' },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
          maxLength: 120,
          validate: (value: unknown) =>
            (typeof value === 'string' && value.trim().length > 0 && value.length <= 120) ||
            'Enter a word or short phrase (up to 120 characters).',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Animation timing',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'parallelReveal',
          type: 'checkbox',
          label: 'Reveal entries in parallel',
          defaultValue: handwritingDefaults.parallelReveal,
          admin: {
            description:
              'With two or more entries, starts writing the next entry while the current one fades out, including between loops. Skips the gap between entries.',
          },
        },
        {
          type: 'row',
          fields: [
            number(
              'initialDelay',
              'Initial delay (seconds)',
              'Only before the first entry.',
              '50%',
            ),
            number(
              'finalDelay',
              'Final delay (seconds)',
              'Extra time to hold the last entry before the closing title or next loop.',
              '50%',
            ),
          ],
        },
        number('writingDuration', 'Writing duration (seconds)', 'Duration of each complete entry.'),
        number('holdDuration', 'Hold duration (seconds)'),
        number('fadeDuration', 'Fade-out duration (seconds)'),
        number('entryGap', 'Gap between entries (seconds)'),
        number('buttonRevealDuration', 'Button reveal duration (seconds)'),
      ],
    },
    {
      type: 'collapsible',
      label: 'Appearance',
      admin: { initCollapsed: true },
      fields: [
        number('desktopTextSize', 'Desktop maximum text size (px)'),
        number('mobileTextSize', 'Mobile maximum text size (px)'),
        number(
          'strokeWidth',
          'Letter weight',
          'Subtle emboldening around the calligraphic font’s natural thick and thin strokes.',
        ),
        colorField({ name: 'color', defaultValue: handwritingDefaults.color }),
        number('backgroundDarkening', 'Background darkening (%)'),
      ],
    },
  ],
}
