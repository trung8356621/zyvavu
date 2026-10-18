# Editor stability and animation UI integration

Scope: stabilization on `codex/style-engine-feature-expansion`. No persisted template, database, navigation or media identity migration.

## Confirmed code-level causes

1. `PuckHost` recreated `overrides.puck` and `overrides.actionBar` when the active Style Menu changed. Installed Puck renders `overrides.puck` as `CustomPuck` in React JSX. Changing that function changes the component type and can unmount its canvas/frame descendants. Overrides are now module-level component types; existing React context transports changing menu state/callbacks. The preview store remains separate.
2. `WidgetStyleContextMenu` reset draft state whenever the currentStyle object reference changed, including equivalent parent allocations; its default `{}` also allocated repeatedly. An open menu is now a keyed transaction with a mount-time snapshot. Parent rerenders cannot reset it; close/reopen or widget selection starts a fresh transaction.
3. Apply dispatched a Puck document update and also independently updated localDoc/onChange. Puck's existing onChange is now the single synchronization path to the host and Save. Apply still dispatches one logical setData action; slot arrays and legacy zones are preserved in place.
4. The iframe contextmenu listener inspected the global document only once and could miss a frame mounted later. It now watches this host's viewport, attaches to the current frame document, detaches old load/document handlers and cleans up on unmount. Puck's supported ID/selector lookups handle slots; legacy zone lookup remains a fallback.
5. Style tabs were inside the shared modal's scrollable body. They now occupy an optional fixed subHeader slot. The shared shell computes available height below its current top position, reclamps on window/visualViewport resize and keeps footer/header outside the single scrolling body. No monitor-specific viewport height.
6. Reopening the already active Style Menu cleared the preview store even though the editing session remained mounted. That action now preserves the existing transaction and its preview. Puck viewport UI and plugin arrays also keep stable references across menu rerenders.

These establish code-level failure paths. Real-browser asset/network failures and actual iframe reload counts remain separate manual verification items.

## Media findings

- FeaturedMedia editor deliberately renders its existing document-bound placeholder when no explicit src is present; opening the Style Menu should not change this input.
- ItemImage uses the item context's original image URL and existing empty presentation. No media resolver, identity, optimization or URL was replaced.
- Section and Columns renderer keys/data are unchanged by this stabilization. Root override remounts could previously recreate all those descendants together, which differs from one missing asset URL.
- No new placeholder images, fallback asset URLs or published-template edits were added to conceal missing media. Browser Network/Console evidence is still required to diagnose any genuine failed asset requests.

## Animation picker

- Reuses AnimationPresetPicker, SharedDraggableModal and the existing global animation registry.
- Fixed category navigation: Entrance, Loop, Scroll, Hover; named preview cards with selected state; global None; sample replay on hover/focus; supported duration customization.
- Scroll stays visibly unavailable and its card disabled. Dropdown target remains filtered to compatible Entrance presets; saved `none`, `fade`, `slide-down`, `inherit` contracts unchanged.
- Samples use registry CSS and respect reduced motion. Preview interactions affect the sample, not the document; Use animation updates the parent style draft and Apply remains the document boundary.

## DropZone inventory and safe future migration

The source-wide runtime search found one direct deprecated API call:

- `src/lib/theme-engine/widget-registry-editor.ts`: page-content root calls `puck.renderDropZone({ zone: 'default-zone', allow: ['Section'] })`.
- `src/lib/theme-engine/styles.ts`: selectors for `[data-puck-dropzone]` and the `_DropZone_wc2ks_1` class are styling compatibility references, not additional DropZone API calls.
- Section content, Columns columns and CollectionLoop itemTemplate already declare slot fields. Legacy document normalization/SSR still supports `zones`, including `<section-id>:content`.

The deprecated root API call remains. Its presence alone does not establish the source of browser warnings: installed Puck 0.23.0 excludes `root:default-zone` from the DropZones deprecation warning branch. Warning origin remains unverified until a browser stack trace identifies the emitting path.

### Owner-confirmed compatibility exception — 2026-10-18

**Decision: retain the Page root `puck.renderDropZone({ zone: 'default-zone', allow: ['Section'] })` on Puck 0.23.0. Slots migration is deferred, not authorized for implementation now.** This is an intentional compatibility exception protecting Section-only root drag/drop.

