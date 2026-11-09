# Wix Implementation Progress

Checkpoint after **Coverage Completion batch** (Video ActionBar + Gallery item Fields + ItemImage parity + Nov 11 acceptance pack).  
Do **not** treat unit PASS as UI VERIFIED.

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
