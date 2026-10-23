import React from 'react'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import type { CustomField } from '@puckeditor/core'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: ({ onSelect }: { onSelect: (media: unknown) => void }) => (
    <button onClick={() => onSelect({ id: 7, url: '/media/chosen.webp' })}>Select media</button>
  ),
}))
import { widgetLibraryCategory } from '@/components/admin/theme-builder/WidgetPatternLibrary'
import { atomEditors } from '@/widgets/atoms/editor'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { featuredMediaEditor } from '@/widgets/FeaturedMedia/editor'
import { FeaturedMediaFrontend } from '@/widgets/FeaturedMedia/frontend'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { collectTemplateWidgets } from '@/lib/theme-engine/widget-contracts'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'
import { DEMO_MEDIA } from '@/lib/media/demo-catalog'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

afterEach(cleanup)
const Image = createAtomRenderer('Image')

describe('Image builder contract', () => {
  it.each([
    ['Section', 'sections'], ['Columns', 'layout'], ['Heading', 'text'],
    ['Text', 'text'], ['TextBlock', 'text'], ['Image', 'images'], ['Button', 'buttons'],
    ['DocumentFeaturedMedia', 'dynamic'],
  ])('categorizes %s as %s', (type, category) => {
    expect(widgetLibraryCategory(type)).toBe(category)
  })

  it.each(['home', 'single', 'page', 'category'] as const)('allows Image in %s', (context) => {
    expect(getEditorConfigForContext(context).components.Image).toBeDefined()
  })

  it('uses the shared picker to replace src, removes it, and respects readOnly', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const field = atomEditors.Image.config.fields.src as CustomField<string>
    const Field = field.render
    const onChange = vi.fn()
    const props = { value: '/old.webp', onChange, name: 'src', id: 'src', field }
    const view = render(<MantineProvider><Field {...props} /></MantineProvider>)
    fireEvent.click(screen.getByText('Select media'))
    expect(onChange).toHaveBeenLastCalledWith('/media/chosen.webp')
    fireEvent.click(screen.getByText('Remove image'))
    expect(onChange).toHaveBeenLastCalledWith('')
    view.rerender(<MantineProvider><Field {...props} readOnly /></MantineProvider>)
    expect(screen.queryByText('Select media')).toBeNull()
    expect(screen.queryByText('Remove image')).toBeNull()
    vi.unstubAllGlobals()
  })

  it('renders static src and alt through SSR after JSON persistence', () => {
    const document: ThemeTemplateDocument = {
      version: 1, template: 'home', root: { props: {} },
      content: [{ type: 'Image', props: { id: 'image', src: '/saved.webp', alt: 'Saved illustration' } }],
    }
    const html = renderToStaticMarkup(<ThemeRenderer document={JSON.parse(JSON.stringify(document))} />)
    expect(html).toContain('src="/saved.webp"')
    expect(html).toContain('alt="Saved illustration"')
    expect(html).toContain('max-width:100%')
    expect(html).toContain('border-radius:inherit')
    expect(renderToStaticMarkup(<Image />)).toContain('Image not configured')
  })

  it('keeps document media dynamic without a static picker', () => {
    expect(atomEditors.DocumentFeaturedMedia.config.fields).toEqual({})
    expect(featuredMediaEditor.fields).not.toHaveProperty('src')
    expect(renderToStaticMarkup(featuredMediaEditor.render({} as never))).toContain('Image loads from the document')
    const DocumentMedia = createAtomRenderer('DocumentFeaturedMedia')
    for (const key of ['featuredImage', 'image', 'media']) {
      const dataContext = { type: 'single' as const, document: { [key]: { url: '/document.webp', alt: 'Document image' } } }
      for (const Component of [FeaturedMediaFrontend, DocumentMedia]) {
        const html = renderToStaticMarkup(<Component dataContext={dataContext} />)
        expect(html).toContain('src="/document.webp"')
        expect(html).toContain('alt="Document image"')
      }
    }
    expect(renderToStaticMarkup(<DocumentMedia src="/static.webp" />)).toBe('')
  })

  it('validates every bundled template and keeps sample media static only on home', () => {
    for (const theme of ['default', 'corporate', 'editorial', 'industrial']) {
      const directory = resolve('src/themes', theme, 'templates')
      for (const file of readdirSync(directory).filter((name) => name.endsWith('.json'))) {
        const document = JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as ThemeTemplateDocument
        expect(validateThemeTemplateDocument(document, document.template).errors, `${theme}/${file}`).toEqual([])
        const widgets = collectTemplateWidgets(document)
        if (file === 'home.json') {
          expect(widgets.some((node) => ['FeaturedMedia', 'DocumentFeaturedMedia'].includes(node.type))).toBe(false)
          if (['editorial', 'industrial'].includes(theme)) {
            const images = widgets.filter((node) => node.type === 'Image')
            expect(images.length).toBeGreaterThan(0)
            for (const image of images) {
              expect(DEMO_MEDIA.some((asset) => asset.sourceURL === image.props.src)).toBe(true)
              expect(image.props.alt).toBeTruthy()
              expect(renderToStaticMarkup(<Image {...image.props} />)).toContain(String(image.props.src).replaceAll('&', '&amp;'))
            }
          }
        }
        if (file === 'single.json') expect(widgets.some((node) => node.type === 'FeaturedMedia')).toBe(true)
      }
    }
  })
})
