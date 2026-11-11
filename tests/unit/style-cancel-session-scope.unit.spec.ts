import { describe, expect, it } from 'vitest'
import {
  restoreSessionOwnedPresentationTargets,
  restoreSessionOwnedStyleDomains,
} from '@/lib/style-engine/style-session-contract'

describe('Style Cancel session ownership', () => {
  it('Cancel restores only dirty domains and keeps prior closed-session Background', () => {
    const baseline = {
      background: { mode: 'color', colorToken: 'primary' },
      spacing: { padding: { token: 'sm' } },
    }
    // Layout edited in this session; Background came from a previous closed session.
    const current = {
      background: { mode: 'color', colorToken: 'primary' },
      spacing: { padding: { token: 'xl' } },
    }
    const restored = restoreSessionOwnedStyleDomains({
      baseline,
      current,
      dirtyDomains: ['spacing'],
    })
    expect(restored.background).toEqual({ mode: 'color', colorToken: 'primary' })
    expect(restored.spacing).toEqual({ padding: { token: 'sm' } })
  })

  it('Cancel with no dirty domains is a no-op on current document style', () => {
    const current = { background: { mode: 'color', colorToken: 'surface' } }
    const restored = restoreSessionOwnedStyleDomains({
      baseline: {},
      current,
      dirtyDomains: [],
    })
    expect(restored).toEqual(current)
  })

  it('CategoryList Cancel restores only dirty Child target; Parent remains', () => {
    const baseline = {
      itemParent: { background: { mode: 'color', colorToken: 'primary' } },
      itemChild: { background: { mode: 'color', colorToken: 'surface' } },
    }
    const current = {
      itemParent: { background: { mode: 'color', colorToken: 'primary' } },
      itemChild: { background: { mode: 'color', colorToken: 'text' } },
    }
    const restored = restoreSessionOwnedPresentationTargets({
      baseline,
      current,
      dirtyTargets: ['childItem'],
    })
    expect(restored.itemParent).toEqual(baseline.itemParent)
    expect(restored.itemChild).toEqual(baseline.itemChild)
  })

  it('CategoryList Cancel does not clear untouched Parent when baseline lacked it', () => {
    // Session opened after Parent was already committed; baseline still has Parent.
    // Guard: dirty Child only must not delete Parent from current.
    const baseline = {
      itemParent: { background: { mode: 'color', colorToken: 'primary' } },
      itemChild: { background: { mode: 'color', colorToken: 'surface' } },
    }
    const current = {
      itemParent: { background: { mode: 'color', colorToken: 'primary' } },
      itemChild: { background: { mode: 'color', colorToken: 'accent' } },
      container: { spacing: { padding: { token: 'sm' } } },
    }
    const restored = restoreSessionOwnedPresentationTargets({
      baseline,
      current,
      dirtyTargets: ['childItem'],
    })
    expect(restored.itemParent).toEqual(current.itemParent)
    expect(restored.container).toEqual(current.container)
    expect(restored.itemChild).toEqual(baseline.itemChild)
  })
})
