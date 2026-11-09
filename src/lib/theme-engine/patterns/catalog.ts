import { atomManifests } from '@/widgets/atoms/manifests'
import { ATOM_TYPES, systemDescriptor } from '../widget-contracts'
import type { UniversalStyle } from '@/lib/style-engine/types'
import type { ThemeComponentData } from '../types'
import { collectPatternTokens, type PatternJSON } from './json'
import { ATOM_PRESETS } from './atom-presets'
const text = (
  id: string,
  title: string,
  align: 'left' | 'center' = 'left',
): ThemeComponentData => ({
  type: 'Columns',
  props: {
    id,
    distribution: '1',
    column1: contentAtoms(id, title, 'Nội dung của bạn theo phong cách Theme hiện tại.', { align }),
  },
})
function contentAtoms(
  id: string,
  title: string,
  content: string,
  typography: UniversalStyle['typography'] = {},
): ThemeComponentData[] {
  return [
    {
      type: 'Heading',
      props: {
        id: `${id}-heading`,
        text: title,
        style: {
          typography: { typography: 'h2', colorToken: 'text', ...typography },
          spacing: { margin: { topToken: 'none', bottomToken: 'sm' } },
        },
      },
    },
    {
      type: 'Heading',
      props: {
        id: `${id}-body`,
        text: content,
        tag: 'p',
        style: {
          typography: {
            typography: 'p1',
            colorToken: 'text',
            ...(typography.align ? { align: typography.align } : {}),
          },
          spacing: { margin: { topToken: 'none', bottomToken: 'md' } },
        },
      },
    },
  ]
}

const IMAGE_SAMPLE = '/pattern-library/media-sample.svg'

function sampleImage(id: string): ThemeComponentData {
  return {
    type: 'Image',
    props: {
      id,
      src: IMAGE_SAMPLE,
      alt: 'Sample media',
      aspectRatio: '16:9',
      style: { radius: { radiusToken: 'md' } },
    },
  }
}

