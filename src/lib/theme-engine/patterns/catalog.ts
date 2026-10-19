import { atomManifests } from '@/widgets/atoms/manifests'
import { systemDescriptor } from '../widget-contracts'
import type { UniversalStyle } from '@/lib/style-engine/types'
import type { ThemeComponentData } from '../types'
import { collectPatternTokens, type PatternJSON } from './json'
const text = (id: string, title: string): ThemeComponentData => ({
  type: 'TextBlock',
  props: { id, title, content: 'Nội dung của bạn theo phong cách Theme hiện tại.' },
})
function pattern(
  type: string,
  id: string,
  name: string,
  description: string,
  style: UniversalStyle,
  props: Record<string, unknown> = {},
): PatternJSON {
  const payload = { content: [{ type, props: { ...props, id: `${id}-root`, style } }], zones: {} }
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
    widgetType: type,
    source: 'system',
    version: 1,
    payload,
    theme: { tokens: collectPatternTokens(payload) },
    thumbnail: { version: 1, status: 'pending', url: `/pattern-library/${id}-v1.webp` },
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
      content: [
        {
          ...text('center-text', 'Tập trung vào điều quan trọng'),
          props: { ...text('center-text', 'Tập trung vào điều quan trọng').props, align: 'center' },
        },
      ],
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

export const SYSTEM_PATTERNS: PatternJSON[] = [
  ...LEGACY_SYSTEM_PATTERNS,
  ...Object.entries(atomManifests).flatMap(([type, manifest]) =>
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
  ),
]
