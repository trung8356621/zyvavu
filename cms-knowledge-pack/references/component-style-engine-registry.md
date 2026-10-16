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
