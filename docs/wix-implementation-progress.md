# Wix Implementation Progress

## Theme Builder Page Settings and preview cards — 2026-11-11

- **Background image:** Page Settings formerly exposed URL and geometry only. It now opens the existing Payload-backed MediaSourcePicker, previews the chosen URL, and lets users replace or remove it. Position, size and repeat stay in the existing Page Settings schema. The shared resolver renders the image over the theme background fallback, and rejects unsupported or malformed URLs for rendering. Unavailable media shows an error in the settings preview. Both settings changes and layout resets now set `recordHistory: true`, because Puck excludes `setData` from history by default.
- **Text and contrast:** Page Settings previously set root color, while heading CSS selected Theme Text directly. The page resolver now supplies the inherited foreground variable and headings inherit their parent's color. Colored Sections continue to supply local contrast foregrounds, and explicit Section or widget colors still apply. Explicit page text color is preserved and low contrast is reported against the known page surface. Image contrast varies with the underlying image and widget-local background. Widget Typography Fields still describe their Theme baseline where no explicit override exists and do not identify every ancestor CSS source.
- **Typography and layout:** the Page Typography preset now supplies inherited font metrics via theme variables. Semantic heading rules and explicit widget typography continue to apply locally. Page alignment reads the Theme alignment variable when unset. Existing width and spacing settings still use their original root/Section scopes.
- **Library previews:** Button styled presets use two columns when the results panel has room, and one when narrow. Image previews use full card width, their configured aspect ratio, and contain sizing. Demo image sources and lazy-loading behavior remain in the preview path. Inserted widget presentation is unchanged.
- **Browser and persistence:** no browser-control tool was available. Actual computed styles, scroll and sizing at 1366×768 and 1920×1080, live Puck Undo/Redo, and request volume were not measured. Save/reopen and published parity remain blocked by the lack of an isolated fixture.
- **Files:** PageSettingsPanel and the shared page settings resolver, theme heading CSS, the Section serializer, PatternPreview, WidgetPatternLibrary and its stylesheet, three focused unit test files, and the color contract and progress documents.
- **Regression.** 49/50 across six Vitest suites. The remaining TextBlock assertion expects the background color on the root, while the existing surface renderer puts it on a separate layer. The two new resolver cases also passed in the focused rerun. TypeScript reports 50 baseline diagnostics and none in the changed files. Scoped ESLint reports the existing effect-state errors in PatternPreview and WidgetPatternLibrary.

## Media and Widget Library recovery — 2026-11-11

- **Browse My Media:** the installed Payload `useListDrawer` memoizes its returned component using `collectionSlugs` and `filterOptions`. The picker previously constructed both on every render, allowing drawer remounts to start a new `render-list` request. The picker now uses stable collection and MIME filter references. Native list and upload drawers remain in place. The searchable picker grid retains empty and retry states. Selection is pending until Use is clicked.
- **Media cards:** Image previews use the existing curated demo catalog for lakeside landscape, coffee, architecture, colorful salad, ocean horizon and circuit board. Video cards use flower and forest posters. The cards demonstrate landscape, square, portrait, rounded, banner and contained framed presentation. Inserted presets contain the style and media framing settings. Preview photos and posters are supplied only to the preview renderer.
- **Media binding:** Image owns its selected media source. FeaturedMedia resolves the current document's featured image, including the existing legacy document field fallbacks. A saved widget-level `src` cannot override it. Canvas shows a document-bound placeholder when there is no document media. Frontend omits an empty image.
- **Categories:** Text, Buttons, Media, Layout, Sections, Dynamic Content and context-specific Header/Navigation where configured. Media contains Image, Video and Gallery where permitted. Search spans all available categories in the current library mode.
- **Basic Button:** insertion and preview share the same atom defaults with Button Style V1 Filled, Theme typography and padding, Medium radius and Hover opacity. The Library renders a noninteractive sample to keep its insert button valid. Canvas and frontend keep the existing Button and Link render paths.
- **Browser UI BLOCKED:** this session has no browser controls. Request counts before and after, viewport checks, and real media selection remain unmeasured. Preview thumbnails use existing catalog URLs. The shell could not resolve the catalog host for local copies, so thumbnail availability depends on the browser reaching that host.
- **Regression:** focused Vitest **53/53 PASS** across six suites. TypeScript reports 50 existing errors, with no diagnostics in files changed for this batch. Scoped ESLint reports the two existing effect-state errors in PatternPreview and WidgetPatternLibrary.
- **Files:** `MediaSourcePicker.tsx`, `MediaBrowser.tsx`, `WidgetPatternLibrary.tsx`, `PatternPreview.tsx`, `atom-presets.ts`, the atom manifest and renderer, the FeaturedMedia editor and renderer, and the media-source-picker, image-builder, widget-library-presets and style-expansion unit suites.

## Effective Style defaults — 2026-11-11

