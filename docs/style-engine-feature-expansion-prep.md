# Style Engine expansion — PREP REPORT

Status: implementation scope approved by the owner in chat; implementation results are tracked in cms-knowledge-pack/references/component-style-engine-registry.md.

## Baseline

- Repository: `D:/workspace-2026/zyvavu`.
- Feature branch: `codex/style-engine-feature-expansion`, created from `codex/widget-actionbar-integration` at `321cb3baf4c01670769706736b8e962ffb8dce13`.
- Initial worktree: `src/payload-types.ts` already marked modified; preserve and exclude from this work.
- Installed: Next 16.3.3, React 19.2.6, Payload 3.90.2, Mantine 9.7.2, Puck 0.23.0, Lucide 1.56.0. No new UI dependency proposed.
- Prior validation: full typecheck passed; full lint reached source and reported 46 errors / 368 warnings. These are baseline results, not validation of this expansion.

## Component inventory and disposition

| Existing pattern | Disposition | Expansion |
| --- | --- | --- |
| Payload collection forms, media identity and list/grid | KEEP_PAYLOAD | No collection UI changes |
| TypographyStyleControl | RETAIN_BUSINESS_PATTERN | Reuse presets and token controls across text widgets |
| BackgroundStyleControl, ThemeColorPaletteModal, existing media picker | RETAIN_BUSINESS_PATTERN | Reuse Color/Image/Video and nested palette transactions |
| SpacingDimensionsControl, BordersEffectsControl | RETAIN_BUSINESS_PATTERN | Extend typed fields, validation and serializer together |
| SharedDraggableModal | RETAIN_BUSINESS_PATTERN | Reuse for animation picker and responsive button panel |
| Button shell state tabs, vertical navigation, preset cards | USE_MANTINE | Compose Tabs, Button, Select, Switch, Stack and Paper; no custom atoms |
| DropdownEffectPicker | SMALL_BRIDGE | Preserve public props and saved values, delegate selection to shared animation picker |
| WidgetStyleContextMenu and preview store | RETAIN_BUSINESS_PATTERN | Keep draft ownership and one Apply boundary |
| Light Puck ActionBar | RETAIN_BUSINESS_PATTERN | Preserve without redesign |

## Current capability evidence

The registry is not proof of end-to-end support. Direct Universal Style serialization is currently visible in Section, PostTitle and TextBlock frontend renderers. Other renderers require individual editor/SSR wiring before promoting additional domains to active support. No global wrapper will be assumed to supply missing semantics.

| Registered widget | Current explicit registry domains | Implementation constraint / proposed expansion |
| --- | --- | --- |
| Section | section, background, dimensions, spacing, border, shadow, effects, responsive | Reuse layered renderer; verify each domain, add linked sides/corners and safe animation |
| Columns | dimensions, spacing, border, shadow, responsive | Preserve grid slots; wire presentation to actual grid root |
| PostTitle | typography, spacing, shadow, effects, responsive | Preserve semantic tag; extend renderer/preview together |
| TextBlock | typography, background, spacing, border, shadow, effects, responsive | Preserve content and existing typography behavior |
| FeaturedMedia | dimensions, border, shadow, effects, spacing, responsive | Keep asset identity/aspect ratio separate; wire media presentation |
| RecentPosts | dimensions, spacing, background, border, shadow, responsive | Preserve content querying; apply styles only to presentation root |
| CategoryHeader | typography, background, spacing, border, shadow, responsive | Preserve archive data binding |
| ProductHeader | typography, dimensions, spacing, shadow, responsive | Preserve product contract; no commerce behavior expansion |
| ItemTitle | typography, spacing, responsive | Wire text renderer and editor preview |
| ItemExcerpt | typography, spacing, responsive | Wire text renderer and editor preview |
| ItemImage | dimensions, border, shadow, responsive | Wire media presentation without changing media identity |
| ItemLink | typography, spacing, border, responsive | Button shell only for button/outline variants; retain plain-link semantics |
| Header | background, border, shadow | Preserve structured header slots/navigation |
| Footer | background, border, spacing, shadow | Preserve footer slots |
| PostContent | inferred from manifest | Audit rich-text inheritance before enabling typography |
| PostMeta | inferred from manifest | Apply typography to actual metadata surface |
| CollectionLoop | inferred from manifest | Preserve repeating-item binding and slots |
| HeaderBrand | inferred from manifest | Separate brand image and text targets |
| HeaderNav | inferred from manifest | Preserve menu rendering; avoid generic text override across dropdowns |
| HeaderAction | inferred from manifest | Current frontend accepts no Universal Style; add typed button presentation first |
| HeaderTopBarText | inferred from manifest | Candidate for typography after editor/SSR wiring |

Layout groups existing spacing/dimensions; radius currently belongs to the border UI rather than a separate StyleDomain. Animation and button domains do not yet exist. Media appearance currently means applicable generic box styles, not a separate implemented media domain. The implementation deliverable will replace this baseline table with a tested 12-context matrix distinguishing active, shell-only and unsupported fields.

## Proposed data and UI contract

