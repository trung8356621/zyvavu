# Component & Visual Style Engine Registry (V1)

## 1. Overview
The Universal Visual Style Engine provides a shared, typed, capability-driven styling system for Zyvavu Admin Theme Builder and Frontend SSR. It eliminates handwritten CSS for common presentation properties while strictly preserving the token-driven Atomic Design System.

Pipeline:
`Theme Customizer → Published Theme Tokens → Theme Builder → Template/Widget Style References → Frontend SSR`

---

## 2. Component Inventory

### New Components
1. **`Section` Container (`src/widgets/Section`)**
   - **Role**: Selectable Section container in Puck layout builder and SSR frontend.
   - **Manifest**: `src/widgets/Section/manifest.ts`
   - **Editor Config**: `src/widgets/Section/editor.tsx` (`content: { type: 'slot' }`)
   - **Frontend SSR**: `src/widgets/Section/frontend.tsx`
   - **Hierarchy**: `Page → Section → Columns → Widgets`
   - **Capabilities**: `['layout.container', 'layout.section']`

2. **`TypographyStyleControl` (`src/components/admin/theme-builder/style-controls/TypographyStyleControl.tsx`)**
   - **Role**: Context menu editor for typography presets, theme color tokens, alignment, text effects, letter spacing, line spacing, and vertical text.
   - **Rule**: Never exposes HTML tag selection (managed independently by right sidebar Widget Settings).

3. **`BackgroundStyleControl` (`src/components/admin/theme-builder/style-controls/BackgroundStyleControl.tsx`)**
   - **Role**: Shared background editor with 3 modes: `Color | Image | Video`.
   - **Features**: 3x3 focal position grid, size, repeat, overlay color/opacity, lightweight CSS pattern presets, muted video autoplay, and reduced-motion fallback.

4. **`SpacingDimensionsControl` (`src/components/admin/theme-builder/style-controls/SpacingDimensionsControl.tsx`)**
   - **Role**: Spacing (padding, margin, gap) and geometry (containerWidth, minHeight, content alignment).

5. **`BordersEffectsControl` (`src/components/admin/theme-builder/style-controls/BordersEffectsControl.tsx`)**
   - **Role**: Border style/width/color, radius tokens, elevation/shadow tokens, opacity, and backdrop blur.

### Reused / Extended Components
1. **`ThemeColorPaletteModal` (`src/components/admin/shared/ThemeColorPaletteModal.tsx`)**
   - **Extensions**: Extended with `Solid`, `Gradient`, and `Mesh` tabs.
   - **Tokens**: All gradient and mesh stops reference theme tokens.
   - **Compatibility**: 100% backward-compatible with existing solid-only callers.

2. **`WidgetStyleContextMenu` (`src/components/admin/theme-builder/WidgetStyleContextMenu.tsx`)**
   - **Architecture**: Powered by `SharedDraggableModal` and dynamic capability filtering from `getComponentStyleCapabilities()`.

3. **`SharedDraggableModal` (`src/components/admin/shared/SharedDraggableModal.tsx`)**
   - **Role**: Universal floating modal infrastructure (anchor positioning, free dragging, viewport clamping, portal rendering, escape handling). Preserved without modifications.

---

## 3. Style Capability Registry

| Component | Allowed Style Domains | Notes |
|---|---|---|
| `Section` | `['section', 'background', 'dimensions', 'spacing', 'border', 'shadow', 'effects', 'responsive']` | Supports multi-layer background, container widths, padding |
| `PostTitle` | `['typography', 'spacing', 'shadow', 'effects', 'responsive']` | Semantic tag independent from visual typography preset |
| `TextBlock` | `['typography', 'background', 'spacing', 'border', 'shadow', 'effects', 'responsive']` | Container styles + title typography |
| `FeaturedMedia`| `['dimensions', 'border', 'shadow', 'effects', 'spacing', 'responsive']` | Media sizing, radius, shadow |
| `Columns` | `['dimensions', 'spacing', 'border', 'shadow', 'responsive']` | Grid column layout, gap, margins |
| `Header` / `Footer` | `['background', 'border', 'spacing', 'shadow']` | Structured theme parts |

