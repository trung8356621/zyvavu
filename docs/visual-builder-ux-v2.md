# Visual Builder UX V2

Implementation on `codex/style-engine-feature-expansion`, based on `4697624`.

The [effective Style defaults contract](style-engine-effective-defaults.md) records the 2026-11-11 display, precedence and reset decision. Named presets retain semantic option labels. Typography can show the resolved value beside its source.

## Architecture and working behavior

- `PuckHost` owns document updates. The stable Puck overrides remain module-level; style sessions sit outside the transient ActionBar.
- **PO 2026-11-11 UX V5 (final — supersedes Style Dock + centered Style Modal):**
  1. **One-row Theme Builder header** — Themes back, Template menu, Page/context Select, Undo/Redo (Puck history), native interactive Preview, unsaved dot, Save. Viewport and zoom stay on Puck's canvas controls. The left rail shows Widget Library, Outline, Page/Header Settings and Theme Settings where available.
  2. **Three-action Widget ActionBar** — `[Name] | Settings | Design | More`. Settings opens Puck Fields. Design shows supported domains in a menu and opens the selected domain in the floating panel. More contains native Select Parent, Duplicate and Delete when Puck supplies them, plus contextual Link, media replacement and Save as Pattern.
  3. **Non-modal Floating Design Panel** — shared `SharedDraggableModal` `mode="floating"`, ~420px, right-anchored, no backdrop, no focus trap, Canvas stays interactive and does not resize. Collapse keeps session/domain/target behind a restore chip; Close/Cancel/Reset/Undo remain distinct. Link Editor stays docked. Opening Design still hides Fields; Cancel/close restores Fields. Puck selection stays locked to the Design target while open.
- **Workspace shell:** Puck still owns data, selection, history, Fields and Canvas. Only the tool rail reserves space. Library, Outline, Page Settings, Theme Settings and Fields share a panel header and close control. Design is positioned relative to the workspace's right edge.
- `domains.ts` maps global domains and text/button extras to modal titles, scoped domain reset, and Accordion **group** reset (`resetStyleGroup`). Section has four actions; its Borders domain also contains the existing shadow/effects controls. Other eligible widgets have separate Shadow/Effects actions. Heading/Text typography is Fields-owned (`FIELDS_OWNED_STYLE_DOMAINS`); TextBlock and Button Design still expose Typography in Style domains. Semantic tags stay in Widget Settings. No container typography or new inheritance system is introduced.
- `WidgetStyleContextMenu` hosts **one domain body at a time** (title `Background · …` / `Layout · …`, etc.) in the shared Style dialog. Accordion is used only when a subgroup has enough controls (Background: Surface stays open with Color/Image/Video; Pattern Accordion; no empty Media group. Layout: Spacing/Dimensions/Alignment; Borders: Border/Radius). Direct-commit + session Cancel remain; domain Reset clears only the active domain; group Reset clears one Accordion group. No global cross-domain reset. Undo/Redo stay on Puck history.
- `withWidgetStyleSurface` composes the existing native renderer root in editor and frontend. It uses the current serializer and separate background layers, preserves grid children/sticky position and avoids adding a generic wrapper to built-in native roots. Fragment renderers use the shared surface composition. Section retains its existing section-specific renderer and page layout behavior. No new theme or CSS serializer is introduced.
- `WidgetPatternLibrary` derives categories from the current Puck config. Theme Builder hosts categories, search and results inside the floating tool panel. Close or Escape returns focus to the tool icon. The standalone PuckHost library retains its resizable overlay and local width preference. Preview cards and click-to-insert use the existing catalog.
- **My Patterns** opens from a compact rail icon into a dedicated modal (search, preview, insert, rename, delete with confirmation, empty/loading/error). System Patterns remain in the Widget Library. **Save as Pattern** lives on the selected widget ActionBar overflow menu and the right-click style domain launcher (disabled when the selection cannot be serialized). Naming dialog uses `serializeSelectedPattern` for the selected subtree only.
- **User pattern persistence (V1):** authenticated `/api/user-patterns` APIs store one versioned JSON file per pattern under durable `private/user-patterns/<ownerId>/<patternId>.json` (not DB, not `.next`/src). Site-staff only; owner-scoped folders; server-generated/validated ids; atomic writes; schema/size checks; rename keeps stable id. Media refs stay as references (no Base64 / no second HTML representation). Multi-instance/ephemeral hosts need a shared durable volume for `private/` (same constraint as pattern thumbnails). Legacy Payload `widget-patterns` collection is unused by the new UI.
- `widget-patterns.ts` holds a versioned, extensible registry, separate from background textures. V1 has six actual-widget designs: airy/patterned Sections, editorial/card TextBlocks, balanced/feature Columns. Pattern cards use a faithful lightweight preview of the same style serializer. The ordinary widget list remains available separately using each real widget's defaults.
- Pattern insertion/application uses one public Puck `setData` action. Insertion generates unique IDs recursively and wraps page-root widgets in Section. Selected container slots can be chosen explicitly. Candidate validation covers allowed widget types, slot allow/disallow rules, Section placement, duplicate IDs, required/unique capabilities, locks and style validation. Apply changes only whitelisted presentation fields, preserves text/bindings/IDs/slots and refuses column changes that hide occupied columns. Nested pattern structures are insert-only to preserve existing content.
- `animation-replay.ts` plays finite WAAPI animation on the current sample or selected canvas element, including same-origin Puck iframe lookup. It uses current draft preset/duration, cancels on replay/close/completion and honors reduced motion. It never dispatches Puck data/history, changes React keys or remounts the canvas widget. Editor iframe CSS suppresses automatic CSS loops/hover motion; frontend runtime and Mega Menu compatibility retain the existing preset registry.
- Background patterns are structured `background.pattern` options: none/dots/grid/stripes/diagonal/noise, semantic color token, opacity and sm/md/lg scale. Legacy `background.image.pattern` remains a fallback. Opacity stays on the texture layer. No raw SVG/CSS is stored. Image/video/overlay controls use the same existing layer renderer, with reduced-motion video poster fallback.