- Preserve `admin.ui.defaultSize=md`, `defaultRadius=md`, `density=comfortable`; use the existing Mantine adapter and separate Admin/Public colors. No Admin theme schema change proposed.
- Normal/Hover button drafts live inside the existing Universal Style document, with explicit typed state and capability filtering. Preserve the same draft/preview/apply/cancel transaction.
- Reuse theme colors, typography, spacing and radius. No dedicated button/CTA token block was found in the inspected bundled theme JSON; offer only presets derivable from existing tokens, and disclose unavailable icon/effect options as shell-only. No fabricated token source.
- Button entry: Theme Button Presets, Text + Icon Presets, Customize Design. Seven vertical groups: Background, Text, Border, Radius, Shadow, Layout, Icon. Unsupported controls are disabled with an explanation and do not serialize fields.
- Extend border sides/radius corners with explicit linked state, deterministic precedence and reset-to-inheritance behavior. Extend shadow layers only where serializer support is implemented. Validation rejects unsupported combinations before Apply/save.
- Animation registry separates preset, trigger, target and bounded options. Entrance/loop/scroll/hover categories, None, compatible-target filtering, CSS-first rendering, reduced-motion fallback and visible SSR content. Scroll effects activate only where a safe runtime/CSS path exists; otherwise shell-only.
- Mega Menu adapter preserves `none`, `fade`, `slide-down` and item `inherit`, including default resolution; do not change menu data/navigation contracts.
- Follow DEC-ANIM-001 and cms-theme-engine guidance. The full original Roadmap animation document is not in the listed local snapshot; do not claim to have read its complete contents.

## Screen coverage

| Screen | Proposed change |
| --- | --- |
| Posts with records | Native list unchanged; post-template rendering regression checks |
| Categories empty | Native empty state unchanged; CategoryHeader styling only in Builder |
| Pages | Native CRUD unchanged; preserve mandatory Section-root policy |
| Tags | No UI change |
| Media | No collection/grid/table changes; reuse picker |
| Menus | Replace animation selector presentation through compatibility adapter |
| Settings | No global settings change |
| Editor | Extend context controls, button shell and animation picker |
| Dashboard | No change |
| Sidebar | Preserve approved V4 navigation and authorization |

## Integration risks and verification

- Installed versions verified locally. Official Mantine documentation confirms controlled vertical Tabs and modal composition: https://mantine.dev/core/tabs/ and https://mantine.dev/core/modal/. Live docs show 9.7.3; compile against installed 9.7.2 types. No dependency upgrade.
- Reuse existing Admin provider, CSS ordering, overlay layers and SharedDraggableModal. Verify nested Select dropdowns above their owning modal, focus/escape behavior, readable surfaces and keyboard navigation. Browser acceptance remains NOT VERIFIED until owner confirmation.
- SSR must remain independent of Puck and Admin components. New animation CSS must keep critical content visible before hydration and under reduced motion. Test invalid styles, preset compatibility and unknown legacy animation values.
- Test a temporary in-memory Admin config variation (md to sm and alternate primary) across new controls; restore baseline and assert Public configuration is independent. No persistent branding edits or DB writes.
- Test capability mapping for every registered widget; actual SSR output and editor preview; button Normal/Hover isolation; reset/inheritance; per-side/per-corner serialization; multi-shadow; Apply/Cancel/widget-switch; undo/redo boundaries; Mega Menu saved values; existing Section policy and bundled themes.
- Run full typecheck and focused unit tests; focused lint plus report baseline full-lint failures separately. No browser automation, login scripts, screenshot capture, server restart, migrations or seeds.

## Proposed file scope

This preparation adds only `docs/style-engine-feature-expansion-prep.md`.

Implementation files proposed after approval:

- Existing engine: `src/lib/style-engine/types.ts`, `capabilities.ts`, `validation.ts`, `serializer.ts`, `token-resolver.ts`, `index.ts`.
- New shared animation modules: `src/lib/style-engine/animation-presets.ts`, `animation-serializer.ts`, `src/components/admin/shared/AnimationPresetPicker.tsx`.
- Context UI: `src/components/admin/theme-builder/WidgetStyleContextMenu.tsx`; existing `style-controls/TypographyStyleControl.tsx`, `SpacingDimensionsControl.tsx`, `BordersEffectsControl.tsx`; new `style-controls/ButtonStyleControl.tsx` and `AnimationStyleControl.tsx`. Background control changes only for required integration.
- Menu compatibility: `src/components/admin/shared/DropdownEffectPicker.tsx`, `dropdownEffects.ts`; retain existing caller contracts in MenuEditor/MenuTreeEditor.
- Widget editor/frontend pairs and manifests for the 21 widgets listed above, only where required to implement an active capability. Do not recreate Section. Keep HeaderNav navigation internals unchanged.
- Frontend theme style generation in `src/lib/theme-engine/styles.ts` only if shared animation CSS delivery requires it; keep registry integration consistent with existing editor/frontend registries.
- Tests: extend existing style-engine, section-builder, mandatory-section-architecture and transactional-style-preview suites; add button-style-control and animation-presets unit suites with saved-value adapter coverage.
- Documentation: `cms-knowledge-pack/references/component-style-engine-registry.md`; record purpose/path/reuse/dependencies/contexts and implemented versus shell-only status, without changing OPEN decisions or claiming remote MCP publication.

Known bugs preserved for a later stabilization pass: Color: surface synchronization; existing full-lint failures; pre-existing payload-types worktree status. Do not mask color synchronization with HEX overrides.

## Approval required

The cms-admin-design Skill explicitly requires a PREP REPORT and user approval for substantial cross-screen design refactors. This expansion includes shared Builder/Mega Menu UI, so it exceeds the small-approved-bugfix exception. Approve this implementation scope before feature edits. No automatic commit, push or merge.
