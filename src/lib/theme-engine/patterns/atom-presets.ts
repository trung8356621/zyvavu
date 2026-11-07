import type { UniversalStyle } from '@/lib/style-engine/types'
import type { PatternJSON } from './json'
import { collectPatternTokens } from './json'

/** Core atoms shown first in the Widget Library (Patterns category excluded). */
export const ATOM_LIBRARY_PRIORITY = ['Heading', 'Text', 'Button', 'Image'] as const

export const LIBRARY_CATEGORY_ORDER = [
  'text',
  'buttons',
  'images',
  'general',
  'layout',
  'sections',
  'dynamic',
] as const

const padding = (token: string) => ({ padding: { token } })
const border = { style: 'solid' as const, widthToken: 'thin', colorToken: 'border' }

function atomPattern(
  type: string,
  id: string,
  name: string,
  description: string,
  style: UniversalStyle,
  props: Record<string, unknown> = {},
  category = type === 'Section'
    ? 'sections'
    : type === 'Button'
      ? 'buttons'
      : type === 'Image'
        ? 'images'
        : 'text',
): PatternJSON {
  const payload = {
    content: [{ type, props: { ...props, id: `${id}-root`, style } }],
    zones: {},
  }
  return {
    schemaVersion: 1,
    id,
    name,
    description,
    category,
    widgetType: type,
    source: 'system',
    version: 1,
    payload,
    theme: { tokens: collectPatternTokens(payload) },
  }
}