- [Property and widget defaults, precedence and exceptions](style-engine-effective-defaults.md). Layout, borders, backgrounds, Button Design, typography and Image Settings display more of the existing effective appearance. Section shares layout resolution with its renderer. Columns uses the frontend gap and margin defaults in the editor.
- Mobile inherits unset properties through Tablet, then Desktop. Responsive declarations now override inline base CSS. Scoped resets leave wider breakpoints and sibling properties in place. Display values stay outside document writes.
- Focused Vitest reached **50/51**. The remaining test found both Mantine's select and its listbox by label. The assertion was updated to target the reported combobox role and remains unverified after the two-attempt stop rule.
- TypeScript reported **50 diagnostics**, with none in the changed source or responsive test in the final typecheck. Scoped ESLint reported **19 errors** in existing render/effect code in TypographyStyleControl, WidgetStyleContextMenu and PuckHost. No build or migration ran.
- **UI NOT VERIFIED**. The session had no browser control. Save/reopen stayed blocked by the existing fixture-isolation requirement. Canvas and frontend parity for all widget-specific renderer defaults remains open.
- Changed files include `effective-defaults.ts`, `responsive-style.ts`, `serializer.ts`, `domains.ts`, `button-style.ts`, `PuckHost.tsx`, `WidgetStyleContextMenu.tsx`, the five affected Style controls, the Columns editor/frontend, atom Image fields and media presentation, both typography/responsive test suites, and the Style contract, UX and progress documents.

## Workspace recovery batch — 2026-11-11

