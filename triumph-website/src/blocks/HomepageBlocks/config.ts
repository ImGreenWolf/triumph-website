import { slugField, type Block, type Field } from 'payload'

import {
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

const richTextField = (name: string, label: false | string = false): Field => ({
    name,
    type: 'richText',
    editor: lexicalEditor({
        features: ({ rootFeatures }) => {
            return [
                ...rootFeatures,
                HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                FixedToolbarFeature(),
                InlineToolbarFeature(),
            ]
        },
    }),
    label,
})

const introContent = richTextField('introContent', 'Intro Content')

export const SectionIntroBlock: Block = {
    slug: 'sectionIntro',
    interfaceName: 'SectionIntroBlock',
    fields: [
        {
            name: 'eyebrow',
            type: 'text',
        },
        richTextField('richText'),
        {
            name: 'alignment',
            type: 'select',
            defaultValue: 'left',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
            ],
        },
        slugField({useAsSlug: 'eyebrow', checkboxName: 'Use id', name: 'sectionId', required: false})
    ],
    labels: {
        plural: 'Section Intros',
        singular: 'Section Intro',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/sectionIntro.webp',
            icon: '/block-previews/icons/sectionIntro.svg'
        }
    }
}

export const SectionTitleBlock: Block = {
    slug: 'sectionTitle',
    interfaceName: 'SectionTitleBlock',
    fields: [
        {
            name: 'eyebrow',
            type: 'text',
        },
        {
            name: 'title',
            type: 'textarea',
        },
        {
            name: 'alignment',
            type: 'select',
            defaultValue: 'left',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
            ],
        },
        slugField({useAsSlug: 'eyebrow', checkboxName: 'Use id', name: 'sectionId', required: false})
    ],
    labels: {
        plural: 'Section Titles',
        singular: 'Section Title',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/sectionIntro.webp',
            icon: '/block-previews/icons/sectionIntro.svg'
        }
    }
}

export const FeatureGridBlock: Block = {
    slug: 'featureGrid',
    interfaceName: 'FeatureGridBlock',
    fields: [
        introContent,
        {
            name: 'features',
            type: 'array',
            fields: [
                { name: 'label', type: 'text' },
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
            ],
        },
    ],
    labels: {
        plural: 'Feature Grids',
        singular: 'Feature Grid',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/featureGrid.webp',
            icon: '/block-previews/icons/featureGrid.svg'
        }
    }
}

export const StatsBlock: Block = {
    slug: 'statsBlock',
    interfaceName: 'StatsBlock',
    fields: [
        introContent,
        {
            name: 'stats',
            type: 'array',
            fields: [
                { name: 'value', type: 'number', required: true },
                { name: 'unit', type: 'text', required: false },
                { name: 'label', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
            ],
        },
        {
            name: 'gallery',
            type: 'upload',
            relationTo: 'media',
            required: false,
            hasMany: true
        }
    ],
    labels: {
        plural: 'Stats Blocks',
        singular: 'Stats Block',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/statsBlock.webp',
            icon: '/block-previews/icons/statsBlock.svg'
        }
    }
}

export const SplitMediaBlock: Block = {
    slug: 'splitMediaBlock',
    interfaceName: 'SplitMediaBlock',
    fields: [
        richTextField('richText'),
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            required: true,
        },
        {
            name: 'mediaPosition',
            type: 'select',
            defaultValue: 'right',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
            ],
        },
        linkGroup({
            appearances: ['default', 'outline'],
            overrides: {
                maxRows: 2,
            },
        }),
    ],
    labels: {
        plural: 'Split Media Blocks',
        singular: 'Split Media Block',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/splitMediaBlock.webp',
            icon: '/block-previews/icons/splitMediaBlock.svg'
        }
    }
}

export const ProcessBlock: Block = {
    slug: 'processBlock',
    interfaceName: 'ProcessBlock',
    fields: [
        introContent,
        {
            name: 'steps',
            type: 'array',
            fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
            ],
        },
    ],
    labels: {
        plural: 'Process Blocks',
        singular: 'Process Block',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/processBlock.webp',
            icon: '/block-previews/icons/processBlock.svg'
        }
    }
}

export const TestimonialBlock: Block = {
    slug: 'testimonialBlock',
    interfaceName: 'TestimonialBlock',
    fields: [
        introContent,
        {
            name: 'testimonials',
            type: 'array',
            fields: [
                { name: 'quote', type: 'textarea', required: true },
                { name: 'authorName', type: 'text', required: true },
                { name: 'authorRole', type: 'text' },
                {
                    name: 'avatar',
                    type: 'upload',
                    relationTo: 'media',
                },
            ],
        },
    ],
    labels: {
        plural: 'Testimonials',
        singular: 'Testimonial',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/testimonialBlock.webp',
            icon: '/block-previews/icons/testimonialBlock.svg'
        }
    }
}

export const LogoCloudBlock: Block = {
    slug: 'logoCloudBlock',
    interfaceName: 'LogoCloudBlock',
    fields: [
        introContent,
        {
            name: 'logos',
            type: 'array',
            fields: [
                { name: 'name', type: 'text', required: true },
                {
                    name: 'logo',
                    type: 'upload',
                    relationTo: 'media',
                    required: true,
                },
                { name: 'url', type: 'text' },
            ],
        },
    ],
    labels: {
        plural: 'Logo Clouds',
        singular: 'Logo Cloud',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/logoCloudBlock.webp',
            icon: '/block-previews/icons/logoCloudBlock.svg'
        }
    }
}

export const homepageBlocks = [
    SectionIntroBlock,
    FeatureGridBlock,
    StatsBlock,
    SplitMediaBlock,
    ProcessBlock,
    TestimonialBlock,
    LogoCloudBlock,
    SectionTitleBlock
]
