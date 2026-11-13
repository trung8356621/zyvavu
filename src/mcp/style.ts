import { ANIMATION_PRESETS } from '@/lib/style-engine/animation-presets'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { boolean, fields, list, number, options, string, type Shape } from './shape'

const align = options('left', 'center', 'right', 'justify')
const width = options('containerWidth', 'narrowWidth', 'wideWidth', 'full')
const height = options('auto', 'screen', 'sm', 'md', 'lg')
const pad = { token: string, topToken: string, bottomToken: string }
const spacing = fields({
  padding: fields({ ...pad, leftToken: string, rightToken: string }),
  margin: fields(pad),
  gapToken: string,
})
const responsiveTypography = { fontSize: string, lineHeight: string, align }
const typography = fields({
  ...responsiveTypography, typography: string, colorToken: string, effectPreset: string,
  letterSpacing: string, verticalText: boolean, fontFamily: string, fontWeight: string,
  fontStyle: string, textDecoration: string, textTransform: string,
})
const breakpoint = fields({ typography: fields(responsiveTypography), spacing, align })
const overlay = fields({ colorToken: string, opacity: number })
const pattern = fields({ preset: string, colorToken: string, opacity: number, scale: string })
const borderSide = {
  style: options('none', 'solid', 'dashed', 'dotted'),
  widthToken: string,
  colorToken: string,
  side: options('all', 'top', 'right', 'bottom', 'left'),
}
const border = fields({
  ...borderSide, linked: boolean,
  sides: fields(Object.fromEntries(['top', 'right', 'bottom', 'left'].map((key) => [key, fields(borderSide)]))),
})
const radius = fields({
  radiusToken: string, linked: boolean,
  corners: fields({ topLeft: string, topRight: string, bottomLeft: string, bottomRight: string }),
})
const shadow = fields({ layers: list(string), shadowToken: string })
const solid = fields({ colorToken: string, mode: options('color') })

// The Phase 1 input boundary describes verified override shapes. The application
// validator owns semantic checks such as preset choices and numeric ranges.
export const styleShapes = {
  animation: fields({
    preset: options(...ANIMATION_PRESETS.map(({ id }) => id)),
    trigger: options('entrance', 'loop', 'scroll', 'hover'),
    target: options('widget', 'section', 'dropdown'),
    options: fields({
      duration: options('fast', 'normal', 'slow'), durationSec: number, delaySec: number,
      direction: options('vertical', 'horizontal', 'up', 'down', 'left', 'right'),
      distancePx: number, loopDelaySec: number,
    }),
  }, ['preset', 'trigger', 'target']),
  background: fields({
    mode: options('color', 'image', 'video'), colorToken: string, pattern,
    gradient: fields({
      type: options('linear', 'radial'), angle: number,
      stops: list(fields({ token: string, position: number, opacity: number }, ['token', 'position'])),
    }, ['type', 'angle', 'stops']),
    mesh: fields({
      points: list(fields({ id: string, token: string, x: number, y: number, radius: number, opacity: number },
        ['id', 'token', 'x', 'y'])),
    }, ['points']),
    image: fields({
      url: string, position: string, size: string, repeat: string, fallbackColorToken: string,
      overlay, pattern,
    }),
    video: fields({
      url: string, posterUrl: string, loop: boolean, muted: boolean, autoplay: boolean,
      fallbackImageUrl: string, fallbackColorToken: string, position: string, overlay,
    }),
  }),
  typography,
  border,
  radius,
  spacing,
  shadow,
  dimensions: fields({
    containerWidth: width, minHeight: height, align,
    contentAlign: options('start', 'center', 'end', 'stretch'),
  }),
  section: fields({
    containerWidth: width, minHeight: height, breakout: boolean,
    verticalPadding: options('none', 'xs', 'sm', 'md', 'lg', 'xl'),
  }),
  effects: fields({
    opacity: number, backdropBlur: options('none', 'sm', 'md', 'lg'),
    blendMode: options('normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'),
  }),
  responsive: fields({ tablet: breakpoint, mobile: breakpoint }),
  button: fields({
    version: options(1),
    normal: fields({ preset: string, background: solid, text: typography, border, radius, shadow }),
    hover: fields({
      background: solid, text: fields({ colorToken: string }), border: fields({ colorToken: string }),
      shadow, opacity: number, transform: string,
    }),
  }, ['version']),
} satisfies Partial<Record<keyof UniversalStyle, Shape>>

export const unsupportedStyles = ['legacy flat styles', 'background media IDs', 'button icon and layout']
