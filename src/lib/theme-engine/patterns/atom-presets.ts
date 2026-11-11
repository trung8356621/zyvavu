import type { UniversalStyle } from '@/lib/style-engine/types'
import type { PatternJSON } from './json'
import { collectPatternTokens } from './json'

/** Core atoms shown first in the Widget Library (Patterns category excluded). */
export const ATOM_LIBRARY_PRIORITY = ['Heading', 'Button', 'Image', 'Video'] as const
/** Legacy Text remains renderable but is hidden from new library insertions. */
export const LIBRARY_HIDDEN_ATOM_TYPES = ['Text'] as const

export const LIBRARY_CATEGORY_ORDER = [
  'text',
  'buttons',
  'media',
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
      : type === 'Image' || type === 'Video'
        ? 'media'
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

/**
 * Body/copy presets — insert unified Heading with HTML Tag P.
 * IDs keep `copy-*` for compatibility; widget type is Heading (Text hidden from library).
 */
export const TEXT_PRESETS: PatternJSON[] = [
  atomPattern(
    'Heading',
    'copy-body',
    'Body text',
    'Default readable paragraph.',
    { typography: { typography: 'p1', colorToken: 'text' }, spacing: { margin: { bottomToken: 'md' } } },
    { text: 'Nội dung đoạn văn theo typography của Theme.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-lead',
    'Lead paragraph',
    'Introductory copy with stronger presence.',
    { typography: { typography: 'h3', colorToken: 'text' }, spacing: { margin: { bottomToken: 'md' } } },
    { text: 'Một đoạn mở đầu ngắn gọn, rõ ràng và dễ theo dõi.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-centered',
    'Centered body',
    'Centered supporting paragraph.',
    {
      typography: { typography: 'p1', colorToken: 'text', align: 'center' },
      spacing: { margin: { bottomToken: 'md' } },
    },
    { text: 'Thông điệp ngắn đặt giữa khối nội dung.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-caption',
    'Caption',
    'Small supporting caption text.',
    { typography: { typography: 'p2', colorToken: 'text' }, spacing: { margin: { bottomToken: 'sm' } } },
    { text: 'Chú thích hoặc ghi chú nhỏ dưới nội dung chính.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-accent',
    'Accent copy',
    'Primary-colored short statement.',
    {
      typography: { typography: 'p1', colorToken: 'primary' },
      spacing: { margin: { bottomToken: 'md' } },
    },
    { text: 'Điểm nhấn theo màu thương hiệu của Theme.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-compact',
    'Compact copy',
    'Dense paragraph with tight spacing.',
    { typography: { typography: 'p2', colorToken: 'text' }, spacing: { margin: { bottomToken: 'xs' } } },
    { text: 'Nội dung ngắn, khoảng cách gọn cho bố cục dày.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-surface',
    'Surface body',
    'Paragraph on a padded surface panel.',
    {
      typography: { typography: 'p1', colorToken: 'text' },
      background: { colorToken: 'surface' },
      radius: { radiusToken: 'md' },
      spacing: padding('md'),
    },
    { text: 'Đoạn văn đặt trên nền surface của Theme, dễ đọc trong bố cục thẻ.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-tint',
    'Tinted note',
    'Soft primary-tinted supporting copy.',
    {
      typography: { typography: 'p2', colorToken: 'surface' },
      background: { colorToken: 'primary' },
      radius: { radiusToken: 'sm' },
      spacing: padding('sm'),
    },
    { text: 'Ghi chú nhấn nhẹ theo màu primary của Theme.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
    'copy-bordered',
    'Bordered quote',
    'Body text with a left accent border.',
    {
      typography: { typography: 'p1', colorToken: 'text', fontStyle: 'italic' },
      background: { colorToken: 'surface' },
      border: { ...border, side: 'left', widthToken: 'thick', colorToken: 'primary' },
      spacing: padding('sm'),
    },
    { text: 'Trích dẫn ngắn với đường viền nhấn bên trái.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
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
    { text: 'Chú thích trên nền họa tiết nhẹ.', tag: 'p' },
  ),
  atomPattern(
    'Heading',
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
    { text: 'Đoạn mở đầu nổi bật trên nền gradient Theme.', tag: 'p' },
  ),
]

/** Button presets — reuse Button renderer + Button Design V1 (`style.button`) + theme tokens. */
export const BUTTON_PRESETS: PatternJSON[] = [
  atomPattern(
    'Button',
    'button-default',
    'Default Button',
    'Theme filled default action.',
    {
      typography: { typography: 'p1', align: 'center' },
      spacing: padding('sm'),
      button: {
        version: 1,
        normal: { preset: 'theme', radius: { radiusToken: 'md' } },
        hover: { transform: 'lift', opacity: 0.92 },
      },
    },
    { text: 'Button' },
  ),
  atomPattern(
    'Button',
    'button-primary',
    'Filled',
    'Filled primary call to action.',
    {
      typography: { typography: 'p1', align: 'center' },
      spacing: padding('sm'),
      button: {
        version: 1,
        normal: {
          preset: 'theme',
          radius: { radiusToken: 'md' },
          shadow: { shadowToken: 'shadowSoft' },
        },
        hover: { transform: 'lift' },
      },
    },
    { text: 'Bắt đầu' },
  ),
  atomPattern(
    'Button',
    'button-outline',
    'Outline',
    'Transparent with primary outline.',
    {
      typography: { typography: 'p1', align: 'center' },
      spacing: padding('sm'),
      button: {
        version: 1,
        normal: { preset: 'outline', radius: { radiusToken: 'md' } },
        hover: {
          background: { mode: 'color', colorToken: 'primary' },
          text: { colorToken: 'surface' },
        },
      },
    },
    { text: 'Xem chi tiết' },
  ),
  atomPattern(
    'Button',
    'button-soft',
    'Soft',
    'Soft surface fill with light border.',
    {
      typography: { typography: 'p1', colorToken: 'text', align: 'center' },
      spacing: padding('sm'),
      button: {
        version: 1,
        normal: {
          background: { mode: 'color', colorToken: 'surface' },
          border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
          radius: { radiusToken: 'md' },
        },
        hover: { background: { mode: 'color', colorToken: 'background' } },
      },
    },
    { text: 'Tìm hiểu thêm' },
  ),
  atomPattern(
    'Button',
    'button-pill',
    'Rounded',
    'Pill-shaped filled action.',
    {
      typography: { typography: 'p1', align: 'center' },
      spacing: padding('sm'),
      button: {
        version: 1,
        normal: { preset: 'theme', radius: { radiusToken: 'pill' } },
        hover: { transform: 'grow' },
      },
    },
    { text: 'Đăng ký' },
  ),
  atomPattern(
    'Button',
    'button-large',
    'CTA',
    'Spacious call-to-action button.',
    {
      typography: { typography: 'h3', align: 'center' },
      spacing: padding('md'),
      button: {
        version: 1,
        normal: {
          preset: 'theme',
          radius: { radiusToken: 'lg' },
          shadow: { shadowToken: 'shadowMedium' },
        },
        hover: { transform: 'lift', opacity: 0.95 },
      },
    },
    { text: 'Mua ngay' },
  ),
  atomPattern(
    'Button',
    'button-compact',
    'Compact',
    'Small dense action control.',
    {
      typography: { typography: 'p2', align: 'center' },
      spacing: padding('xs'),
      button: {
        version: 1,
        normal: { preset: 'theme', radius: { radiusToken: 'sm' } },
      },
    },
    { text: 'OK' },
  ),
  atomPattern(
    'Button',
    'button-ghost',
    'Ghost',
    'Minimal text-like action.',
    {
      typography: { typography: 'p1', colorToken: 'primary', align: 'center' },
      spacing: padding('xs'),
      button: {
        version: 1,
        normal: { radius: { radiusToken: 'sm' } },
        hover: { opacity: 0.8 },
      },
    },
    { text: 'Bỏ qua' },
  ),
]

/** Image presets store presentation only. Sample media belongs to the library preview. */
export const IMAGE_PRESETS: PatternJSON[] = [
  atomPattern(
    'Image',
    'image-landscape',
    'Landscape image',
    'Widescreen media frame.',
    { radius: { radiusToken: 'sm' } },
    { aspectRatio: '16:9', objectFit: 'cover' },
  ),
  atomPattern(
    'Image',
    'image-square',
    'Square image',
    'Equal crop for galleries and avatars.',
    { radius: { radiusToken: 'md' } },
    { aspectRatio: '1:1', objectFit: 'cover' },
  ),
  atomPattern(
    'Image',
    'image-portrait',
    'Portrait image',
    'Tall media frame for people and products.',
    { radius: { radiusToken: 'sm' } },
    { aspectRatio: '3:4', objectFit: 'cover' },
  ),
  atomPattern(
    'Image',
    'image-rounded',
    'Rounded frame',
    'Soft-corner media frame.',
    { radius: { radiusToken: 'lg' }, shadow: { shadowToken: 'shadowSoft' } },
    { aspectRatio: '4:3', objectFit: 'cover' },
  ),
  atomPattern(
    'Image',
    'image-banner',
    'Banner image',
    'Wide panoramic media frame.',
    {},
    { aspectRatio: '21:9', objectFit: 'cover' },
  ),
  atomPattern(
    'Image',
    'image-framed',
    'Framed image',
    'Bordered media presentation.',
    {
      border,
      radius: { radiusToken: 'md' },
      spacing: padding('sm'),
      background: { colorToken: 'surface' },
    },
    { aspectRatio: '16:9', objectFit: 'contain' },
  ),
]

/** Video: lightweight library cards — never autoplay in preview (defaultProps). */
export const VIDEO_PRESETS: PatternJSON[] = [
  atomPattern(
    'Video',
    'video-standard',
    'Standard video',
    'Muted controls, 16:9 frame. Select a real Media Library video after insert.',
    { radius: { radiusToken: 'md' } },
    {
      src: '',
      alt: 'Video',
      aspectRatio: '16:9',
      objectFit: 'cover',
      controls: true,
      autoplay: false,
      muted: true,
      loop: false,
    },
  ),
  atomPattern(
    'Video',
    'video-square',
    'Square video',
    'Square frame for short-form clips. No library autoplay.',
    { radius: { radiusToken: 'lg' }, shadow: { shadowToken: 'shadowSoft' } },
    {
      src: '',
      alt: 'Square video',
      aspectRatio: '1:1',
      objectFit: 'cover',
      controls: true,
      autoplay: false,
      muted: true,
    },
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
  ...VIDEO_PRESETS,
  ...CONTAINER_PRESETS,
]

export function atomPresetCounts() {
  return {
    Heading: HEADING_PRESETS.length + TEXT_PRESETS.length,
    /** Legacy Text type hidden from library; body presets now insert Heading+P. */
    Text: 0,
    Button: BUTTON_PRESETS.length,
    Image: IMAGE_PRESETS.length,
    Video: VIDEO_PRESETS.length,
    Container: CONTAINER_PRESETS.length,
  }
}

export function isLibraryHiddenAtomType(type: string) {
  return (LIBRARY_HIDDEN_ATOM_TYPES as readonly string[]).includes(type)
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
