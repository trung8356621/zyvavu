# Unified Theme Color Picker architecture contract

Status: FINAL, explicitly approved by the owner for this contract (2026-10-23). This documentation records the decision; it does not implement UI changes or certify that every existing caller complies.

## One shared picker

All color selection in Theme Builder/Widget Builder must reuse the existing modal known as **Theme Background & Palette**. Its current UI is owner-approved. Preserve its design, interactions and Solid/Gradient/Mesh tabs; only restrict tab visibility for the selected property. Color controls act as triggers, not independent pickers.

Verified against the current local worktree:

- Implementation: [`ThemeColorPaletteModal`](../src/components/admin/shared/ThemeColorPaletteModal.tsx), exported with `ThemeColorPaletteModalProps` and `ColorPickerMode = 'solid' | 'gradient' | 'mesh'`. It mounts a session while `opened` is true and composes [`SharedDraggableModal`](../src/components/admin/shared/SharedDraggableModal.tsx).
- Builder caller: [`WidgetStyleContextMenu`](../src/components/admin/theme-builder/WidgetStyleContextMenu.tsx). Its background target supplies `title="Theme Background & Palette"`. Text, border, overlay and fallback targets change the title but reuse the same component. The component's default title is `Theme Color Palette`; the approved background title comes from the caller.
- [`theme-customizer/ThemeColorPaletteModal.tsx`](../src/components/admin/theme-customizer/ThemeColorPaletteModal.tsx) is a re-export of the shared implementation, not a second picker.
- [`PageSettingsPanel`](../src/components/admin/theme-builder/PageSettingsPanel.tsx) also imports the shared component.

## Existing invocation API

Import `ThemeColorPaletteModal` from `@/components/admin/shared/ThemeColorPaletteModal`.

| Props | Existing responsibility |
| --- | --- |
| `opened`, `onClose` | Controlled visibility; owner handles session close/rollback |
| `value`, `tokens`, `colors` | Current selection and palette source; Builder passes current `themeConfig?.tokens` and stores token identity |
| `title`, `subtitle`, `anchorEl`, `zIndex` | Existing presentation, anchor and overlay integration |
| `includeBackgroundTokens` | Includes background/surface swatches; does not enable gradient support |
| `supportedModes`, `initialMode` | Visible allowed tabs and initial tab; default modes are all three, default initial mode is Solid |
| `gradientValue`, `meshValue` | Existing structured `GradientDef`/`MeshDef` values |
| `onSelectToken(token, colorHex)`, `onApplyToken(token, colorHex)` | Solid preview/Apply with semantic token identity and resolved color |
| `onChangeGradient`, `onChangeMesh` | Structured live draft preview |
| `onApplyGradient`, `onApplyMesh` | Accept structured selection into the owning transaction |
| `onChange(colorHex)`, `onApply(colorHex)`, `onCancel` | Existing color callbacks and rollback hook; keep legacy compatibility |

Builder token fields must consume token callbacks rather than persist the resolved HEX. On gradient/mesh Apply, the modal invokes the structured callback and may also invoke `onApply` with serialized CSS. On Solid Apply it invokes `onApply` and `onApplyToken`. Apply then calls `onClose`; callback wiring must not accidentally roll back an accepted selection or commit twice.

## Mode visibility matrix

| Color property | Allowed visible modes |
| --- | --- |
| Background Color | Solid, Gradient, Mesh (within existing supported background paths) |
| Text Color | Solid only |
| Heading Color | Solid only |
| Button Text Color | Solid only |
| Border Color | Solid only |
| Pattern Color Token | Solid only |
| Icon Color | Solid only |
| Other foreground colors | Solid only |
| Other background-like properties | Solid; Gradient/Mesh only when both renderer and data contract support them |

Pass `supportedModes={['solid']}` for Solid-only properties: hide Gradient/Mesh tabs rather than replacing the picker. Do not rely on the all-mode default. Mode visibility is not permission to extend renderer capabilities, data fields or button shell support.

## System Color Tokens

Builder selects only System Color Tokens belonging to the current theme. Do not allow arbitrary custom HEX input. Gradient stops and mesh points also reference existing theme tokens. Preserve token definitions, names and the current palette; do not invent a second token source.

Theme Settings/Color Management owns definition and editing of system colors. This selection contract does not prohibit editing the original palette there. Preserve legacy-value resolvers and saved-value compatibility; accepting a legacy value for rendering does not authorize a new raw-color input in Builder.

