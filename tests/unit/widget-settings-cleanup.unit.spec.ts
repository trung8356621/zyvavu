import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import { atomEditors } from '@/widgets/atoms/editor'
import { categoryHeaderEditor } from '@/widgets/CategoryHeader/editor'
import { featuredMediaEditor } from '@/widgets/FeaturedMedia/editor'
import { itemImageEditor } from '@/widgets/ItemImage/editor'
import { postTitleEditor } from '@/widgets/PostTitle/editor'
import { sectionEditor } from '@/widgets/Section/editor'
import { textBlockEditor } from '@/widgets/TextBlock/editor'
import { COMPONENT_STYLE_CAPABILITIES } from '@/lib/style-engine/capabilities'
import {
  ATOM_FIELD_OWNERSHIP,
  ATOM_SETTINGS_DICTIONARY,
  ATOM_SETTINGS_LABEL,
} from '@/components/builder/core/atom-settings'

/**
 * Guards Atom Settings ↔ Style Sidebar ownership:
 * Style duplicates leave Atom Settings UI; props/defaultProps remain for saved data.
 */
describe('Atom Settings ownership — Style Sidebar split', () => {
  it('renames Puck Fields plugin to Atom Settings', () => {
    expect(ATOM_SETTINGS_LABEL).toBe('Atom Settings')
    expect(ATOM_SETTINGS_DICTIONARY['plugin-fields']).toBe('Atom Settings')
  })

  it('keeps STYLE fields out of Atom Settings UI when Style Sidebar owns them', () => {
    const stylePreserved = ATOM_FIELD_OWNERSHIP.filter(
      (row) => row.classification === 'STYLE' && row.owner === 'preserved-prop',
    )
    expect(stylePreserved.map((r) => `${r.widget}.${r.field}`).sort()).toEqual(
      [
        'CategoryHeader.align',
        'FeaturedMedia.rounded',
        'ItemImage.borderRadius',
        'PostTitle.align',
        'Section.minHeight',
        'TextBlock.align',
      ].sort(),
    )
  })

  it('removes verified Style duplicates from Settings fields while keeping props', () => {
    expect(postTitleEditor.fields!.align).toBeUndefined()
    expect(postTitleEditor.fields!.tag).toBeDefined()
    expect(postTitleEditor.fields!.style).toBeDefined()
    expect(postTitleEditor.fields!.variant).toBeUndefined()
    expect(postTitleEditor.fields!.text).toBeUndefined()
    expect(postTitleEditor.defaultProps?.align).toBe('left')

    expect(textBlockEditor.fields!.align).toBeUndefined()
    expect(textBlockEditor.fields!.title).toBeDefined()
    expect(textBlockEditor.fields!.content).toBeDefined()
    expect(textBlockEditor.defaultProps?.align).toBe('left')

    expect(categoryHeaderEditor.fields!.align).toBeUndefined()
    expect(categoryHeaderEditor.defaultProps?.align).toBe('left')

    expect(sectionEditor.fields!.minHeight).toBeUndefined()
    expect(sectionEditor.fields!.containerWidth).toBeDefined()
    expect(sectionEditor.fields!.verticalPadding).toBeDefined()
    expect(sectionEditor.defaultProps?.minHeight).toBe('auto')

    expect(featuredMediaEditor.fields!.rounded).toBeUndefined()
    expect(featuredMediaEditor.fields!.aspectRatio).toBeDefined()
    expect(featuredMediaEditor.defaultProps?.rounded).toBe(true)

    expect(itemImageEditor.fields!.borderRadius).toBeUndefined()
    expect(itemImageEditor.fields!.aspectRatio).toBeDefined()
    expect(itemImageEditor.fields!.linkToPost).toBeDefined()
    expect(itemImageEditor.defaultProps?.borderRadius).toBe('4px')
  })

  it('keeps atom Content/Semantic fields; Document Title reuses Heading without Content', () => {
    expect(atomEditors.Heading.config.fields.text).toBeDefined()
    expect(atomEditors.Heading.config.fields.tag).toBeDefined()
    expect(atomEditors.Text.config.fields.text).toBeDefined()
    expect(atomEditors.Button.config.fields.text).toBeDefined()
    expect(atomEditors.Button.config.fields.href).toBeDefined()
    expect(atomEditors.Button.config.fields.newTab).toBeDefined()
    expect(atomEditors.Image.config.fields.src).toBeDefined()
    expect(atomEditors.Image.config.fields.alt).toBeDefined()
    expect(atomEditors.DocumentTitle.config.fields.text).toBeUndefined()
    expect(atomEditors.DocumentTitle.config.fields.tag).toBeDefined()
    expect(atomEditors.DocumentTitle.config.fields.style).toBeDefined()
    expect(atomEditors.CategoryTitle.config.fields.text).toBeUndefined()
    expect(atomEditors.CategoryTitle.config.fields.tag).toBeDefined()
  })

  it('exposes Style Sidebar domains for widgets that lost Settings Style controls', () => {
    expect(COMPONENT_STYLE_CAPABILITIES.PostTitle).toContain('typography')
    expect(COMPONENT_STYLE_CAPABILITIES.TextBlock).toContain('typography')
    expect(COMPONENT_STYLE_CAPABILITIES.CategoryHeader).toContain('typography')
    expect(COMPONENT_STYLE_CAPABILITIES.Section).toContain('dimensions')
    expect(COMPONENT_STYLE_CAPABILITIES.FeaturedMedia).toContain('border')
    expect(COMPONENT_STYLE_CAPABILITIES.ItemImage).toContain('border')
  })
})