## Explicit shell behavior and limitations

- Button Design V1 persists Normal (Background, Text/typography, Border, Radius, Shadow) and Hover (background, text color, border color, shadow, opacity, transform) through `style.button` + CSS hover variables. The focused dock lists **only supported groups** (no empty Icon / Normal Layout tabs). Icon and Normal Layout remain unavailable and are rejected by validation. Presets: Filled (`theme`) / Outline. Button Fields show **Label only**; link uses ActionBar → shared Link Editor. Style toolbar puts **Button Design** first and omits duplicate Background/Borders docks.
- Scroll animation remains disabled/shell-only. Canvas tests are finite even for Loop. Animation playback requires WAAPI and access to the same-origin preview document; failures/reduced motion give explicit feedback.
- Library uses click insertion. External pattern dragging was not implemented or simulated. Existing Puck canvas drag/drop remains its own engine.
- Preview cards are deliberately lightweight, not full data-connected frontend pages. V1 catalog has no authored nested pattern yet; nested slot support and validation are available for extensions.
- Shared floating tools focus controls and return focus without trapping users away from the canvas. Dialog confirmation uses Mantine's modal behavior. Focus, stacking, contrast, scroll and responsive appearance require owner acceptance.
- Developer-supplied custom renderer overrides must adopt the shared surface adapter before advertising global style support.

## Atom Settings vs Style ownership