function sampleButton(id: string, label: string): ThemeComponentData {
  return {
    type: 'Button',
    props: {
      id,
      text: label,
      style: {
        typography: { typography: 'p1', align: 'center' },
        spacing: { padding: { token: 'sm' } },
        button: {
          version: 1,
          normal: { preset: 'theme', radius: { radiusToken: 'md' } },
          hover: { transform: 'lift' },
        },
        dimensions: { align: 'center' },
      },
    },
  }
}
function pattern(
  type: string,
  id: string,
  name: string,
  description: string,
  style: UniversalStyle,
  props: Record<string, unknown> = {},
): PatternJSON {
  const composite = type === 'TextBlock'
  const { typography, ...containerStyle } = style
  const payload = {
    content: [
      composite
        ? {
            type: 'Section',
            props: {
              id: `${id}-root`,
              containerWidth: 'full',
              verticalPadding: 'none',
              style: containerStyle,
              content: contentAtoms(
                id,
                String(props.title || ''),
                String(props.content || ''),
                typography,
              ),
            },
          }
        : { type, props: { ...props, id: `${id}-root`, style } },
    ],
    zones: {},
  }
  return {
    schemaVersion: 1,
    id,
    name,
    description,
    category:
      type === 'Section'
        ? 'sections'
        : type === 'Columns'
          ? 'layout'
          : type === 'FeaturedMedia'
            ? 'dynamic'
            : 'text',
    widgetType: composite ? 'Section' : type,
    source: 'system',
    version: ['TextBlock', 'Section', 'Columns'].includes(type) ? 2 : 1,
    payload,
    theme: { tokens: collectPatternTokens(payload) },
    thumbnail: {
      version: ['TextBlock', 'Section', 'Columns'].includes(type) ? 2 : 1,
      status: 'pending',
      url: `/api/pattern-thumbnails/${id}`,
    },
  }
}
const padding = (token: string) => ({ padding: { token } })
const border = { style: 'solid' as const, widthToken: 'thin', colorToken: 'border' }
const textPatterns = [
  pattern(
    'TextBlock',
    'text-editorial',
    'Editorial text',
    'Heading-led editorial copy.',
    { typography: { typography: 'h2', colorToken: 'text' }, spacing: padding('sm') },
    {
      title: 'Một câu chuyện đáng chia sẻ',
      content: 'Nội dung được định dạng theo typography của Theme.',
    },
  ),
  pattern(
    'TextBlock',
    'text-card',
    'Raised content card',
    'A padded card with soft elevation.',
    {
      typography: { typography: 'h3', colorToken: 'primary' },
      background: { colorToken: 'surface' },
      radius: { radiusToken: 'md' },
      shadow: { shadowToken: 'shadowSoft' },
      spacing: padding('md'),
    },
    { title: 'Thông tin nổi bật', content: 'Một thẻ nội dung có khoảng thở.' },
  ),
  pattern(
    'TextBlock',
    'text-minimal',
    'Minimal copy',
    'Quiet body-led text without decoration.',
    { typography: { typography: 'p1', colorToken: 'text' }, spacing: padding('xs') },
    { title: 'Nội dung tối giản', content: 'Trình bày thông tin rõ ràng, dễ đọc.' },
  ),
  pattern(
    'TextBlock',
    'text-centered',
    'Centered statement',
    'A centered, spacious statement.',
    {
      typography: { typography: 'h2', colorToken: 'text', align: 'center' },
      spacing: padding('lg'),
    },
    { title: 'Ý tưởng lớn bắt đầu ở đây', content: 'Một điểm nhấn ở giữa trang.', align: 'center' },
  ),
  pattern(
    'TextBlock',
    'text-bordered',
    'Bordered note',
    'An outlined note with compact typography.',
    {
      typography: { typography: 'h3', colorToken: 'text' },
      border,
      radius: { radiusToken: 'sm' },
      spacing: padding('md'),
    },
    { title: 'Ghi chú hữu ích', content: 'Thông tin được phân tách bằng đường viền.' },
  ),
  pattern(
    'TextBlock',
    'text-accent',
    'Accent callout',
    'An accent side rule and semantic heading color.',
    {
      typography: { typography: 'h3', colorToken: 'primary' },
      border: { ...border, colorToken: 'primary', widthToken: 'thick', side: 'left' },
      spacing: padding('md'),
    },
    { title: 'Điểm nhấn quan trọng', content: 'Màu nhấn luôn theo Theme đã xuất bản.' },
  ),
]
const sectionPatterns = [
  pattern(
    'Section',
    'section-airy',
    'Airy section',
    'Generous space around editorial content.',
    { background: { colorToken: 'surface' }, spacing: padding('lg') },
    { content: [text('airy-text', 'Không gian cho câu chuyện')] },
  ),
  pattern(
    'Section',
    'section-grid',
    'Patterned section',
    'A subtle token-colored grid backdrop.',
    {
      background: {
        colorToken: 'surface',
        pattern: { preset: 'grid', colorToken: 'primary', opacity: 0.15, scale: 'md' },
      },
      border,
    },
    { content: [text('grid-text', 'Ý tưởng trên một hệ thống rõ ràng')] },
  ),
  pattern(
    'Section',
    'section-centered',
    'Centered section',
    'A narrow centered content region.',
    { dimensions: { containerWidth: 'narrowWidth' }, spacing: padding('xl') },
    {
      containerWidth: 'narrowWidth',
      content: [text('center-text', 'Tập trung vào điều quan trọng', 'center')],
    },
  ),
  pattern(
    'Section',
    'section-bordered',
    'Framed section',
    'A rounded frame around content.',
    { border, radius: { radiusToken: 'lg' }, spacing: padding('md') },
    { content: [text('frame-text', 'Nội dung trong một khung rõ ràng')] },
  ),
  pattern(
    'Section',
    'section-accent',
    'Accent section',
    'A decorated section with diagonal texture.',
    {
      background: {
        colorToken: 'surface',
        pattern: { preset: 'diagonal', colorToken: 'primary', opacity: 0.2, scale: 'lg' },
      },
      border: { ...border, side: 'top', widthToken: 'thick', colorToken: 'primary' },
      spacing: padding('lg'),
    },
    { content: [text('accent-text', 'Một điểm nhấn theo thương hiệu')] },
  ),
  pattern(
    'Section',
    'section-split',
    'Split feature section',
    'A real nested two-column feature.',
    { background: { colorToken: 'surface' }, spacing: padding('lg') },
    {
      content: [
        {
          type: 'Columns',
          props: {
            id: 'split-columns',
            distribution: '2:1',
            column1: [text('split-feature', 'Nội dung nổi bật')],
            column2: [text('split-aside', 'Thông tin bổ sung')],
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-media-start',
    'Image and text',
    'Media on the left with editorial copy.',
    { background: { colorToken: 'surface' }, spacing: padding('lg') },
    {
      content: [
        {
          type: 'Columns',
          props: {
            id: 'media-start-columns',
            distribution: '1:2',
            column1: [sampleImage('media-start-image')],
            column2: contentAtoms(
              'media-start',
              'Hình ảnh kể chuyện',
              'Đặt media bên trái và chỉnh nội dung ngay trên canvas.',
            ),
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-media-end',
    'Text and image',
    'Copy first, then supporting media.',
    { background: { colorToken: 'surface' }, spacing: padding('lg') },
    {
      content: [
        {
          type: 'Columns',
          props: {
            id: 'media-end-columns',
            distribution: '2:1',
            column1: contentAtoms(
              'media-end',
              'Nội dung dẫn đường',
              'Giữ thông điệp trước, media hỗ trợ bên phải.',
            ),
            column2: [sampleImage('media-end-image')],
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-feature-grid',
    'Feature grid',
    'Three equal feature columns with titles.',
    { spacing: padding('lg') },
    {
      content: [
        {
          type: 'Columns',
          props: {
            id: 'feature-grid-columns',
            distribution: '1:1:1',
            style: { spacing: { gapToken: 'md' } },
            column1: contentAtoms('feature-a', 'Tính năng A', 'Mô tả ngắn theo Theme tokens.'),
            column2: contentAtoms('feature-b', 'Tính năng B', 'Mỗi cột chỉnh sửa độc lập.'),
            column3: contentAtoms('feature-c', 'Tính năng C', 'Bố cục Flex/Grid, không absolute.'),
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-cta',
    'CTA section',
    'Centered title, lead copy, and primary button.',
    {
      background: { colorToken: 'surface' },
      spacing: padding('xl'),
      dimensions: { containerWidth: 'narrowWidth' },
    },
    {
      containerWidth: 'narrowWidth',
      content: [
        {
          type: 'Heading',
          props: {
            id: 'cta-title',
            text: 'Sẵn sàng bắt đầu?',
            tag: 'h2',
            style: {
              typography: { typography: 'h2', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'sm' } },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: 'cta-lead',
            text: 'Một lời kêu gọi hành động rõ ràng kèm nút primary của Theme.',
            tag: 'p',
            style: {
              typography: { typography: 'p1', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
        sampleButton('cta-button', 'Bắt đầu ngay'),
      ],
    },
  ),
  pattern(
    'Section',
    'section-editorial-intro',
    'Editorial introduction',
    'Eyebrow, display title, and lead paragraph.',
    { spacing: padding('xl'), dimensions: { containerWidth: 'narrowWidth' } },
    {
      containerWidth: 'narrowWidth',
      content: [
        {
          type: 'Heading',
          props: {
            id: 'editorial-eyebrow',
            text: 'Chuyên mục',
            tag: 'h6',
            style: {
              typography: {
                typography: 'p2',
                colorToken: 'primary',
                textTransform: 'uppercase',
                letterSpacing: 'wide',
                align: 'center',
              },
              spacing: { margin: { bottomToken: 'xs' } },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: 'editorial-title',
            text: 'Câu chuyện mở đầu',
            tag: 'h1',
            style: {
              typography: { typography: 'h1', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: 'editorial-lead',
            text: 'Đoạn dẫn ngắn giúp người đọc nắm ý chính trước khi đi vào nội dung.',
            tag: 'p',
            style: {
              typography: { typography: 'h3', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-hero-cta',
    'Hero with CTA',
    'Centered hero title, lead, and primary button.',
    {
      background: { colorToken: 'surface' },
      spacing: padding('xl'),
      dimensions: { containerWidth: 'narrowWidth', minHeight: 'md' },
    },
    {
      containerWidth: 'narrowWidth',
      content: [
        {
          type: 'Heading',
          props: {
            id: 'hero-title',
            text: 'Xây dựng trang đẹp hơn',
            tag: 'h1',
            style: {
              typography: { typography: 'h1', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'sm' } },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: 'hero-lead',
            text: 'Hero gọn với CTA dùng Button Design V1 và Theme tokens.',
            tag: 'p',
            style: {
              typography: { typography: 'p1', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
        sampleButton('hero-cta', 'Khám phá ngay'),
      ],
    },
  ),
  pattern(
    'Section',
    'section-testimonial',
    'Testimonial quote',
    'Quote-style paragraph with attribution.',
    { background: { colorToken: 'surface' }, spacing: padding('xl') },
    {
      content: [
        {
          type: 'Heading',
          props: {
            id: 'quote-body',
            text: '“Sản phẩm giúp chúng tôi kể câu chuyện thương hiệu rõ ràng hơn.”',
            tag: 'p',
            style: {
              typography: {
                typography: 'h3',
                colorToken: 'text',
                fontStyle: 'italic',
                align: 'center',
              },
              border: { ...border, side: 'left', widthToken: 'thick', colorToken: 'primary' },
              spacing: padding('md'),
              background: { colorToken: 'surface' },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: 'quote-byline',
            text: '— Khách hàng minh họa',
            tag: 'p',
            style: {
              typography: { typography: 'p2', colorToken: 'primary', align: 'center' },
              spacing: { margin: { topToken: 'sm' } },
            },
          },
        },
      ],
    },
  ),
  pattern(
    'Section',
    'section-gallery',
    'Image gallery section',
    'Section wrapping a responsive image gallery grid.',
    { spacing: padding('lg') },
    {
      content: [
        {
          type: 'Heading',
          props: {
            id: 'gallery-heading',
            text: 'Thư viện hình ảnh',
            tag: 'h2',
            style: {
              typography: { typography: 'h2', colorToken: 'text', align: 'center' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
        {
          type: 'Gallery',
          props: {
            id: 'gallery-grid',
            columns: 3,
            gapToken: 'md',
            aspectRatio: '1:1',
            objectFit: 'cover',
            items: [
              {
                id: 'g1',
                src: IMAGE_SAMPLE,
                alt: 'Sample 1',
                caption: '',
              },
              {
                id: 'g2',
                src: IMAGE_SAMPLE,
                alt: 'Sample 2',
                caption: '',
              },
              {
                id: 'g3',
                src: IMAGE_SAMPLE,
                alt: 'Sample 3',
                caption: '',
              },
            ],
          },
        },
      ],
    },
  ),
]
const distributions = ['equal-2', '2:1', '1:2', '1:1:1', '1:1:1:1', '1']
const columnNames = [
  'Balanced columns',
  'Feature and aside',
  'Aside and feature',
  'Three columns',
  'Four columns',
  'Single content lane',
]
const columnIds = [
  'columns-equal',
  'columns-feature',
  'columns-reverse',
  'columns-three',
  'columns-four',
  'columns-single',
]
const layoutPatterns = distributions.map((distribution, index) => {
  const count = index === 3 ? 3 : index === 4 ? 4 : index === 5 ? 1 : 2
  const slots = Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `column${i + 1}`,
      [text(`${columnIds[index]}-text-${i}`, `Nội dung ${i + 1}`)],
    ]),
  )
  return pattern(
    'Columns',
    columnIds[index],
    columnNames[index],
    'A reusable layout with complete nested text slots.',
    {
      spacing: { gapToken: index === 0 ? 'md' : 'lg' },
      ...(index === 5 ? { border, radius: { radiusToken: 'md' } } : {}),
    },
    { distribution, ...slots },
  )
})
const mediaStyles: [string, string, UniversalStyle, string, boolean][] = [
  ['media-minimal', 'Minimal image', {}, '16:9', false],
  ['media-rounded', 'Rounded portrait frame', { radius: { radiusToken: 'lg' } }, '4:3', true],
  ['media-banner', 'Panoramic banner', {}, '21:9', false],
  ['media-bordered', 'Bordered image', { border, spacing: padding('sm') }, '16:9', false],
  [
    'media-elevated',
    'Elevated image',
    { shadow: { shadowToken: 'shadowMedium' }, radius: { radiusToken: 'md' } },
    '4:3',
    true,
  ],
  [
    'media-accent',
    'Accent image frame',
    {
      border: { ...border, colorToken: 'primary', widthToken: 'thick' },
      spacing: padding('md'),
      background: { colorToken: 'surface' },
    },
    '16:9',
    false,
  ],
]
const LEGACY_SYSTEM_PATTERNS: readonly PatternJSON[] = [
  ...textPatterns,
  ...sectionPatterns,
  ...layoutPatterns,
  ...mediaStyles.map(([id, name, style, aspectRatio, rounded]) =>
    pattern(
      'FeaturedMedia',
      id,
      name,
      'A presentation preset; applying keeps your existing media binding.',
      style,
      { aspectRatio, rounded },
    ),
  ),
]

const CORE_ATOMS = new Set<string>(ATOM_TYPES)

/** Theme/system-block presentation presets only — core atoms use ATOM_PRESETS. */
const systemBlockPatterns: PatternJSON[] = Object.entries(atomManifests)
  .filter(([type]) => !CORE_ATOMS.has(type))
  .flatMap(([type, manifest]) =>
    ['text', 'primary'].map((color, index) => {
      const record = pattern(
        type,
        `${type.toLowerCase()}-${color}`,
        `${manifest.label} ${index ? 'Accent' : 'Default'}`,
        `Presentation for ${systemDescriptor(type)?.role || type}.`,
        {
          typography: {
            typography:
              systemDescriptor(type)?.atom === 'Heading' || type === 'Heading' ? 'h2' : 'p1',
            colorToken: color,
          },
        },
        manifest.defaultProps,
      )
      record.source = systemDescriptor(type) ? 'theme' : 'system'
      record.category = systemDescriptor(type)?.role || 'general'
      return record
    }),
  )

export const SYSTEM_PATTERNS: PatternJSON[] = [
  ...ATOM_PRESETS,
  ...LEGACY_SYSTEM_PATTERNS,
  ...systemBlockPatterns,
]
