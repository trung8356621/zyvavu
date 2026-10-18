# Visual Builder UX V2

Implementation on `codex/style-engine-feature-expansion`, based on `4697624`.

## Architecture and working behavior

- `PuckHost` owns document updates. The stable Puck overrides remain module-level; style sessions sit outside the transient ActionBar. Four primary actions open Animation, Background, Layout and Borders directly. Additional eligible domains use the overflow menu; native duplicate/delete/parent actions remain present. Right-click opens the compact domain launcher.
- `domains.ts` maps global domains and text/button extras to modal titles and scoped reset fields. Section has four actions; its Borders modal also contains the existing shadow/effects controls. Other eligible widgets have separate Shadow/Effects actions. Typography remains on text widgets and in Button Design's Normal Text group; semantic tags stay in Widget Settings. No container typography or new inheritance system is introduced.
- `WidgetStyleContextMenu` hosts one independent domain at a time using `SharedDraggableModal`, not a tabbed all-domain panel. It preserves the committed snapshot, preview store, validation and one-operation Apply. Switching domains with changes asks Apply/Discard/Continue editing. Selecting another widget leaves an active draft open under the original widget's title/ID until resolved; requests to edit another widget or insert/apply a pattern are blocked while that preview is active. Cancel and closing roll back preview; Reset affects only the open domain and still requires Apply. Permission/instance locks are checked before style Apply.
- `withWidgetStyleSurface` composes the existing native renderer root in editor and frontend. It uses the current serializer and separate background layers, preserves grid children/sticky position and avoids adding a generic wrapper to built-in native roots. Fragment renderers use the shared surface composition. Section retains its existing section-specific renderer and page layout behavior. No new theme or CSS serializer is introduced.
- `WidgetPatternLibrary` replaces only the Puck Blocks list. Categories derive from widgets available in the current config. Tiles use icons above labels. Both columns scroll within the panel; narrow containers switch to a horizontal category strip. The library width uses Puck's existing user sidebar width variable and the configurable `--zyvavu-builder-library-width`; the layout changes only while the Blocks library is mounted.
- `widget-patterns.ts` holds a versioned, extensible registry, separate from background textures. V1 has six actual-widget designs: airy/patterned Sections, editorial/card TextBlocks, balanced/feature Columns. Pattern cards use a faithful lightweight preview of the same style serializer. The ordinary widget list remains available separately using each real widget's defaults.
- Pattern insertion/application uses one public Puck `setData` action. Insertion generates unique IDs recursively and wraps page-root widgets in Section. Selected container slots can be chosen explicitly. Candidate validation covers allowed widget types, slot allow/disallow rules, Section placement, duplicate IDs, required/unique capabilities, locks and style validation. Apply changes only whitelisted presentation fields, preserves text/bindings/IDs/slots and refuses column changes that hide occupied columns. Nested pattern structures are insert-only to preserve existing content.
- `animation-replay.ts` plays finite WAAPI animation on the current sample or selected canvas element, including same-origin Puck iframe lookup. It uses current draft preset/duration, cancels on replay/close/completion and honors reduced motion. It never dispatches Puck data/history, changes React keys or remounts the canvas widget. Editor iframe CSS suppresses automatic CSS loops/hover motion; frontend runtime and Mega Menu compatibility retain the existing preset registry.
- Background patterns are structured `background.pattern` options: none/dots/grid/stripes/diagonal/noise, semantic color token, opacity and sm/md/lg scale. Legacy `background.image.pattern` remains a fallback. Opacity stays on the texture layer. No raw SVG/CSS is stored. Image/video/overlay controls use the same existing layer renderer, with reduced-motion video poster fallback.

## Explicit shell behavior and limitations