- **Primary settings** = native Puck Fields (Widget Settings). Single-click selection exposes Fields, and the ActionBar Settings control reopens them.
- **Heading + Text:** Fields include Content (and Heading HTML Tag) plus Style Engine `TypographyStyleControl` via `puckTypographyStyleField` writing `props.style.typography`. Both are listed in `FIELDS_OWNED_STYLE_DOMAINS` so domain Style panels do not duplicate typography. Document Title / Category Title / PostTitle share the same Fields-owned typography (no Content).
- **Domain Style panels** (toolbar buttons) keep shared presentation domains not owned by Fields (animation/background/layout/borders). Opening a Style domain still hides Fields; Cancel restores Fields.
- Button / Image / Section / TextBlock Fields migration follows the same pattern where needed.
- Verified Style duplicates removed from Atom Settings UI only: `PostTitle.align`, `TextBlock.align`, `CategoryHeader.align`, `Section.minHeight`, `FeaturedMedia.rounded`, `ItemImage.borderRadius`. Props/defaultProps retained for saved-data compatibility.
- Gaps kept in Fields until Style domain parity: `Section.containerWidth` (`inherit`), `Section.verticalPadding` (vertical-only).
- Typography V1 (Heading/Text Fields): font family/weight/size, line height, letter spacing, align, color, font style, decoration, transform. Unset keys inherit theme/HTML-tag CSS; property/domain resets clear overrides only.
- **Responsive Style V1:** Desktop base remains root `style.*`. Explicit `style.responsive.tablet|mobile` overrides for typography `fontSize`/`lineHeight`/`align` and spacing only (no Wix font math). Breakpoints: tablet `max-width: 1024px`, mobile `max-width: 767px`. Scoped CSS injected via `data-zyvavu-style-id`. Legacy hide/stack flags untouched.
- **Typography units (PO):** Use the existing theme typography scale as authored (theme token sizes). Reuse Tailwind-compatible conventions when tokens are rem/`text-*` scale values — **do not** invent a rem/em conversion layer, Wix-style responsive font conversion, or store Tailwind class strings in the Style Engine. Storage remains semantic presets/tokens (`h1`, `p1`, weight/spacing presets); rendering stays CSS-variable / serializer compatible.
- **Global Theme Builder UX — Semantic Labels:** For every named preset/token control (Typography, Spacing, Borders, Radius, Blur, Pattern scale, Page Settings layout, etc.), the closed Select and open dropdown show **semantic names only** (e.g. Compact / Normal / Relaxed / Loose; Heading 1 / Heading 2 / Paragraph 1; Regular / Medium / Semi Bold / Bold; Small / Medium / Large; Thin / Medium / Thick). Do **not** append raw px/rem/%/token-id suffixes to preset labels. Show actual numeric/CSS values only in custom-value edit mode. Do not invent names for arbitrary values. Storage schemas stay token ids; Theme token changes still flow to inheriting widgets; computed defaults are never persisted as overrides; Reset/Undo/Redo unchanged. Shared labels live in `src/lib/style-engine/semantic-preset-labels.ts`.
- **Typography Fields chrome (UX refinement):** Effective inherited values render as **real selected Select values** with semantic labels (full-contrast text) — not placeholders and not dimmed/disabled styling. Source chips use semantic Theme names (e.g. `Theme Heading 1`). Internal inherited/override state is preserved; computed defaults are never persisted. Editing writes an override; Reset clears overrides only. Short labels, aligned rows, compact spacing. Fields still own Heading/Text typography; no duplicate Typography Style domain or gear.
- **Widget Library chrome:** Cards show **preview only** (no visible preset name, description, type label, or “Default widget”). Names/IDs remain in the registry for search, `aria-label`/`title`, and internal identity. Preview height is capped (~7.5rem); hover/selected use a subtle outline. Empty Section shells and nested Columns use lightweight structure previews (`PatternPreview`) that mirror serializer layers; complex patterns keep lazy thumbnails with `object-fit: cover` and fall back to structure preview on load failure.
- **Link Editor V2:** Docked accordion destinations; only None/Page/Web/Email/Phone are selectable. Unavailable destinations stay visible/disabled. Escape matches Cancel (discard draft + refocus). Apply restores the frozen Tiptap selection range before mutating the link mark.
- **Theme color labels:** User-facing surfaces use `colorTokenLabel` / `COLOR_TOKEN_LABELS` (semantic names). Do not show CSS variables or raw token IDs as the primary label.
- **Batch 11 presets:** Image aspects include Square (`1:1`) and Portrait (`3:4`) alongside 16:9 / 4:3 / 21:9. New Section layouts: Image+Text, Text+Image, Feature grid, CTA, Editorial intro — nested Section→Columns/Heading/Image/Button only (no absolute positioning). Heading/P/Button families reuse the existing catalog rather than near-duplicate variants. Owner checklist: `docs/visual-builder-owner-acceptance.md`.
- **V4 media widgets:** Image Settings add object-fit/position, caption, and optional link. New **Video** atom reuses Payload Media Library (poster + controls; no library autoplay; reduced-motion poster). New **Gallery** widget is CSS Grid only (columns/gap/aspect/fit; Media Library add). Patterns: `section-hero-cta`, `section-testimonial`, `section-gallery`. Mega Menu engine unchanged (regression-first).
- **Atom-Specific Editors:** Image Fields collapse into one compact `ImageEditorPanel` (preview/change/remove/alt/caption/aspect/fit/position). Image/Button/Video **Link** opens the canonical docked Link Editor via ActionBar (`AtomWidgetLinkHost`); close restores Widget Settings. Image Style dock is chrome-only (spacing/borders/animation ± shadow/effects). Video ActionBar **Change Video** reuses the Image quick-action host (`kind: 'Video'`). Gallery Fields support per-item alt/caption/href/replace (no Wix organizer). ItemImage matches FeaturedMedia fit + portrait aspect. No Pattern Library expansion beyond selective V4 patterns.

