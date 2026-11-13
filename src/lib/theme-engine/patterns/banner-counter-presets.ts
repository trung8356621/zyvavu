import type { PatternJSON } from './json'
import { collectPatternTokens } from './json'

const HERO_A = 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80'
const HERO_B = 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80'
const HERO_C = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80'
const EDIT_A = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80'
const EDIT_B = 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80'
const MIN_A = 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80'
const MIN_B = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80'

function slide(
  id: string,
  image: string,
  title: string,
  body: string,
  cta: string,
  opts?: { fullBleed?: boolean; minimal?: boolean },
) {
  const content = opts?.minimal
    ? [
        {
          type: 'Image',
          props: {
            id: `${id}-image`,
            src: image,
            alt: title,
            aspectRatio: '21:9',
            objectFit: 'cover',
            style: { radius: { radiusToken: 'md' } },
          },
        },
      ]
    : [
        {
          type: 'Image',
          props: {
            id: `${id}-image`,
            src: image,
            alt: title,
            aspectRatio: opts?.fullBleed ? '21:9' : '16:9',
            objectFit: 'cover',
            style: { radius: { radiusToken: 'md' } },
          },
        },
        {
          type: 'Heading',
          props: {
            id: `${id}-title`,
            text: title,
            tag: 'h2',
            style: {
              typography: { typography: 'h2', colorToken: 'text' },
              spacing: { margin: { topToken: 'md', bottomToken: 'sm' } },
            },
          },
        },
        {
          type: 'Heading',
          props: {
            id: `${id}-body`,
            text: body,
            tag: 'p',
            style: {
              typography: { typography: 'p1', colorToken: 'textMuted' },
              spacing: { margin: { bottomToken: 'md' } },
            },
          },
        },
        {
          type: 'Button',
          props: {
            id: `${id}-cta`,
            text: cta,
            href: '#',
            style: {
              typography: { typography: 'p1', align: 'left' },
              spacing: { padding: { token: 'sm' } },
              button: {
                version: 1,
                normal: { preset: 'theme', radius: { radiusToken: 'md' } },
                hover: { opacity: 0.9 },
              },
            },
          },
        },
      ]

  return {
    type: 'SlideItem',
    props: {
      id,
      style: {
        background: { mode: 'color', colorToken: 'surface' },
        spacing: { padding: { token: opts?.minimal ? 'sm' : 'lg' } },
      },
      content,
    },
  }
}

function pattern(
  id: string,
  name: string,
  description: string,
  widgetType: string,
  category: string,
  content: PatternJSON['payload']['content'],
): PatternJSON {
  const payload = { content, zones: {} }
  return {
    schemaVersion: 1,
    id,
    name,
    description,
    category,
    widgetType,
    source: 'system',
    version: 1,
    payload,
    theme: { tokens: collectPatternTokens(payload) },
  }
}