- Replaced Theme Builder's bottom-positioned Puck plugin navigation with a workspace rail. The floating tool panels reuse the existing library, Puck Outline and Page Settings. Puck Fields keep their original form and use the same panel header and close control.
- The ActionBar uses Settings, Design and More, with native actions and media replacement under More. Design anchors to the workspace. The header exposes Puck Preview and retains the native viewport and zoom controls on Canvas.
- Focused Vitest on the final code passed **28/28** across Editor stability, Widget Library and Image Quick Action. The earlier 11-suite sweep passed **87/98**. One failure was the Image test's stale expectation for persisted media ID, corrected and verified in the final run. Ten failures remain in older Style Hotfix and UX V2 suites, involving existing control names/background behavior and pattern assertions.
- TypeScript reported **53** diagnostics, all outside modified files. The scoped ESLint run reported **8 errors**, with matching errors reproduced on HEAD. No production build or migration ran.
- **UI NOT VERIFIED** at either requested viewport. The QA inventory, provisional defect backlog, reported symptoms and fixture isolation blocker are in the [owner acceptance pack](visual-builder-owner-acceptance.md#workspace-recovery-qa--2026-11-11).
- Changed source: `PuckHost.tsx`, `EditorWorkspace.module.css`, `WidgetActionBar.module.css`, `ThemeBuilder.tsx`, `WidgetPatternLibrary.tsx`, `WidgetPatternLibrary.module.css`, `WidgetStyleContextMenu.tsx`, `SharedDraggableModal.tsx`, `ImageQuickAction.tsx`, and `MediaSourcePicker.tsx`. Updated the three focused unit suites and the UX, acceptance and progress documents.

Checkpoint after **Editor UX V5** (PO 2026-11-11 final).  
Supersedes Style Dock and centered blocking Style Modal. Do **not** treat unit PASS as UI VERIFIED.

## PO decision — Editor UX V5 (2026-11-11 final)

| Item | Status | Notes |
| --- | --- | --- |
| One-row compact header | **DONE (code)** | Template menu + Page Select + Undo/Redo + unsaved dot + Save |
| Three-action ActionBar | **DONE (code)** | Settings \| Design \| More (+ Puck native Dup/Delete) |
| Floating Design Panel | **DONE (code)** | `mode="floating"`, ~420px, no backdrop / no focus trap |
| Design collapse/restore | **DONE (code)** | Session/domain/target preserved |
| Centered Style dialog | **REMOVED** | Superseded by floating panel |
| Link Editor dock | PRESERVED | Apply/Cancel/Escape unchanged |
| Full-width Canvas shell | PRESERVED | 60px rail; Fields/Library/Design overlay |
| UI verification | **UI NOT VERIFIED** | Owner pass A–Z at 1366×768 / 1920×1080 |

Changed (UX V5): `ThemeBuilder.tsx`, `PuckHost.tsx`, `WidgetStyleContextMenu.tsx`, `EditorWorkspace.module.css`, focused unit specs.

## Prior — Replace Puck 3-column shell (still in force)

| Item | Status | Notes |
| --- | --- | --- |
| Full-width Canvas workspace | **DONE (code)** | 0 right column + 60px left rail |
| Floating Widget Library / Fields | **DONE (code)** | Overlay; does not resize Canvas |
| UI verification | **UI NOT VERIFIED** | Owner pass |

Layout ownership: Puck still owns document/selection/history/Fields/registry/canvas; presentation only (no second editor engine).

## Baseline

- Branch: `codex/style-engine-feature-expansion`
- Start HEAD: `f82e8af` (no commit/push)
- Workspace: `D:\workspace-2026\zyvavu`
- Research: Behavior Contract · Regression Matrix · E298 · `docs/wix-research-coverage-matrix.md`
- Owner checklist: `docs/visual-builder-owner-acceptance.md`

## Batch / phase status

| Item | Status | Notes |
| --- | --- | --- |
| V3 Batches 1–11 | DONE (code) | UI NOT VERIFIED |
| V3 gate | PASS | Focused units |
| **V4 Phase 1 Image** | **DONE** | fit/position/caption/link/mediaId |
| **V4 Phase 2 Video** | **DONE** | Video atom + **ActionBar Change Video + Link** |
| **V4 Phase 3 Content** | **DONE (selective)** | TextBlock `ctaNewTab`; composition patterns |
| **V4 Phase 4 Gallery** | **DONE (V1)** | Grid + **per-item alt/caption/href/replace Fields** |
| **V4 Phase 5 Mega Menu** | **AUDIT ONLY** | No engine rewrite |
| **V4 Phase 6 Data-bound** | **DONE (parity)** | FeaturedMedia + **ItemImage** fit/aspect |
| **V4 Phase 7 Patterns** | **DONE (selective)** | Hero/Testimonial/Gallery + Batch 11 |
| V4 Phase 8–9 Responsive/Perf | PARTIAL | PO V1 responsive; lazy img; no library autoplay |
| V4 Phase 10 Regression | PARTIAL | Focused units PASS; UI NOT VERIFIED |
| **Atom-Specific Editors** | **DONE (code)** | Button / Image / Link host |
| **Coverage matrix** | **DONE** | `docs/wix-research-coverage-matrix.md` |

---

## This batch (coverage completion)

### Video ActionBar (E287)
- `ImageQuickAction` supports `kind: 'Image' | 'Video'`
- Video ActionBar: **Change Video** + shared **Link** (`AtomWidgetLinkHost`)
- Poster auto-fill when Media returns `posterUrl`

### Gallery per-item Fields (E277 V1; organizer OUT)
- Per-item preview, Replace, Remove, Alt, Caption, Link URL
- Add images + Clear all retained
- Frontend already renders caption/href; unsafe `javascript:`/`data:` rejected

### ItemImage data-bound parity
- `objectFit` Fields + serializer
- Portrait `3:4` aspect (with FeaturedMedia)

### Docs
- Coverage matrix created
- Owner acceptance regrouped A–L for Nov 11

---

## Coverage rollup (source-verified)

| Status | Count |
| --- | ---: |
| Audited research rows | 54 |
| IMPLEMENTED | 28 |
| PARTIAL | 9 |
| MISSING (verified + in-scope) | 0 |
| BLOCKED | 5 |
| OUT_OF_SCOPE | 12 |

### Remaining safe engineering (none required before Nov 11 UI)
- No additional VERIFIED+IN_SCOPE MISSING rows after this batch.
- PARTIAL items are intentional product limits or research-gated (Scroll shell, Mega Menu audit, Section Fields width/padding, TextBlock Style ownership, responsive beyond V1).
- BLOCKED: Button Icon/Layout, Wrapping/Overflow UI, full-width CTA, production migrate, Scroll/Mouse animation catalogs.

---

## Tests (this checkpoint)

```
pnpm exec vitest run \
  tests/unit/atom-specific-editors.unit.spec.tsx \
  tests/unit/domain-style-entry-points.unit.spec.tsx \
  tests/unit/button-style.unit.spec.tsx \
  tests/unit/style-expansion.unit.spec.tsx \
  tests/unit/v4-media-widgets.unit.spec.tsx \
  tests/unit/tiptap-link-editor.unit.spec.ts
```

**49/49 PASS** · CODE / TEST VERIFIED · **UI NOT VERIFIED**

### Known unrelated / blocked
- Pre-existing `tsc`: AnimationPresetPicker, TipTap extensions, domains generics, PostTitle fields
- `mega-menu-builder.unit.spec.ts` CSS import flake via Media picker graph — not modified
- Production build / migrate: BLOCKED by policy

---

## Unsupported Wix behaviors (explicit)

- Wix Gallery Organizer / masonry / complex gallery animations (TC-B11+)
- Video hosting backend
- Absolute canvas positioning
- Rewriting Mega Menu engine
- Button Icon / Normal Layout chrome
- Scroll/Mouse animation full catalogs
- Wrapping/Overflow typography (research-gated)
- Full-width CTA width=100% without style contract

## Next exact task

1. **Nov 11 PO consolidated UI acceptance** using `docs/visual-builder-owner-acceptance.md` groups A–L.
2. Agent fixes only FAIL items after owner screenshots/notes.
3. Commit only when PO requests.