## Preview, Cancel and Apply

Reuse the existing nested modal transaction in `WidgetStyleContextMenu` and [`stylePreviewStore`](../src/lib/style-engine/preview-store.ts), as documented in the [Style Engine registry](../cms-knowledge-pack/references/component-style-engine-registry.md).

1. Opening the child palette captures `draftStyle` in `prePaletteDraftRef` via `handleOpenColorModal`.
2. Token/gradient/mesh selection creates a candidate draft and updates the existing preview store. Preview must create no Puck history entries and no persistent writes.
3. Child Cancel or dismiss restores the pre-palette draft and canvas preview through `handlePaletteCloseOrCancel`.
4. Child Apply accepts the selection into the parent draft/preview and updates the rollback snapshot before closing. It does not commit the Puck document.
5. Parent Apply validates the draft with `validateUniversalStyle` and uses the existing `onUpdateStyle` boundary for one document update. Parent Cancel clears preview and restores committed appearance. Selection/session changes discard the previous preview.

Preserve each existing owner's transaction boundary, including Page Settings; do not introduce an independent preview engine or force a new persistence path onto other callers. The modal emits original-color `onChange` before `onCancel` on its Cancel action; rollback belongs to the owner and must restore the full draft, not just a HEX value.

## Usage examples and current gaps

These examples specify required integration behavior, not new implementations:

- **Background:** existing `WidgetStyleContextMenu` background target opens this modal with `supportedModes={['solid', 'gradient', 'mesh']}`, current theme tokens and structured gradient/mesh values. Wire token/structured callbacks to the existing child transaction.
- **Text/heading/button text:** trigger this same component with `supportedModes={['solid']}` and the relevant current token. Return the selected token to the owning typography/text draft. WidgetStyleContextMenu's text target already uses Solid only; do not infer implemented button appearance support from this rule.
- **Border:** reuse the existing border target with `supportedModes={['solid']}`; preview/accept the token into `border.colorToken` using the same transaction.
- **Pattern:** click the Pattern Color control, open this same modal with `supportedModes={['solid']}`, select a System Color Token, and return its identity to the owning pattern color field. Gradient/Mesh stay hidden. Replacing the existing Pattern selectbox is future implementation work, explicitly excluded from this documentation task.

`PageSettingsPanel` currently omits `supportedModes` and wires `onApplyToken` only. Since the shared default exposes all modes, this is a caller gap, not evidence that Page Settings supports Gradient/Mesh. Future work must constrain modes to its actual data/renderer support. Existing selectboxes or other noncompliant controls do not establish an architectural exception; this task leaves them unchanged.

## Compatibility and prohibited patterns

- Preserve Dynamic System Block bindings, existing widget content/data bindings, Puck tree structure and page/Section ownership. Color selection may change presentation only.
- Reuse the Universal Style Engine, capability checks, token resolvers, validation, serializers, overlay layers and existing modal infrastructure. Do not duplicate the Style Engine or create a parallel transaction/store.
- No replacement modal, second Color Picker component, standalone palette, native HTML color input, separate HEX input, or token Selectbox used instead of the shared picker.
- Do not redesign Solid or remove/rebuild the existing tabs. Do not enable Gradient/Mesh for Solid-only properties or unsupported background-like properties.
- Keep authentication, permissions, URL Registry, publish lifecycle and database contracts intact. No schema changes, token renames or dependencies are required by this decision.

## Agent entry points and related contracts

Root [`AGENTS.md`](../AGENTS.md) is the common entry point for Codex, Cursor and Antigravity; this document is the detailed color contract. The existing [Cursor rule](../.cursor/rules/zyvavu-coding.mdc) points to these shared sources rather than duplicating the contract. No dedicated Antigravity instruction file was found in the inspected root/instruction locations; use the common entry point, without creating another rule copy.

Apply this contract together with the [Admin design skill](../cms-knowledge-pack/skills/cms-admin-design/SKILL.md), [Style Engine registry](../cms-knowledge-pack/references/component-style-engine-registry.md), [expansion preparation](style-engine-feature-expansion-prep.md) and [known limitations](style-engine-known-issues.md). This explicit owner decision governs picker reuse and mode restrictions; other architecture decisions and existing transaction contracts remain in force.