export const BANNER_SLIDER_PRESETS: PatternJSON[] = [
  pattern(
    'banner-slider-hero',
    'Hero Image Slider',
    'Full-width hero slides with heading, copy, CTA, arrows and dots.',
    'BannerSlider',
    'bannerSlider',
    [
      {
        type: 'BannerSlider',
        props: {
          id: 'banner-slider-hero-root',
          autoplay: true,
          intervalMs: 5000,
          loop: true,
          showArrows: true,
          showPagination: true,
          paginationMode: 'dots',
          slides: [
            slide('hero-slide-1', HERO_A, 'Build stories that travel', 'Hero messaging with a clear call to action.', 'Explore', {
              fullBleed: true,
            }),
            slide('hero-slide-2', HERO_B, 'Design with Theme tokens', 'Keep color and type aligned to Theme Customize.', 'Learn more', {
              fullBleed: true,
            }),
            slide('hero-slide-3', HERO_C, 'Publish with confidence', 'Reusable slides inside Section → BannerSlider.', 'Get started', {
              fullBleed: true,
            }),
          ],
        },
      },
    ],
  ),
  pattern(
    'banner-slider-editorial',
    'Editorial Featured Slider',
    'Editorial image + typography composition for blog features.',
    'BannerSlider',
    'bannerSlider',
    [
      {
        type: 'BannerSlider',
        props: {
          id: 'banner-slider-editorial-root',
          autoplay: false,
          loop: true,
          showArrows: true,
          showPagination: true,
          paginationMode: 'numbers',
          slides: [
            slide('editorial-slide-1', EDIT_A, 'Featured essay', 'A quieter carousel for long-form highlights.', 'Read feature'),
            slide('editorial-slide-2', EDIT_B, 'Studio notes', 'Typography follows Theme heading and body tokens.', 'View notes'),
          ],
        },
      },
    ],
  ),
  pattern(
    'banner-slider-minimal',
    'Minimal Image Slider',
    'Image-focused slides with clean pagination and minimal chrome.',
    'BannerSlider',
    'bannerSlider',
    [
      {
        type: 'BannerSlider',
        props: {
          id: 'banner-slider-minimal-root',
          autoplay: true,
          intervalMs: 4000,
          loop: true,
          showArrows: false,
          showPagination: true,
          paginationMode: 'dots',
          slides: [
            slide('minimal-slide-1', MIN_A, 'Horizon', '', '', { minimal: true }),
            slide('minimal-slide-2', MIN_B, 'Forest light', '', '', { minimal: true }),
          ],
        },
      },
    ],
  ),
]

function counterNode(
  id: string,
  target: number,
  suffix: string,
  label: string,
  opts?: { prefix?: string; typography?: string },
) {
  return {
    type: 'AnimatedCounter',
    props: {
      id,
      targetValue: target,
      durationMs: 1600,
      prefix: opts?.prefix || '',
      suffix,
      decimals: 0,
      useGrouping: true,
      triggerOnce: true,
      label,
      style: {
        typography: {
          typography: opts?.typography || 'h1',
          colorToken: 'text',
          align: 'center',
        },
        spacing: { padding: { token: 'sm' } },
      },
    },
  }
}

export const ANIMATED_COUNTER_PRESETS: PatternJSON[] = [
  pattern(
    'counter-single-highlight',
    'Single Highlight Counter',
    'One large statistic with a descriptive caption.',
    'AnimatedCounter',
    'animatedCounter',
    [counterNode('counter-single-root', 1280, '+', 'Projects delivered', { typography: 'h1' })],
  ),
  pattern(
    'counter-stats-row',
    'Statistics Row',
    'Three counters in equal columns for corporate or blog stats.',
    'Columns',
    'animatedCounter',
    [
      {
        type: 'Columns',
        props: {
          id: 'counter-stats-columns',
          distribution: '1:1:1',
          style: { spacing: { gapToken: 'md' } },
          column1: [counterNode('counter-stats-a', 12, 'k', 'Monthly readers')],
          column2: [counterNode('counter-stats-b', 86, '%', 'Satisfaction')],
          column3: [counterNode('counter-stats-c', 40, '+', 'Contributors')],
        },
      },
    ],
  ),
  pattern(
    'counter-editorial-milestone',
    'Editorial Milestone',
    'Prominent number with restrained accent padding for milestones.',
    'AnimatedCounter',
    'animatedCounter',
    [
      {
        type: 'AnimatedCounter',
        props: {
          id: 'counter-milestone-root',
          targetValue: 10,
          durationMs: 1400,
          prefix: '',
          suffix: ' years',
          decimals: 0,
          useGrouping: false,
          triggerOnce: true,
          label: 'Publishing milestones',
          style: {
            typography: { typography: 'h1', colorToken: 'primary', align: 'center' },
            background: { mode: 'color', colorToken: 'surface' },
            spacing: { padding: { token: 'lg' } },
            border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
            radius: { radiusToken: 'lg' },
          },
        },
      },
    ],
  ),
]
