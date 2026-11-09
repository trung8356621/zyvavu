import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: ({ triggerLabel }: { triggerLabel?: string }) => (
    <button type="button">{triggerLabel || 'Media'}</button>
  ),
  BackgroundVideoPresets: [],
}))

vi.mock('@puckeditor/core', () => {
  const state = {
    selectedItem: {
      type: 'Image',
      props: {
        id: 'img-edit-1',
        src: '/pattern-library/media-sample.svg',
        alt: 'Alt',
        caption: 'Cap',
        aspectRatio: '1:1',
        objectFit: 'contain',
        objectPosition: 'top',
        href: 'https://example.com',
        newTab: true,
      },
    },
    getSelectorForId: () => ({ index: 0, zone: 'root:default-zone' }),
    dispatch: vi.fn(),
  }
  return {
    createUsePuck: () => (selector: (s: typeof state) => unknown) => selector(state),
  }
})

import { ATOM_FIELD_OWNERSHIP } from '@/components/builder/core/atom-settings'
import { getStyleModalDomains, orderStyleToolbarDomains } from '@/lib/style-engine/domains'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { atomEditors } from '@/widgets/atoms/editor'
import { ImageEditorPanel } from '@/widgets/atoms/ImageEditorField'
import { isSafeMediaHref } from '@/widgets/atoms/media-props'
import {
  createLinkDraftFromMark,
  resolveLinkMarkFromDraft,
} from '@/components/builder/inline-edit/link-editor-model'

describe('Atom-specific editors (Button / Image)', () => {
  it('Button Fields expose Label only; Design + Link stay outside Fields', () => {
    const fields = atomEditors.Button.config.fields as Record<string, unknown>
    expect(Object.keys(fields)).toEqual(['text'])
    expect((fields.text as { label?: string }).label).toBe('Label')
    expect(fields.href).toBeUndefined()
    expect(fields.newTab).toBeUndefined()
    expect(fields.style).toBeUndefined()
    expect(orderStyleToolbarDomains(getStyleModalDomains('Button'))[0]).toBe('button')
    expect(
      ATOM_FIELD_OWNERSHIP.find((row) => row.widget === 'Button' && row.field === 'style.button')
        ?.owner,
    ).toBe('style-sidebar')
  })

  it('Image Fields use compact Image Editor; link stays ActionBar-owned', () => {
    const fields = atomEditors.Image.config.fields as Record<string, unknown>
    expect(Object.keys(fields)).toEqual(['src'])
    expect((fields.src as { label?: string }).label).toBe('Image')
    expect(fields.href).toBeUndefined()
    expect(fields.aspectRatio).toBeUndefined()

    render(
      <MantineProvider>
        <ImageEditorPanel
          src="/pattern-library/media-sample.svg"
          onChangeSrc={vi.fn()}
        />
      </MantineProvider>,
    )
    expect(screen.getByText('Source')).toBeTruthy()
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Alt text' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Aspect ratio' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Object fit' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Focal position' })).toBeTruthy()
    expect(screen.getByText(/Link opens from the ActionBar/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change image' })).toBeTruthy()
  })

  it('Button/Image link draft maps href + newTab through shared Link model', () => {
    const draft = createLinkDraftFromMark(
      { from: 0, to: 0 },
      { href: 'https://zyvavu.test/page', target: '_blank', rel: null },
    )
    const resolved = resolveLinkMarkFromDraft(draft)
    expect(resolved?.href).toBe('https://zyvavu.test/page')
    expect(resolved?.target).toBe('_blank')
    expect(isSafeMediaHref('javascript:alert(1)')).toBe(false)
  })

  it('Canvas/frontend share Image appearance + Button Design semantics', () => {
    const Image = createAtomRenderer('Image')
    const Button = createAtomRenderer('Button')
    const imageHtml = renderToStaticMarkup(
      <Image
        id="img-1"
        src="/pattern-library/media-sample.svg"
        alt="Demo"
        caption="Cap"
        href="https://example.com"
        newTab
        aspectRatio="16:9"
        objectFit="cover"
        objectPosition="center"
      />,
    )
    expect(imageHtml).toContain('object-fit:cover')
    expect(imageHtml).toContain('href="https://example.com"')
    expect(imageHtml).toMatch(/aspect-ratio:\s*16\s*\/\s*9/)

    const buttonHtml = renderToStaticMarkup(
      <Button
        id="btn-1"
        text="Shop"
        href="/shop"
        style={{
          button: {
            version: 1,
            normal: { preset: 'theme', radius: { radiusToken: 'md' } },
            hover: { transform: 'lift' },
          },
        }}
      />,
    )
    expect(buttonHtml).toContain('Shop')
    expect(buttonHtml).toContain('zyvavu-styled-button')
    expect(buttonHtml).toContain('--zyvavu-btn-hover-transform')
  })

  it('Heading/Text Fields stay typography-owned; bound titles stay content-free', () => {
    expect(Object.keys(atomEditors.Heading.config.fields as object)).toEqual(
      expect.arrayContaining(['text', 'tag', 'style']),
    )
    expect(Object.keys(atomEditors.Text.config.fields as object)).toEqual(
      expect.arrayContaining(['text', 'style']),
    )
    expect(atomEditors.DocumentTitle.config.fields).not.toHaveProperty('text')
    expect(atomEditors.CategoryTitle.config.fields).not.toHaveProperty('text')
  })
})