---

## 4. Single Source of Truth & Token Ownership

1. **Font Size & Weight**: Owned by Theme Customizer (`tokens.typography.h1..h6, p1..p3`).
2. **Widget Typography Selection**: Owned by Style Engine (`style.typography`).
3. **Semantic HTML Tag**: Owned by Widget Settings panel (`props.tag`). A widget may render semantically as `<h2>` while styled visually with the `H1` preset.
4. **Section Background**: Owned by Section Style (`props.style.background`).
5. **Page Background**: Owned by Page Settings (`root.props.pageSettings.background`).

---

## 5. Overlay Multi-Layer Architecture

Visual layer stacking inside Section:
`Base Color (z:1) → Media Image/Video (z:2) → Overlay / Pattern (z:3/4) → Section Content (z:10)`

Overlay opacity applies strictly to the overlay layer and **never reduces the opacity of widgets or text**.
Video backgrounds are strictly muted and loop; `prefers-reduced-motion` hides the video stream and falls back to the poster image/color.


## Feature expansion — implementation status (2026-10-18)

Branch: `codex/style-engine-feature-expansion`, based on integration `321cb3b`.
This section supersedes the earlier capability claims where they only reflected registry entries.

### Verified-by-code capability matrix

`Y`: implemented editor/serializer/SSR path; `C`: color/gradient/mesh only; `S`: explicit non-persisted UI shell; `box`: generic geometry/border/effects on media surface. Browser acceptance remains NOT VERIFIED.

| Widget | Typography | Background | Layout | Dimensions | Spacing | Border | Radius | Shadow | Effects | Animation | Button | Media |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Section | — | Y | Y | Y | Y | Y | Y | Y | Y | Y | — | background image/video |
| Columns | — | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| PostTitle | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| PostContent | inherited prose | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| PostMeta | metadata surface | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| TextBlock | title | C | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| FeaturedMedia | — | — | Y | Y | Y | Y | Y | Y | Y | Y | — | box |
| CategoryHeader | title | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| CollectionLoop | — | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| RecentPosts | — | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| ItemTitle | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| ItemExcerpt | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| ItemImage | — | — | Y | Y | Y | Y | Y | Y | Y | Y | — | box |
| ItemLink | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | S, button/outline variants | — |
| HeaderAction | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | S | — |
| HeaderTopBarText | Y | — | Y | Y | Y | Y | Y | Y | Y | Y | — | — |
| Header, Footer, HeaderBrand, HeaderNav, ProductHeader | — | — | — | — | — | — | — | — | — | — | — | — |

The last five widgets retain existing rendering and data/navigation contracts; generic style controls are hidden until their editor and SSR paths can honor them. Unknown manifest capabilities no longer imply working controls. Responsive hide/stack presets are not advertised: the existing schema did not implement their serializer. Media identity, image aspect ratio and content/data-binding controls remain in the widget sidebar.

### Shared components and reuse contracts

