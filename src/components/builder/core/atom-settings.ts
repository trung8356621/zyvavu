import type { Dictionary } from '@puckeditor/core'

/**
 * Puck Fields plugin is the official Atom Settings panel.
 * Style presentation lives in Style Sidebar; Atom Settings owns
 * content / semantic / binding / behavior fields only.
 */
export const ATOM_SETTINGS_LABEL = 'Atom Settings'

export const ATOM_SETTINGS_DICTIONARY: Dictionary = {
  'plugin-fields': ATOM_SETTINGS_LABEL,
}

/** DOM hook for focusing the native Puck Fields panel (Atom Settings). */
export const ATOM_SETTINGS_PANEL_ATTR = 'data-zyvavu-atom-settings'

export type BuilderPanelNavTarget = 'atom-settings' | 'style'

export type BuilderPanelNavPlan = {
  /** Close the docked Style Sidebar so it cannot cover Atom Settings. */
  closeStyle: boolean
  /** Desired Puck Fields (right) sidebar visibility after navigation. */
  rightSideBarVisible: boolean
  /**
   * When Fields is already visible, force a hide→show pulse so the gear
   * produces a visible reveal (setUi(true) alone is a no-op).
   */
  pulseAtomSettings: boolean
}

/**
 * Mutual-exclusive panel navigation between Atom Settings (Puck Fields)
 * and the Style Sidebar. Does not invent a second Fields panel.
 */
export function planBuilderPanelNavigation(
  target: BuilderPanelNavTarget,
  state: { styleOpen: boolean; atomSettingsVisible: boolean },
): BuilderPanelNavPlan {
  if (target === 'style') {
    return {
      closeStyle: false,
      rightSideBarVisible: false,
      pulseAtomSettings: false,
    }
  }
  return {
    closeStyle: state.styleOpen,
    rightSideBarVisible: true,
    pulseAtomSettings: state.atomSettingsVisible && !state.styleOpen,
  }
}

export function focusAtomSettingsPanel(root: ParentNode | Document = document): boolean {
  const panel =
    root.querySelector<HTMLElement>(`[${ATOM_SETTINGS_PANEL_ATTR}]`) ||
    root.querySelector<HTMLElement>('[class*="_PuckFields_"]')
  if (!panel) return false
  if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1
  panel.focus({ preventScroll: true })
  panel.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  return true
}

/** Field ownership classes for inventory / regression guards. */
export type AtomFieldClass =
  | 'CONTENT'
  | 'SEMANTIC'
  | 'DATA_BINDING'
  | 'BEHAVIOR'
  | 'STYLE'
  | 'SLOT'
  | 'GAP'

export type AtomFieldOwnership = {
  widget: string
  field: string
  classification: AtomFieldClass
  owner: 'atom-settings' | 'style-sidebar' | 'preserved-prop'
  notes?: string
}

/**
 * Canonical ownership matrix after Settings → Atom Settings repurposing.
 * STYLE entries marked preserved-prop keep data but must not appear in Atom Settings UI
 * when Style Sidebar already provides an equivalent control.
 */