Section, Columns and CollectionLoop already use slot fields; keep their structures unchanged. Native root `children` preserves root `content`, but the installed public contract does not expose an equivalent Section-only constraint on that React node. Do not replace the root call at the cost of editor placement restrictions or invent a new root schema merely to remove a warning.

Preserve root `content`, legacy `zones`, widget IDs/order, style props, dynamic bindings, and existing Section-root validation. This decision authorizes no runtime, database, published-template or template JSON changes, and no warning suppression.

Reassess only when upgrading Puck or when an official API supports both root children and Section-only placement while preserving the existing data contract. A future implementation requires a separately approved compatibility change and owner browser acceptance. The checklist below is conditional future work, not a current migration plan:

1. Confirm the installed Puck root-slot/children contract and document format. Prefer rendering the native root children with a supported Section-only placement policy if it retains root `content`; avoid moving root data unnecessarily.
2. Build fixtures for existing root content, Section zones, Columns zones, CollectionLoop item templates, slot arrays, IDs, locks and dynamic bindings. Preserve the current mandatory Section-root validation at both editing and saving boundaries.
3. Introduce an in-memory, versioned, idempotent reader adapter only where slot rendering requires it. Keep legacy zones readable; reject ambiguous duplicate slot/zone definitions instead of dropping nodes.
4. Verify editor and SSR output equivalence, ordering, IDs, repeating contexts, save/reload round trips and undo/redo. No background migration, bulk DB writes or automatic rewrites of published templates.
5. Remove the deprecated root call only after fixture equivalence and owner browser acceptance. Any persistent conversion must be separately reviewed and reversible.

### Separate investigation backlog — browser warning origin

Status: **NOT VERIFIED; no browser investigation executed.** Collect the full warning text, expanded JavaScript/component stack, editor route/template, triggering action and runtime Puck version from an owner-provided browser Console trace. Correlate the trace with the installed warning branch and actual zone/component before proposing a fix. Do not assume the Page root is responsible, suppress warnings, or modify runtime/data as part of this documentation decision. Browser automation remains prohibited by AGENTS.md; owner supplies the trace for a separate investigation task.

## State architecture going forward

Keep Puck as the committed document/selection/history authority, stylePreviewStore as the ephemeral presentation overlay, and one local style-editing session for drafts. Use stable React override components and context for UI callbacks only. No Redux or additional global-state library is justified by these issues.

## Manual browser acceptance (not executed)

Owner should inspect Single Post, repeatedly open/close Document Title Style, switch Section/title, exercise Typography Cancel/Apply and native undo/redo, inspect original images/placeholders, preview supported animation categories, confirm Scroll disabled, dock/resize DevTools, and save/reload committed styles. Record actual iframe load count, asset errors and remaining Puck warnings. This report does not claim browser, screenshot, runtime build or persisted-save verification.

## Automated validation and changed files

- Full `pnpm exec tsc --noEmit --incremental false`: PASS.
- Six focused suites: 95 tests PASS (editor stability 4, expansion 15, transactions 5, hotfix 16, mandatory Section policy 18, Mega Menu 37). The affected editor/transaction suites and the final same-widget reopening regression were rerun after the last source changes and passed.
- Editor tests use a unit Puck mock reproducing the installed component-override identity contract. They assert one canvas mount, identical iframe/image DOM nodes, unchanged media src, stable UI/plugins, no document callback before Apply, one callback/history update on Apply, selection cancellation, draft object-identity resilience, viewport resize geometry and animation category behavior. This is not actual-browser reload counting or native Puck undo/redo acceptance.
- Scoped lint: AnimationPresetPicker, SharedDraggableModal, animation registry and new tests have no errors. PuckHost and WidgetStyleContextMenu each retain one pre-existing set-state-in-effect error; no unrelated cleanup.
- `git diff --check`: PASS. No build, browser automation, login, screenshot capture or database write performed.

Source files: `src/components/builder/core/PuckHost.tsx`, `src/components/admin/theme-builder/WidgetStyleContextMenu.tsx`, `src/components/admin/shared/SharedDraggableModal.tsx`, `src/components/admin/shared/AnimationPresetPicker.tsx`, `src/lib/style-engine/animation-presets.ts`.

Tests: `tests/unit/editor-stability.unit.spec.tsx`. Documentation: this report and `docs/style-engine-known-issues.md`.

Baseline HEAD: `8017199`. Stabilization changes are uncommitted; no push or merge performed.