- Button Design is still a shell. Normal shows Background, Text, Border, Radius, Shadow, Layout and Icon. Normal Text uses the working Typography Control and is saved through Apply. Other advanced Normal groups remain disabled/local samples. Hover exposes only background, text color, border color, shadow, opacity and transform sample controls; Radius/Icon are absent. Shell appearance is never persisted; samples reset when the modal is left/reset. This is not a complete Button Engine.
- Scroll animation remains disabled/shell-only. Canvas tests are finite even for Loop. Animation playback requires WAAPI and access to the same-origin preview document; failures/reduced motion give explicit feedback.
- Library uses click insertion. External pattern dragging was not implemented or simulated. Existing Puck canvas drag/drop remains its own engine.
- Preview cards are deliberately lightweight, not full data-connected frontend pages. V1 catalog has no authored nested pattern yet; nested slot support and validation are available for extensions.
- Shared floating tools focus controls and return focus without trapping users away from the canvas. Dialog confirmation uses Mantine's modal behavior. Focus, stacking, contrast, scroll and responsive appearance require owner acceptance.
- Developer-supplied custom renderer overrides must adopt the shared surface adapter before advertising global style support.

## Persistence and boundaries

Existing document ownership, IDs, bindings, theme tokens, frontend SSR, URL Registry, authentication, publish lifecycle and Media Grid/Table are preserved. `background.pattern` is an optional JSON style extension; legacy documents remain accepted. No DB schema/migration, production migration, seed, test record, package installation, service restart, commit, push or merge is part of this work. Global theme.json is unchanged.

## Validation

- 136 focused unit tests passed across nine suites through focused runs. Coverage includes shared renderer output, unchanged widget DOM during preview, native sticky/grid structure, draft switching/reset, pattern permissions/slot/root/unique/required rules and bindings, iframe replay, reduced motion, legacy documents and Mega Menu.
- A broad run had one Mega Menu import timeout under concurrent checks; it passed when run separately. The domain-switch test awaits Mantine modal transitions. Test cache initially hit sandbox EPERM; subsequent tests used a writable temporary directory outside Git.
- TypeScript: PASS (`pnpm exec tsc --noEmit --incremental false`) on the final source. `git diff --check`: PASS.
- Scoped lint: one pre-existing `react-hooks/set-state-in-effect` error in PuckHost external-document synchronization, plus 74 warnings. The same error was confirmed against HEAD via ESLint stdin; no new lint errors remain. Full-repository lint is not claimed clean.
- Production compile: BLOCKED after two different attempts. `pnpm build --experimental-build-mode compile` failed in Turbopack CSS subprocess startup (the unchanged Media stylesheet was the reported asset). `pnpm build --webpack --experimental-build-mode compile` failed before compilation because existing next.config.ts sets watchOptions.ignored to an array of RegExp, rejected by Webpack schema. No third attempt, config workaround or unrelated build fix was made. Full prerender/runtime build was excluded because the Payload adapter includes production migrations.
- Browser/visual status: **NOT VERIFIED**. No browser automation, screenshots or login scripts were run.
- Environment: documented canonical `D:\zyvavu` is absent here; workspace is `D:\workspace-2026\zyvavu`. No listener on 3107 was found during the check. No service was started.

## Owner manual acceptance

1. At desktop and narrow widths, open Blocks; check category icons/labels, search, distinct previews, panel/canvas widths and both scroll regions.
2. Insert each curated pattern, undo once, redo, and insert ordinary widgets into Section/Columns slots. Try a unique widget twice and a locked container; confirm rejection without document changes.
3. Apply a compatible pattern to bound content. Confirm text, data binding, IDs and nested content survive; undo restores the previous presentation.
4. Select Section: open each of the four ActionBar actions and right-click launcher. Check drag header, fixed footer, visible actions, focus/keyboard and nested palette stacking.
5. Edit one domain, request another, and try all three confirmation choices. Change widget selection with a draft open; resolve it explicitly. Check Cancel and domain Reset do not erase unrelated committed styles.
6. Check Typography on text only and semantic HTML Tag in Widget Settings. Check Button Design's seven Normal groups and limited Hover shell; confirm shell samples are not saved.
7. Hover/focus animation cards, replay Test Animation for Entrance/Loop/Hover with draft duration, and compare undo/save state before/after. Enable reduced motion and confirm no playback. Scroll remains disabled.
8. Apply pattern colors/opacity/scale in color/image/video backgrounds. Check editor and published frontend, content opacity, Header sticky behavior, Columns layout and video poster fallback.
9. Load existing templates and verify Theme Customizer token propagation, Mega Menu animations, Media Grid/Table and the approved Admin sidebar.