/** Heading: 8 visually distinct, token-based presets. */
export const HEADING_PRESETS: PatternJSON[] = [
  atomPattern(
    'Heading',
    'heading-display',
    'Display heading',
    'Large page title using theme h1.',
    { typography: { typography: 'h1', colorToken: 'text' }, spacing: { margin: { bottomToken: 'md' } } },
    { text: 'Tiêu đề trang', tag: 'h1' },
  ),
  atomPattern(
    'Heading',
    'heading-centered',
    'Centered display',
    'Centered hero-style heading.',
    {
      typography: { typography: 'h1', colorToken: 'text', align: 'center' },
      spacing: { margin: { bottomToken: 'md' } },
    },
    { text: 'Điểm nhấn chính', tag: 'h1' },
  ),
  atomPattern(
    'Heading',
    'heading-section',
    'Section heading',
    'Standard section title.',
    { typography: { typography: 'h2', colorToken: 'text' }, spacing: { margin: { bottomToken: 'sm' } } },
    { text: 'Tiêu đề phần', tag: 'h2' },
  ),
  atomPattern(
    'Heading',
    'heading-accent',
    'Accent heading',
    'Primary-colored section title.',
    {
      typography: { typography: 'h2', colorToken: 'primary' },
      spacing: { margin: { bottomToken: 'sm' } },
    },
    { text: 'Nội dung nổi bật', tag: 'h2' },
  ),
  atomPattern(
    'Heading',
    'heading-compact',
    'Compact heading',
    'Smaller h3 for dense layouts.',
    { typography: { typography: 'h3', colorToken: 'text' }, spacing: { margin: { bottomToken: 'xs' } } },
    { text: 'Tiêu đề gọn', tag: 'h3' },
  ),
  atomPattern(
    'Heading',
    'heading-eyebrow',
    'Eyebrow label',
    'Uppercase label above a section.',
    {
      typography: {
        typography: 'p2',
        colorToken: 'primary',
        textTransform: 'uppercase',
        letterSpacing: 'wide',
      },
      spacing: { margin: { bottomToken: 'xs' } },
    },
    { text: 'Chuyên mục', tag: 'h6' },
  ),
  atomPattern(
    'Heading',
    'heading-quiet',
    'Quiet heading',
    'Low-emphasis supporting title.',
    { typography: { typography: 'h4', colorToken: 'text' }, spacing: { margin: { bottomToken: 'xs' } } },
    { text: 'Thông tin bổ sung', tag: 'h4' },
  ),
  atomPattern(
    'Heading',
    'heading-editorial',
    'Editorial heading',
    'Spacious editorial title with bottom margin.',
    {
      typography: { typography: 'h2', colorToken: 'text' },
      spacing: { margin: { topToken: 'sm', bottomToken: 'lg' } },
    },
    { text: 'Câu chuyện đáng kể', tag: 'h2' },
  ),
  atomPattern(
    'Heading',
    'heading-surface',
    'Surface panel',
    'Heading on a padded surface block.',
    {
      typography: { typography: 'h2', colorToken: 'text' },
      background: { colorToken: 'surface' },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Khối tiêu đề', tag: 'h2' },
  ),
  atomPattern(
    'Heading',
    'heading-gradient',
    'Gradient band',
    'Title over a soft theme gradient.',
    {
      typography: { typography: 'h2', colorToken: 'surface', align: 'center' },
      background: {
        mode: 'color',
        gradient: {
          type: 'linear',
          angle: 120,
          stops: [
            { token: 'primary', position: 0 },
            { token: 'accent', position: 100 },
          ],
        },
      },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Dải tiêu đề', tag: 'h2' },
  ),
  atomPattern(
    'Heading',
    'heading-bordered',
    'Bordered title',
    'Surface heading with primary side border.',
    {
      typography: { typography: 'h3', colorToken: 'text' },
      background: { colorToken: 'surface' },
      border: { ...border, side: 'left', widthToken: 'thick', colorToken: 'primary' },
      spacing: padding('sm'),
    },
    { text: 'Tiêu đề khung', tag: 'h3' },
  ),
  atomPattern(
    'Heading',
    'heading-pattern',
    'Pattern backdrop',
    'Heading with a subtle pattern overlay.',
    {
      typography: { typography: 'h2', colorToken: 'text', align: 'center' },
      background: {
        colorToken: 'surface',
        pattern: { preset: 'dots', colorToken: 'primary', opacity: 0.18, scale: 'md' },
      },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Tiêu đề họa tiết', tag: 'h2' },
  ),
]

/** Text: 6 body/copy presets. IDs use `copy-*` to avoid colliding with legacy `text-*` composites. */
export const TEXT_PRESETS: PatternJSON[] = [
  atomPattern(
    'Text',
    'copy-body',
    'Body text',
    'Default readable paragraph.',
    { typography: { typography: 'p1', colorToken: 'text' }, spacing: { margin: { bottomToken: 'md' } } },
    { text: 'Nội dung đoạn văn theo typography của Theme.' },
  ),
  atomPattern(
    'Text',
    'copy-lead',
    'Lead paragraph',
    'Introductory copy with stronger presence.',
    { typography: { typography: 'h3', colorToken: 'text' }, spacing: { margin: { bottomToken: 'md' } } },
    { text: 'Một đoạn mở đầu ngắn gọn, rõ ràng và dễ theo dõi.' },
  ),
  atomPattern(
    'Text',
    'copy-centered',
    'Centered body',
    'Centered supporting paragraph.',
    {
      typography: { typography: 'p1', colorToken: 'text', align: 'center' },
      spacing: { margin: { bottomToken: 'md' } },
    },
    { text: 'Thông điệp ngắn đặt giữa khối nội dung.' },
  ),
  atomPattern(
    'Text',
    'copy-caption',
    'Caption',
    'Small supporting caption text.',
    { typography: { typography: 'p2', colorToken: 'text' }, spacing: { margin: { bottomToken: 'sm' } } },
    { text: 'Chú thích hoặc ghi chú nhỏ dưới nội dung chính.' },
  ),
  atomPattern(
    'Text',
    'copy-accent',
    'Accent copy',
    'Primary-colored short statement.',
    {
      typography: { typography: 'p1', colorToken: 'primary' },
      spacing: { margin: { bottomToken: 'md' } },
    },
    { text: 'Điểm nhấn theo màu thương hiệu của Theme.' },
  ),
  atomPattern(
    'Text',
    'copy-compact',
    'Compact copy',
    'Dense paragraph with tight spacing.',
    { typography: { typography: 'p2', colorToken: 'text' }, spacing: { margin: { bottomToken: 'xs' } } },
    { text: 'Nội dung ngắn, khoảng cách gọn cho bố cục dày.' },
  ),
  atomPattern(
    'Text',
    'copy-surface',
    'Surface body',
    'Paragraph on a padded surface panel.',
    {
      typography: { typography: 'p1', colorToken: 'text' },
      background: { colorToken: 'surface' },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Đoạn văn đặt trên nền surface của Theme, dễ đọc trong bố cục thẻ.' },
  ),
  atomPattern(
    'Text',
    'copy-tint',
    'Tinted note',
    'Soft primary-tinted supporting copy.',
    {
      typography: { typography: 'p2', colorToken: 'surface' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'sm' },
      spacing: padding('sm'),
    },
    { text: 'Ghi chú nhấn nhẹ theo màu primary của Theme.' },
  ),
  atomPattern(
    'Text',
    'copy-bordered',
    'Bordered quote',
    'Body text with a left accent border.',
    {
      typography: { typography: 'p1', colorToken: 'text', fontStyle: 'italic' },
      background: { colorToken: 'surface' },
      border: { ...border, side: 'left', widthToken: 'thick', colorToken: 'primary' },
      spacing: padding('sm'),
    },
    { text: 'Trích dẫn ngắn với đường viền nhấn bên trái.' },
  ),
  atomPattern(
    'Text',
    'copy-pattern',
    'Pattern caption',
    'Caption on a dotted pattern surface.',
    {
      typography: { typography: 'p2', colorToken: 'text', align: 'center' },
      background: {
        colorToken: 'surface',
        pattern: { preset: 'dots', colorToken: 'border', opacity: 0.22, scale: 'sm' },
      },
      radius: { radiusToken: 'sm' },
      spacing: padding('sm'),
    },
    { text: 'Chú thích trên nền họa tiết nhẹ.' },
  ),
  atomPattern(
    'Text',
    'copy-gradient',
    'Gradient lead',
    'Lead paragraph over a soft gradient.',
    {
      typography: { typography: 'h3', colorToken: 'surface', align: 'center' },
      background: {
        mode: 'color',
        gradient: {
          type: 'linear',
          angle: 135,
          stops: [
            { token: 'primary', position: 0 },
            { token: 'accent', position: 100 },
          ],
        },
      },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Đoạn mở đầu nổi bật trên nền gradient Theme.' },
  ),
]

/** Button: 8 presentation presets via UniversalStyle (no Button Engine). */
export const BUTTON_PRESETS: PatternJSON[] = [
  atomPattern(
    'Button',
    'button-primary',
    'Primary button',
    'Filled primary call to action.',
    {
      typography: { typography: 'p1', colorToken: 'surface', align: 'center' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'md' },
      spacing: padding('sm'),
    },
    { text: 'Bắt đầu' },
  ),
  atomPattern(
    'Button',
    'button-secondary',
    'Secondary button',
    'Surface-filled secondary action.',
    {
      typography: { typography: 'p1', colorToken: 'text', align: 'center' },
      background: { colorToken: 'surface' },
      border,
      radius: { radiusToken: 'md' },
      spacing: padding('sm'),
    },
    { text: 'Tìm hiểu thêm' },
  ),
  atomPattern(
    'Button',
    'button-outline',
    'Outline button',
    'Transparent with primary outline.',
    {
      typography: { typography: 'p1', colorToken: 'primary', align: 'center' },
      border: { ...border, colorToken: 'primary' },
      radius: { radiusToken: 'md' },
      spacing: padding('sm'),
    },
    { text: 'Xem chi tiết' },
  ),
  atomPattern(
    'Button',
    'button-pill',
    'Pill button',
    'Soft pill-shaped action.',
    {
      typography: { typography: 'p1', colorToken: 'surface', align: 'center' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'pill' },
      spacing: padding('sm'),
    },
    { text: 'Đăng ký' },
  ),
  atomPattern(
    'Button',
    'button-large',
    'Large CTA',
    'Spacious call-to-action button.',
    {
      typography: { typography: 'h3', colorToken: 'surface', align: 'center' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'lg' },
      spacing: padding('md'),
      shadow: { shadowToken: 'shadowSoft' },
    },
    { text: 'Mua ngay' },
  ),
  atomPattern(
    'Button',
    'button-compact',
    'Compact button',
    'Small dense action control.',
    {
      typography: { typography: 'p2', colorToken: 'surface', align: 'center' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'sm' },
      spacing: padding('xs'),
    },
    { text: 'OK' },
  ),
  atomPattern(
    'Button',
    'button-accent-frame',
    'Accent frame',
    'Thick primary border on surface.',
    {
      typography: { typography: 'p1', colorToken: 'primary', align: 'center' },
      background: { colorToken: 'surface' },
      border: { ...border, colorToken: 'primary', widthToken: 'thick' },
      radius: { radiusToken: 'md' },
      spacing: padding('sm'),
    },
    { text: 'Liên hệ' },
  ),
  atomPattern(
    'Button',
    'button-ghost',
    'Ghost button',
    'Minimal text-like action.',
    {
      typography: { typography: 'p1', colorToken: 'primary', align: 'center' },
      spacing: padding('xs'),
    },
    { text: 'Bỏ qua' },
  ),
]

/** Image: 4 lightweight layout presets (no remote thumbnails). */
export const IMAGE_PRESETS: PatternJSON[] = [
  atomPattern(
    'Image',
    'image-landscape',
    'Landscape image',
    'Widescreen media frame.',
    { radius: { radiusToken: 'sm' } },
    { src: '', alt: '', aspectRatio: '16:9', text: 'Image · 16:9' },
  ),
  atomPattern(
    'Image',
    'image-rounded',
    'Rounded frame',
    'Soft-corner media frame.',
    { radius: { radiusToken: 'lg' }, shadow: { shadowToken: 'shadowSoft' } },
    { src: '', alt: '', aspectRatio: '4:3', text: 'Image · 4:3' },
  ),
  atomPattern(
    'Image',
    'image-banner',
    'Banner image',
    'Wide panoramic media frame.',
    {},
    { src: '', alt: '', aspectRatio: '21:9', text: 'Image · 21:9' },
  ),
  atomPattern(
    'Image',
    'image-framed',
    'Framed image',
    'Bordered media presentation.',
    { border, radius: { radiusToken: 'md' }, spacing: padding('sm'), background: { colorToken: 'surface' } },
    { src: '', alt: '', aspectRatio: '16:9', text: 'Image · framed' },
  ),
]

/** Container (Section): 4 empty layout shells. */
export const CONTAINER_PRESETS: PatternJSON[] = [
  atomPattern(
    'Section',
    'container-surface',
    'Surface container',
    'Padded surface region for nested widgets.',
    { background: { colorToken: 'surface' }, spacing: padding('lg') },
    { content: [], containerWidth: 'full', verticalPadding: 'none' },
  ),
  atomPattern(
    'Section',
    'container-card',
    'Card container',
    'Rounded bordered content shell.',
    {
      background: { colorToken: 'surface' },
      border,
      radius: { radiusToken: 'lg' },
      shadow: { shadowToken: 'shadowSoft' },
      spacing: padding('md'),
    },
    { content: [], containerWidth: 'full', verticalPadding: 'none' },
  ),
  atomPattern(
    'Section',
    'container-narrow',
    'Narrow container',
    'Centered narrow content lane.',
    { spacing: padding('xl') },
    { content: [], containerWidth: 'narrowWidth', verticalPadding: 'none' },
  ),
  atomPattern(
    'Section',
    'container-accent',
    'Accent container',
    'Top-accent framed content region.',
    {
      background: { colorToken: 'surface' },
      border: { ...border, side: 'top', widthToken: 'thick', colorToken: 'primary' },
      spacing: padding('lg'),
    },
    { content: [], containerWidth: 'full', verticalPadding: 'none' },
  ),
]

export const ATOM_PRESETS: PatternJSON[] = [
  ...HEADING_PRESETS,
  ...TEXT_PRESETS,
  ...BUTTON_PRESETS,
  ...IMAGE_PRESETS,
  ...CONTAINER_PRESETS,
]

export function atomPresetCounts() {
  return {
    Heading: HEADING_PRESETS.length,
    Text: TEXT_PRESETS.length,
    Button: BUTTON_PRESETS.length,
    Image: IMAGE_PRESETS.length,
    Container: CONTAINER_PRESETS.length,
  }
}

export function sortLibraryCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    if (a === 'dynamic') return 1
    if (b === 'dynamic') return -1
    const ai = LIBRARY_CATEGORY_ORDER.indexOf(a as (typeof LIBRARY_CATEGORY_ORDER)[number])
    const bi = LIBRARY_CATEGORY_ORDER.indexOf(b as (typeof LIBRARY_CATEGORY_ORDER)[number])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export function atomPriorityIndex(type: string) {
  return ATOM_LIBRARY_PRIORITY.indexOf(type as (typeof ATOM_LIBRARY_PRIORITY)[number])
}

export function sortAtomTypesFirst(types: string[]) {
  return [...types].sort((a, b) => {
    const ai = atomPriorityIndex(a)
    const bi = atomPriorityIndex(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function isAtomWidgetType(type: string) {
  return (ATOM_LIBRARY_PRIORITY as readonly string[]).includes(type)
}

export function isSectionPatternCategory(category: string) {
  return category === 'sections' || category === 'layout'
}
