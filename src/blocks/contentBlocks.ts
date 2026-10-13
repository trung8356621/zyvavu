import type { Block } from 'payload'

import { lexicalEditor } from '@payloadcms/richtext-lexical'

const imageField = {
  name: 'image',
  type: 'upload' as const,
  relationTo: 'media' as const,
  required: true,
}

export const richTextBlock: Block = {
  slug: 'richText',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  fields: [
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
      required: true,
    },
  ],
}

export const bannerBlock: Block = {
  slug: 'banner',
  labels: { singular: 'Banner', plural: 'Banners' },
  fields: [
    imageField,
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'textarea' },
    { name: 'href', type: 'text' },
  ],
}

export const sliderBlock: Block = {
  slug: 'slider',
  labels: { singular: 'Slider', plural: 'Sliders' },
  fields: [
    {
      name: 'slides',
      type: 'array',
      minRows: 1,
      fields: [
        imageField,
        { name: 'heading', type: 'text' },
        { name: 'text', type: 'textarea' },
        { name: 'href', type: 'text' },
      ],
    },
  ],
}

export const logoSliderBlock: Block = {
  slug: 'logoSlider',
  labels: { singular: 'Logo slider', plural: 'Logo sliders' },
  fields: [
    {
      name: 'logos',
      type: 'array',
      minRows: 1,
      fields: [
        imageField,
        { name: 'alt', type: 'text', required: true },
        { name: 'href', type: 'text' },
      ],
    },
  ],
}

export const contentBlocks = [richTextBlock, bannerBlock, sliderBlock, logoSliderBlock]