## Changed files

- `src/components/admin/shared/AnimationPresetPicker.tsx`
- `src/components/admin/shared/SharedDraggableModal.tsx`
- `src/components/admin/theme-builder/WidgetPatternLibrary.module.css`
- `src/components/admin/theme-builder/WidgetPatternLibrary.tsx`
- `src/components/admin/theme-builder/WidgetStyleContextMenu.tsx`
- `src/components/admin/theme-builder/style-controls/BackgroundStyleControl.tsx`
- `src/components/admin/theme-builder/style-controls/BordersEffectsControl.tsx`
- `src/components/admin/theme-builder/style-controls/ButtonStyleControl.tsx`
- `src/components/builder/core/PuckHost.tsx`
- `src/components/builder/core/WidgetActionBar.module.css`
- `src/lib/style-engine/WidgetStyleSurface.tsx`
- `src/lib/style-engine/animation-presets.ts`
- `src/lib/style-engine/animation-replay.ts`
- `src/lib/style-engine/capabilities.ts`
- `src/lib/style-engine/domains.ts`
- `src/lib/style-engine/serializer.ts`
- `src/lib/style-engine/token-resolver.ts`
- `src/lib/style-engine/types.ts`
- `src/lib/style-engine/validation.ts`
- `src/lib/theme-engine/widget-patterns.ts`
- `src/lib/theme-engine/widget-registry-editor.ts`
- `src/widgets/CategoryHeader/frontend.tsx`
- `src/widgets/Columns/editor.tsx`
- `src/widgets/Columns/frontend.tsx`
- `src/widgets/FeaturedMedia/frontend.tsx`
- `src/widgets/Footer/editor.tsx`
- `src/widgets/Footer/frontend.tsx`
- `src/widgets/Header/editor.tsx`
- `src/widgets/Header/frontend.tsx`
- `src/widgets/HeaderAction/frontend.tsx`
- `src/widgets/HeaderBrand/editor.tsx`
- `src/widgets/HeaderBrand/frontend.tsx`
- `src/widgets/HeaderNav/editor.tsx`
- `src/widgets/HeaderNav/frontend.tsx`
- `src/widgets/HeaderTopBarText/frontend.tsx`
- `src/widgets/ItemExcerpt/frontend.tsx`
- `src/widgets/ItemImage/frontend.tsx`
- `src/widgets/ItemLink/frontend.tsx`
- `src/widgets/ItemTitle/frontend.tsx`
- `src/widgets/PostContent/frontend.tsx`
- `src/widgets/PostMeta/frontend.tsx`
- `src/widgets/PostTitle/frontend.tsx`
- `src/widgets/ProductHeader/editor.tsx`
- `src/widgets/ProductHeader/frontend.tsx`
- `src/widgets/RecentPosts/editor.tsx`
- `src/widgets/RecentPosts/frontend.tsx`
- `src/widgets/TextBlock/frontend.tsx`
- `tests/unit/style-engine.unit.spec.ts`
- `tests/unit/style-expansion.unit.spec.tsx`
- `tests/unit/theme-builder-style-hotfix.unit.spec.tsx`
- `tests/unit/transactional-style-preview.unit.spec.tsx`
- `tests/unit/visual-builder-library.unit.spec.tsx`
- `tests/unit/visual-builder-ux-v2.unit.spec.tsx`

- `docs/visual-builder-ux-v2.md` (this implementation report and owner acceptance checklist)
