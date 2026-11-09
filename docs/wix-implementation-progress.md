# Wix Implementation Progress

Checkpoint after **Atom-Specific Editors** on top of V4 Advanced Widgets / V3 hardening.
Do **not** treat unit PASS as UI VERIFIED.

## Baseline

- Branch: `codex/style-engine-feature-expansion`
- Start HEAD: `f82e8af` (no commit/push)
- Workspace: `D:\workspace-2026\zyvavu`
- Owner checklist: `docs/visual-builder-owner-acceptance.md`

## Batch / phase status

| Item | Status | Notes |
| --- | --- | --- |
| V3 Batches 1–11 | DONE (code) | UI NOT VERIFIED |
| V3 gate (64 tests) | PASS | Re-run before V4 |
| **V4 Phase 1 Image** | **DONE** | fit/position/caption/link/mediaId |
| **V4 Phase 2 Video** | **DONE** | New Video atom + Media Library |
| **V4 Phase 3 Content** | **PARTIAL** | TextBlock `ctaNewTab`; composition patterns |
| **V4 Phase 4 Gallery** | **DONE (V1)** | Flex/Grid gallery, no masonry |
| **V4 Phase 5 Mega Menu** | **AUDIT ONLY** | Regression-first; no engine rewrite |
| **V4 Phase 6 Data-bound** | **PARTIAL** | FeaturedMedia fit/aspect parity |
| **V4 Phase 7 Patterns** | **DONE (selective)** | Hero CTA, testimonial, gallery section |
| V4 Phase 8–9 Responsive/Perf | PARTIAL | Reuses V1; lazy img; no autoplay in library |
| V4 Phase 10 Regression | PARTIAL | Focused units PASS; UI NOT VERIFIED |
| **Atom-Specific Editors** | **DONE (code)** | Button Design + Image Editor + Link host |

---

## V4 implemented

### Image atom
- Fields: `src` (+ `mediaId` via picker/Quick Action), `alt`, `aspectRatio`, `objectFit`, `objectPosition`, `caption`, `href`, `newTab`
- Renders `<figure>` + optional link; rejects `javascript:`/`data:` hrefs
- Empty default `src` (presets may use sample SVG for library cards only)

### Video atom (new)
- Atom type `Video` in `ATOM_TYPES` (auto-allowed on home/page/single/category)
- Fields: source + poster (Media Library), aspect/fit/position, caption, link, controls/loop/muted/autoplay
- Autoplay forces mute; library presets keep `src: ''` and `autoplay: false`
- Reduced-motion: global video hide + content poster reveal (`ANIMATION_CSS`)

### Gallery widget (new)
- `Gallery` registered in manifests/editor/frontend + policy
- Props: `items[]`, `columns` 2–4, `gapToken`, `aspectRatio`, `objectFit`
- CSS Grid only — no masonry / organizer backend

### Patterns
- `section-hero-cta`, `section-testimonial`, `section-gallery`
- Prior V3 layouts retained (media-start/end, feature-grid, CTA, editorial)

### TextBlock / FeaturedMedia
- TextBlock Settings exposes `ctaNewTab`
- FeaturedMedia: square/portrait aspects + `objectFit`

---

## Atom-Specific Editors (this checkpoint)

### Button
- **Fields:** Label only (`text`)
- **Link:** ActionBar → canonical `AtomWidgetLinkHost` / `InlineLinkEditor` (`href` + `newTab`)
- **Design:** Style dock `button` first — Normal (Background/Text/Border/Radius/Shadow) + Hover (Background/Text/Border/Shadow/Layout opacity·transform)
- **Reused:** Theme tokens, shared `ThemeColorPaletteModal`, existing Spacing/Animation docks
- **Unavailable:** Icon; Normal Layout (no empty disabled shells)

### Image
- **Fields:** Compact `ImageEditorPanel` (preview / Change / Remove / Alt / Caption / Aspect / Fit / Position)
- **Link:** Same ActionBar Link Editor (not duplicated in Fields)
- **Style dock:** Spacing / Borders / Animation (+ Shadow/Effects when capable) — no Background chrome duplicate
- **Media:** Existing Payload `MediaSourcePicker` + ActionBar `ImageQuickAction`; `mediaId` retained

### Heading / Text
- Unchanged unified H1–H6/P + Fields Typography + Tiptap; legacy Text still renders; bound titles read-only

### Navigation
- Selection → Widget Settings; Style/Link mutually exclusive; Close restores Atom Settings focus; dirty Style drafts use existing Apply/Cancel/Reset

## Tests (Atom editors + related)

```
pnpm exec vitest run \
  tests/unit/atom-specific-editors.unit.spec.tsx \
  tests/unit/domain-style-entry-points.unit.spec.tsx \
  tests/unit/button-style.unit.spec.tsx \
  tests/unit/style-expansion.unit.spec.tsx \
  tests/unit/v4-media-widgets.unit.spec.tsx \
  tests/unit/tiptap-link-editor.unit.spec.ts
```

**46/46 PASS** · CODE / TEST VERIFIED · **UI NOT VERIFIED**

### Known unrelated / blocked
- Pre-existing `tsc`: AnimationPresetPicker, TipTap extensions, domains generics, PostTitle fields
- `mega-menu-builder.unit.spec.ts` may fail suite import when `react-image-crop` CSS loads via Media picker graph — not modified this batch

---

## Unsupported Wix behaviors (explicit)

- Wix Gallery Organizer / masonry / complex gallery animations
- Video hosting backend
- Absolute canvas positioning
- Rewriting Mega Menu engine
- Second navigation or media database
- Button Icon / Normal Layout chrome
- Pattern Library expansion (explicitly out of this atom-editors task)

## Next exact task

1. Owner UI acceptance: Button Design + Image Editor + Link at 1366×768 / 1920×1080.
2. Optional: Gallery per-item caption/href editors beyond Media add; Video ActionBar quick replace.
3. Mega Menu: run suite with CSS mock if CI flakes; no rewrite.