export const ATOM_FIELD_OWNERSHIP: AtomFieldOwnership[] = [
  { widget: 'Heading', field: 'text', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'Heading', field: 'tag', classification: 'SEMANTIC', owner: 'atom-settings' },
  {
    widget: 'Heading',
    field: 'style.typography',
    classification: 'STYLE',
    owner: 'atom-settings',
    notes: 'Native Puck Fields via puckTypographyStyleField; excluded from Style Sidebar',
  },
  { widget: 'Text', field: 'text', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'Button', field: 'text', classification: 'CONTENT', owner: 'atom-settings' },
  {
    widget: 'Button',
    field: 'href',
    classification: 'CONTENT',
    owner: 'atom-settings',
    notes: 'Edited via ActionBar Link Editor; Fields UI shows Label only',
  },
  {
    widget: 'Button',
    field: 'newTab',
    classification: 'BEHAVIOR',
    owner: 'atom-settings',
    notes: 'Edited via ActionBar Link Editor',
  },
  {
    widget: 'Button',
    field: 'style.button',
    classification: 'STYLE',
    owner: 'style-sidebar',
    notes: 'Button Design focused dock (Normal/Hover)',
  },
  {
    widget: 'Image',
    field: 'src',
    classification: 'CONTENT',
    owner: 'atom-settings',
    notes: 'Compact Image Editor panel (preview/change/remove)',
  },
  { widget: 'Image', field: 'alt', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'Image', field: 'aspectRatio', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'Image', field: 'objectFit', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'Image', field: 'objectPosition', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'Image', field: 'caption', classification: 'CONTENT', owner: 'atom-settings' },
  {
    widget: 'Image',
    field: 'href',
    classification: 'CONTENT',
    owner: 'atom-settings',
    notes: 'Edited via ActionBar Link Editor; not duplicated in Fields',
  },
  { widget: 'Video', field: 'src', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'Video', field: 'posterUrl', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'Video', field: 'aspectRatio', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'Video', field: 'controls', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'Video', field: 'autoplay', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'PostTitle', field: 'tag', classification: 'SEMANTIC', owner: 'atom-settings' },
  {
    widget: 'PostTitle',
    field: 'style.typography',
    classification: 'STYLE',
    owner: 'atom-settings',
    notes: 'Heading wrapper — Fields typography; no Content / inline edit',
  },
  {
    widget: 'PostTitle',
    field: 'variant',
    classification: 'BEHAVIOR',
    owner: 'preserved-prop',
    notes: 'UI removed; Document Title reuses Heading Fields only',
  },
  {
    widget: 'PostTitle',
    field: 'align',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Fields typography.align',
  },
  {
    widget: 'DocumentTitle',
    field: 'tag',
    classification: 'SEMANTIC',
    owner: 'atom-settings',
  },
  {
    widget: 'DocumentTitle',
    field: 'style.typography',
    classification: 'STYLE',
    owner: 'atom-settings',
    notes: 'Heading wrapper; content from document.title (read-only)',
  },
  {
    widget: 'CategoryTitle',
    field: 'tag',
    classification: 'SEMANTIC',
    owner: 'atom-settings',
  },
  {
    widget: 'CategoryTitle',
    field: 'style.typography',
    classification: 'STYLE',
    owner: 'atom-settings',
    notes: 'Heading wrapper; content from category/item title (read-only)',
  },
  { widget: 'TextBlock', field: 'badge', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'TextBlock', field: 'title', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'TextBlock', field: 'content', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'TextBlock', field: 'ctaLabel', classification: 'CONTENT', owner: 'atom-settings' },
  { widget: 'TextBlock', field: 'ctaUrl', classification: 'CONTENT', owner: 'atom-settings' },
  {
    widget: 'TextBlock',
    field: 'align',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Style Sidebar typography.align',
  },
  {
    widget: 'CategoryHeader',
    field: 'align',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Style Sidebar typography.align',
  },
  {
    widget: 'Section',
    field: 'containerWidth',
    classification: 'GAP',
    owner: 'atom-settings',
    notes: 'Style Sidebar missing inherit semantics',
  },
  {
    widget: 'Section',
    field: 'verticalPadding',
    classification: 'GAP',
    owner: 'atom-settings',
    notes: 'Vertical-only path not in Style Sidebar spacing',
  },
  {
    widget: 'Section',
    field: 'minHeight',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Style Sidebar dimensions.minHeight',
  },
  { widget: 'Section', field: 'content', classification: 'SLOT', owner: 'atom-settings' },
  { widget: 'FeaturedMedia', field: 'aspectRatio', classification: 'BEHAVIOR', owner: 'atom-settings' },
  {
    widget: 'FeaturedMedia',
    field: 'rounded',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Style Sidebar radius',
  },
  { widget: 'ItemImage', field: 'aspectRatio', classification: 'BEHAVIOR', owner: 'atom-settings' },
  { widget: 'ItemImage', field: 'linkToPost', classification: 'BEHAVIOR', owner: 'atom-settings' },
  {
    widget: 'ItemImage',
    field: 'borderRadius',
    classification: 'STYLE',
    owner: 'preserved-prop',
    notes: 'UI removed; Style Sidebar radius',
  },
]
