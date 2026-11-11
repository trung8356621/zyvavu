import { afterEach, describe, expect, it } from 'vitest'

import {
  ATOM_SETTINGS_PANEL_ATTR,
  focusAtomSettingsPanel,
  planBuilderPanelNavigation,
  planStyleSelectionLock,
} from '@/components/builder/core/atom-settings'

describe('Atom Settings ↔ Style panel navigation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opening Style hides Atom Settings (no dual right panels)', () => {
    expect(
      planBuilderPanelNavigation('style', { styleOpen: false, atomSettingsVisible: true }),
    ).toEqual({
      closeStyle: false,
      rightSideBarVisible: false,
      pulseAtomSettings: false,
    })
  })

  it('locks Style target selection while modal is open', () => {
    expect(
      planStyleSelectionLock({
        styleOpen: true,
        styleComponentId: 'w-1',
        selectedId: 'w-1',
        targetStillExists: true,
      }),
    ).toEqual({ action: 'keep' })
    expect(
      planStyleSelectionLock({
        styleOpen: true,
        styleComponentId: 'w-1',
        selectedId: 'w-2',
        targetStillExists: true,
      }),
    ).toEqual({ action: 'reselect', componentId: 'w-1' })
    expect(
      planStyleSelectionLock({
        styleOpen: true,
        styleComponentId: 'w-1',
        selectedId: undefined,
        targetStillExists: true,
      }),
    ).toEqual({ action: 'reselect', componentId: 'w-1' })
    expect(
      planStyleSelectionLock({
        styleOpen: true,
        styleComponentId: 'w-1',
        selectedId: 'w-2',
        targetStillExists: false,
      }),
    ).toEqual({ action: 'close-missing' })
    expect(
      planStyleSelectionLock({
        styleOpen: false,
        styleComponentId: 'w-1',
        selectedId: 'w-2',
        targetStillExists: true,
      }),
    ).toEqual({ action: 'keep' })
  })

  it('gear is a no-op plan when Fields already visible unless Style is covering it', () => {
    // Already visible + Style closed → must pulse (setUi true alone is ineffective).
    expect(
      planBuilderPanelNavigation('atom-settings', {
        styleOpen: false,
        atomSettingsVisible: true,
      }),
    ).toEqual({
      closeStyle: false,
      rightSideBarVisible: true,
      pulseAtomSettings: true,
    })

    // Style open → close Style and show Fields (no pulse needed; Fields was hidden).
    expect(
      planBuilderPanelNavigation('atom-settings', {
        styleOpen: true,
        atomSettingsVisible: false,
      }),
    ).toEqual({
      closeStyle: true,
      rightSideBarVisible: true,
      pulseAtomSettings: false,
    })
  })

  it('gear opens Fields when both panels are closed', () => {
    expect(
      planBuilderPanelNavigation('atom-settings', {
        styleOpen: false,
        atomSettingsVisible: false,
      }),
    ).toEqual({
      closeStyle: false,
      rightSideBarVisible: true,
      pulseAtomSettings: false,
    })
  })

  it('focusAtomSettingsPanel focuses the marked Puck Fields host', () => {
    const panel = document.createElement('div')
    panel.setAttribute(ATOM_SETTINGS_PANEL_ATTR, 'true')
    document.body.appendChild(panel)
    const focused = focusAtomSettingsPanel(document)
    expect(focused).toBe(true)
    expect(document.activeElement).toBe(panel)
  })
})
