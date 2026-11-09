import { describe, expect, it } from 'vitest'
import {
  LINK_DESTINATIONS,
  LINK_DESTINATION_SUPPORT,
  canApplyLinkDraft,
  createLinkDraftFromMark,
  defaultTargetForDestination,
  inferDestinationFromHref,
  isDestinationEnabled,
  resolveLinkMarkFromDraft,
  switchLinkDestination,
  type LinkEditorDraft,
} from '@/components/builder/inline-edit/link-editor-model'
import { sanitizeHref } from '@/components/builder/inline-edit/content-model'

function baseDraft(partial: Partial<LinkEditorDraft> = {}): LinkEditorDraft {
  return {
    from: 1,
    to: 4,
    destination: 'none',
    target: '_self',
    rel: [],
    ...partial,
  }
}

describe('link editor model — 9 destinations', () => {
  it('lists all 9 PO destinations', () => {
    expect(LINK_DESTINATIONS).toEqual([
      'none',
      'page',
      'web',
      'section',
      'edge',
      'document',
      'email',
      'phone',
      'popup',
    ])
  })

  it('enables only destinations with existing Zyvavu support', () => {
    expect(isDestinationEnabled('none')).toBe(true)
    expect(isDestinationEnabled('page')).toBe(true)
    expect(isDestinationEnabled('web')).toBe(true)
    expect(isDestinationEnabled('email')).toBe(true)
    expect(isDestinationEnabled('phone')).toBe(true)
    expect(isDestinationEnabled('section')).toBe(false)
    expect(isDestinationEnabled('edge')).toBe(false)
    expect(isDestinationEnabled('document')).toBe(false)
    expect(isDestinationEnabled('popup')).toBe(false)
    expect(LINK_DESTINATION_SUPPORT.section.unavailableReason).toBeTruthy()
    expect(LINK_DESTINATION_SUPPORT.document.unavailableReason).toBeTruthy()
    expect(LINK_DESTINATION_SUPPORT.popup.unavailableReason).toBeTruthy()
    expect(LINK_DESTINATION_SUPPORT.edge.unavailableReason).toBeTruthy()
  })

  it('infers destination from href', () => {
    expect(inferDestinationFromHref('')).toBe('none')
    expect(inferDestinationFromHref('/about')).toBe('page')
    expect(inferDestinationFromHref('https://example.com')).toBe('web')
    expect(inferDestinationFromHref('mailto:a@b.com')).toBe('email')
    expect(inferDestinationFromHref('tel:+84123')).toBe('phone')
  })

  it('defaults Web to new tab and Page to current window', () => {
    expect(defaultTargetForDestination('web')).toBe('_blank')
    expect(defaultTargetForDestination('page')).toBe('_self')
  })

  it('gates Apply — unsupported destinations never apply', () => {
    expect(canApplyLinkDraft(baseDraft({ destination: 'none' }))).toBe(true)
    expect(canApplyLinkDraft(baseDraft({ destination: 'page' }))).toBe(false)
    expect(
      canApplyLinkDraft(baseDraft({ destination: 'page', pagePath: '/about' })),
    ).toBe(true)
    expect(
      canApplyLinkDraft(baseDraft({ destination: 'web', url: 'https://x.test' })),
    ).toBe(true)
    expect(canApplyLinkDraft(baseDraft({ destination: 'section' }))).toBe(false)
    expect(canApplyLinkDraft(baseDraft({ destination: 'edge', edge: 'top' }))).toBe(false)
    expect(
      canApplyLinkDraft(baseDraft({ destination: 'document', documentUrl: '/x.pdf' })),
    ).toBe(false)
    expect(canApplyLinkDraft(baseDraft({ destination: 'popup', popupId: '1' }))).toBe(false)
  })

  it('destination switch preserves web/email fields and clears page picker', () => {
    const fromPage = switchLinkDestination(
      baseDraft({
        destination: 'page',
        pageId: '9',
        pagePath: '/about',
        pageTitle: 'About',
        url: 'https://kept.test',
        email: 'a@b.com',
      }),
      'web',
    )
    expect(fromPage.destination).toBe('web')
    expect(fromPage.pageId).toBeNull()
    expect(fromPage.pagePath).toBeNull()
    expect(fromPage.url).toBe('https://kept.test')
    expect(fromPage.email).toBe('a@b.com')
    expect(fromPage.target).toBe('_blank')
  })

  it('does not resolve placeholder URLs for unsupported destinations', () => {
    expect(resolveLinkMarkFromDraft(baseDraft({ destination: 'section' }))).toBeNull()
    expect(resolveLinkMarkFromDraft(baseDraft({ destination: 'popup' }))).toBeNull()
    expect(
      resolveLinkMarkFromDraft(
        baseDraft({ destination: 'page', pagePath: '/pricing', target: '_self' }),
      ),
    ).toEqual({
      href: '/pricing',
      target: null,
      rel: null,
      unset: false,
    })
  })

  it('reopens from existing mark snapshot', () => {
    const draft = createLinkDraftFromMark(
      { from: 2, to: 8 },
      {
        href: 'https://wix.test',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    )
    expect(draft.destination).toBe('web')
    expect(draft.url).toBe('https://wix.test')
    expect(draft.target).toBe('_blank')
    expect(draft.rel).toEqual(['noopener', 'noreferrer'])
  })

  it('allows tel/mailto href in sanitizer and rejects javascript', () => {
    expect(sanitizeHref('tel:+84123')).toBe('tel:+84123')
    expect(sanitizeHref('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(sanitizeHref('javascript:alert(1)')).toBeNull()
  })

  it('Cancel contract — draft discard leaves resolved mark null for unsupported switches', () => {
    // UI Accordion.Control is disabled for unsupported destinations; Apply also gated.
    const stuck = switchLinkDestination(
      baseDraft({ destination: 'web', url: 'https://keep.test' }),
      'section',
    )
    expect(stuck.destination).toBe('section')
    expect(resolveLinkMarkFromDraft(stuck)).toBeNull()
    expect(canApplyLinkDraft(stuck)).toBe(false)
  })
})