| Component / source | Purpose and dependencies | Contexts / status |
| --- | --- | --- |
| `src/lib/style-engine/animation-presets.ts` | One global typed preset/trigger/target/options registry, compatibility metadata and CSS; independent of Admin/Puck | Widget/Section: None, Fade, Slide Down, Pulse, Lift active. Scroll Fade shell-only, disabled and validation-rejected. Dropdown: None/Fade/Slide Down only. |
| `src/components/admin/shared/AnimationPresetPicker.tsx` | Preset cards, temporary selection, Cancel/Use; reuses Mantine and SharedDraggableModal; nested dropdown uses existing overlay layer | Shared Widget/Section/Mega Menu picker. No new modal infrastructure. Duration active for widgets; legacy dropdown timings unchanged. |
| `src/components/admin/shared/DropdownEffectPicker.tsx` | Compatibility bridge to shared picker; reuses dropdownEffects adapters | Existing MenuEditor/MenuTreeEditor callers unchanged; saved `none`, `fade`, `slide-down`, `inherit` unchanged. |
| `src/components/admin/theme-builder/style-controls/ButtonStyleControl.tsx` | Normal/Hover local samples, seven vertical groups; Mantine only | HeaderAction and button/outline ItemLink. Explicit shell-only; local preset/color samples never commit unsupported fields. Text/icon presets and advanced group controls disabled. |
| `src/lib/style-engine/types.ts` ButtonStyleShell/ButtonShellState | Versioned reserved contract for normal/hover background, text, border, radius, shadow, layout, icon | Data contract only; appearance data rejected by validation until a later renderer implementation. No new dedicated button tokens. |
| BordersEffectsControl / existing serializer | Linked/unlinked sides/corners, semantic widths/colors/radii, up to four preset shadow layers | Existing control extended, no parallel border/shadow engine; layers override single preset. |
| SpacingDimensionsControl / existing serializer | Padding/margin, semantic max width, min height, alignment and inheritance | Uses existing tokens. Per-field clear restores inheritance; Reset style clears current draft only, Apply required. |
| Existing widget editor/frontend pairs | Editor previews reuse frontend components where safe; slot-aware Columns/CollectionLoop retain their slot implementations | Existing registry preview-store wrapper supplies drafts. No new preview store or persistent writes. |

Typography uses existing theme font/size/weight/line-height variables; no raw font controls or tag changes. PostContent styles its prose surface and does not force arbitrary styles onto nested rich-text headings or embedded blocks. TextBlock typography targets its title; PostMeta targets its metadata surface, not individually authored badge overrides.

### Transactions, accessibility and limitations

- Draft updates remain in stylePreviewStore; Apply invokes the existing one-change document path; Cancel clears preview. Changing selection closes the previous transaction. The menu validates before Apply; save validation continues using validateUniversalStyle.
- Button shell samples are intentionally not part of Apply; switching widgets discards local samples. Versioned appearance fields are reserved, not silently persisted.
- Global animation CSS applies motion only under prefers-reduced-motion: no-preference. Content remains visible when CSS/JavaScript is unavailable. Scroll animation has no active renderer and cannot be selected/saved.
- Existing SharedDraggableModal, palette, typography control, media selection and overlay constants are reused. The light ActionBar and native parent/duplicate/delete actions are retained.
- Known Color: surface synchronization issue is deliberately not fixed. Existing full-lint failures and pre-existing payload-types worktree status are separate stabilization issues.
- No migration, database write, theme-token rewrite, Media collection/grid redesign or navigation rewrite.
- UI at 1366x768 / 75%, focus/portal stacking and visual animation timing require manual owner acceptance. No browser automation or screenshot generation was used.

### Validation results for this expansion

- Full `pnpm exec tsc --noEmit --incremental false`: PASS after resolving Puck's recursive dataContext/slot typing at the editor boundary. Editor sample contexts are explicit; content bindings and public renderer types are unchanged.
- Relevant test results across focused runs: style-engine 19, section-builder 9, mandatory-section-architecture 18, transactional-style-preview 5, theme-builder-style-hotfix 16, mega-menu-builder 37, style-expansion 15: **119 passing tests**. The new suite checks renderer output, live preview rollback, linked borders/corners, shadow layers, validation, capability gating, legacy animation compatibility, independent Button Shell samples and nested Escape handling.
- New components/registry/test scoped lint: PASS. Seven existing errors in touched legacy files remain; baseline/current rule lists were compared directly against HEAD and are identical. Full-repository lint is not claimed clean.
- `git diff --check`: PASS. No build/runtime/browser visual PASS claimed.
- Known issues and manual acceptance gaps: `docs/style-engine-known-issues.md`.
- Feature changes remain uncommitted on the dedicated feature branch; no automatic commit/push/merge performed.
