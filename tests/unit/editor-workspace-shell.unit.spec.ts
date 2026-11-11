import { describe, expect, it } from 'vitest'

import workspaceStyles from '@/components/builder/core/EditorWorkspace.module.css'
import actionBarStyles from '@/components/builder/core/WidgetActionBar.module.css'
import {
  planBuilderPanelNavigation,
  planStyleSelectionLock,
} from '@/components/builder/core/atom-settings'

describe('Editor Workspace Shell (PO 2026-11-11)', () => {
  it('exports workspace shell + floating Fields chrome classes', () => {
    expect(workspaceStyles.workspaceShell).toBeTruthy()
    expect(workspaceStyles.fieldsPanel).toBeTruthy()
    expect(workspaceStyles.fieldsHeader).toBeTruthy()
    expect(workspaceStyles.fieldsBody).toBeTruthy()
    expect(workspaceStyles.themeNavigation).toBeTruthy()
  })

  it('keeps ActionBar alignment tokens alongside the workspace shell', () => {
    expect(actionBarStyles.toolbar).toBeTruthy()
    expect(actionBarStyles.libraryHost).toBeTruthy()
    expect(actionBarStyles.styleTrigger).toBeTruthy()
  })

  it('opening Style still hides Fields visibility without inventing a second form', () => {
    expect(
      planBuilderPanelNavigation('style', { styleOpen: false, atomSettingsVisible: true }),
    ).toEqual({
      closeStyle: false,
      rightSideBarVisible: false,
      pulseAtomSettings: false,
    })
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

  it('Style selection lock still protects the Style target under the new shell', () => {
    expect(
      planStyleSelectionLock({
        styleOpen: true,
        styleComponentId: 'w-1',
        selectedId: 'w-2',
        targetStillExists: true,
      }),
    ).toEqual({ action: 'reselect', componentId: 'w-1' })
  })
})