- **Document Title:** Thin wrapper around Heading (`DocumentTitle` system block and legacy `PostTitle`). Reuses Heading rendering, HTML Tag, and Fields typography. Content comes from `document.title` (read-only) — no Content field and no Puck inline/double-click text editing. No separate Document Title typography engine or sync layer. Binding/serialization unchanged.
- **Unified Heading text widget + Tiptap inline UX:** Free **Heading** is the single user-facing text atom. HTML Tag options are **H1–H6 + P** (P = semantic paragraph; inherits Theme Typography via existing Style Engine — tag `p` resolves to preset `p1` when unset). The redundant free **Text** atom stays registered for legacy documents but is **hidden from Widget Library insertions**; body `copy-*` presets now insert `Heading` with `tag: 'p'`. DocumentTitle / CategoryTitle / PostTitle remain read-only Heading wrappers and **never expose P** in their HTML Tag field.
  - **Interaction:** Single-click selects (Fields + ActionBar). Double-click enters one shared Tiptap session for H1–H6 and P. Editing containment uses the visible `[data-puck-component]` outline rect (not DOM-contains alone): blank clicks inside the outline keep editing and place the caret; clicks that hit a parent but remain in-outline are claimed (`stopPropagation`) so Puck does not reselect. Compact floating toolbar (Bold / Italic / Underline / Link) is portaled with fixed positioning, flips above/below to avoid clipping. Toolbar/link modal clicks never commit. Outside click / real selection change / H1–H6 Enter / unmount → **commit** one `replace` (`recordHistory: true`). P (and legacy Text) Enter inserts a paragraph. Escape → **cancel** entire session (no persistence). Idle/active shells use `registerOverlayPortal` (`disableDrag` while editing).
  - **Serialization:** `props.text` stays a string. Unmarked = exact legacy plain. Rich content uses `<!--zyvavu-rt:v1-->` + SSR-safe allowlisted HTML (`p`, `br`, `strong`/`b`, `em`/`i`, `u`, `s`, `a` with sanitized `href` only — no `javascript:`/`data:`). No Tiptap JSON. No second history owner.
  - **Typography:** Fields / Style Engine remain the sole style owner; Tiptap inherits rendered typography. No second font/color picker in the editor.
  - **V1 limits:** Fields Content may show rich marker/HTML; no tables/media/mentions/AI; Theme Builder canvas UI requires owner login for full visual PASS.
- **Background domain chrome:** Surface stays open with Color / Image / Video. Pattern is a single Accordion subgroup (no duplicate Media accordion, no nested explanatory blocks). Domain editors remain focused per toolbar button inside the shared Style modal — never one giant cross-domain accordion and never a second right-side Style dock.
- **Widget Library chrome:** Merged Heading + Text category, atom-first order, whole-card insert, lazy thumbnails for image-heavy Sections/Patterns. Preview cards stay readable without shrinking Canvas.

## Persistence and boundaries

Existing document ownership, IDs, bindings, theme tokens, frontend SSR, URL Registry, authentication, publish lifecycle and Media Grid/Table are preserved. `background.pattern` is an optional JSON style extension; legacy documents remain accepted. User Widget Patterns are file-backed under `private/user-patterns/` (gitignored). No DB schema/migration, production migration, seed, test record, package installation, service restart, commit, push or merge is part of this work. Global theme.json is unchanged.

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
