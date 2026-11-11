import { describe, expect, it } from 'vitest'
import {
  RICHTEXT_MARKER,
  buttonLabelEditorContent,
  resolveButtonLabelRender,
  sanitizeButtonLabelHtml,
  serializeButtonLabelFromEditor,
} from '@/components/builder/inline-edit/content-model'
import { getCategoryListPreset } from '@/widgets/CategoryList/presets'
import { resolveListItemStyles } from '@/lib/style-engine/list-presentation'
import { resolveButtonNormalStyles } from '@/lib/style-engine/button-style'
import { generateThemeCss, getActiveThemeConfig } from '@/lib/theme-engine/styles'

describe('Button label TipTap contract', () => {
  it('keeps plain-text labels backward compatible', () => {
    expect(resolveButtonLabelRender('Buy now')).toEqual({ mode: 'plain', plain: 'Buy now' })
    expect(serializeButtonLabelFromEditor('<p>Buy now</p>')).toBe('Buy now')
    expect(buttonLabelEditorContent('Buy now')).toBe('<p>Buy now</p>')
  })

  it('persists B/I/U as marked rich text and strips unsafe markup', () => {
    const stored = serializeButtonLabelFromEditor('<p><strong>Sale</strong> <em>now</em></p>')
    expect(stored.startsWith(RICHTEXT_MARKER)).toBe(true)
    expect(resolveButtonLabelRender(stored)).toEqual({
      mode: 'html',
      html: '<strong>Sale</strong> <em>now</em>',
    })
    expect(
      sanitizeButtonLabelHtml('<p><a href="javascript:alert(1)"><strong>X</strong></a><script>bad</script></p>'),
    ).toBe('<strong>X</strong>')
  })
})

describe('Category list visual presets', () => {
  it('keeps Classic / Compact / Boxed structurally distinct', () => {
    const classic = getCategoryListPreset('classic-tree').listPresentation
    const compact = getCategoryListPreset('compact-tree').listPresentation
    const boxed = getCategoryListPreset('boxed-tree').listPresentation

    expect(classic.indentPx).toBeGreaterThan(compact.indentPx || 0)
    expect(classic.item?.border?.side).toBe('bottom')
    expect(compact.item?.border).toBeUndefined()
    expect(boxed.item?.border?.side).not.toBe('bottom')
    expect(boxed.marker?.mode).toBe('icon')
    expect(classic.itemParent?.typography?.fontWeight).toBe('700')
    expect(compact.container?.border).toBeUndefined()
  })
})

describe('Category list style targets', () => {
  it('resolves CategoryList and Button colors against the current theme variables', () => {
    const style = { background: { mode: 'color' as const, colorToken: 'primary' } }
    const button = resolveButtonNormalStyles({
      version: 1,
      normal: { background: { colorToken: 'primary' } },
    })
    const item = resolveListItemStyles(style)
    expect(item.backgroundColor).toContain('var(--zyvavu-theme-primary')
    expect(button.backgroundColor).toContain('var(--zyvavu-theme-primary')
    expect(item.color).toContain('var(--zyvavu-theme-foreground-on-primary')
    expect(resolveListItemStyles({ ...style, typography: { colorToken: 'textMuted' } }).color)
      .toContain('var(--zyvavu-theme-text-muted')

    const theme = getActiveThemeConfig()
    for (const primary of ['#651419', '#186367']) {
      const css = generateThemeCss({ ...theme, tokens: { ...theme.tokens, colors: { ...theme.tokens.colors, primary } } })
      expect(css).toContain(`--zyvavu-theme-primary: ${primary};`)
    }
  })

  it('writes Parent and Child overrides independently', async () => {
    const { writeCategoryListTargetStyle, readCategoryListTargetStyle } = await import(
      '@/widgets/CategoryList/style-targets'
    )
    const base = getCategoryListPreset('classic-tree').listPresentation
    const withParent = writeCategoryListTargetStyle(base, 'parentItem', {
      typography: { colorToken: 'primary', fontWeight: '700' },
    })
    const withChild = writeCategoryListTargetStyle(withParent, 'childItem', {
      typography: { colorToken: 'textMuted' },
    })
    expect(readCategoryListTargetStyle(withChild, 'parentItem').typography?.colorToken).toBe(
      'primary',
    )
    expect(readCategoryListTargetStyle(withChild, 'childItem').typography?.colorToken).toBe(
      'textMuted',
    )
    expect(withChild.container).toEqual(base.container)
  })
})
