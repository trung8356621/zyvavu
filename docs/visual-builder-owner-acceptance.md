# Visual Builder — Owner Acceptance Checklist

Prepared for the post–Nov 11 token-reset visual pass.
Status labels: **DONE** / **PARTIAL** / **BLOCKED** / **NOT_STARTED**.
Verification: **CODE VERIFIED** / **TEST VERIFIED** / **UI VERIFIED** / **UI NOT VERIFIED**.

Branch: `codex/style-engine-feature-expansion` · Workspace: `D:\workspace-2026\zyvavu`  
No commit/push in this workstream.

---

## 1. Completed features (code)

| Area | Status | Verification |
| --- | --- | --- |
| Typography Fields + semantic presets + tag independence | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Borders / linked radius / spacing / effects | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Button Design V1 Normal/Hover | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Responsive V1 (fontSize/lineHeight/align/spacing) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Widget Library density + Button/Image presets | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Section/Pattern structure previews (Batch 5.3) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Link Editor destinations + Apply/Cancel/Escape | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Background layers + shared palette | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Animation entrance/hover/loop + non-mutating replay | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Settings ownership (Heading/P, bound titles, Button) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Batch 11 Image square/portrait + Section layouts | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| V4 Image fit/position/caption/link | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| V4 Video atom | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| V4 Gallery grid | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| V4 Hero/Testimonial/Gallery patterns | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Atom Button focused editor (Label + Link + Design) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Atom Image focused editor (Source/Appearance + Link) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |
| Atom Link host (Button/Image → InlineLinkEditor) | DONE | CODE / TEST VERIFIED · UI NOT VERIFIED |

---

## 2. Remaining / partial

| Item | Status | Notes |
| --- | --- | --- |
| Wrapping / Overflow typography | NOT_STARTED | Needs verified Wix Text research |
| Button Icon + Normal Layout | BLOCKED | Tabs hidden; validation rejects unfinished Icon |
| Scroll animation | BLOCKED | Shell-only by design |
| Section width/padding Style parity | PARTIAL | Still Fields-owned (`inherit` semantics) |
| TextBlock typography in Style (not Fields) | PARTIAL | Documented ownership |
| Gallery per-item caption/href Fields UI | PARTIAL | Props supported; add-flow via Media picker |
| Video ActionBar quick replace | NOT_STARTED | Image Quick Action only today |
| Wix Gallery masonry / organizer | NOT_STARTED | Explicitly out of scope |
| Mega Menu engine rewrite | NOT_STARTED | Regression-first; leave working engine |
| Full-width CTA button preset | NOT_STARTED | No safe width=100% style contract |
| Pre-existing `tsc` (AnimationPresetPicker, TipTap extensions, domains generics, PostTitle fields) | PARTIAL | Unrelated; not rewritten |
| Production build / migrate | BLOCKED | Avoid Payload migrate side effects |

---

## 3. Known limitations

- UI visual PASS requires owner login + manual inspection (no Playwright).
- TipTap Undo of Link Apply is editor History; Puck history commits on text session end.
- My Patterns file-backed V1: thumbnails stay `pending`; live structure preview is the fallback.
- Image aspect ratios now include `1:1` and `3:4`; legacy docs without the prop remain valid.
- Responsive CSS is scoped via `data-zyvavu-style-id` only for explicit tablet/mobile overrides.

---

## 4. Automated tests (latest focused run)

```
pnpm exec vitest run \
  tests/unit/atom-specific-editors.unit.spec.tsx \
  tests/unit/domain-style-entry-points.unit.spec.tsx \
  tests/unit/button-style.unit.spec.tsx \
  tests/unit/style-expansion.unit.spec.tsx \
  tests/unit/v4-media-widgets.unit.spec.tsx \
  tests/unit/tiptap-link-editor.unit.spec.ts
```

**Result:** 6 files · **46/46 PASS** · TEST VERIFIED (atom editors checkpoint)  
**TypeScript:** Atom-editor touched files clean of new errors; pre-existing unrelated `domains.ts` / AnimationPresetPicker / TipTap errors remain (see §2).

---

## 5. UI tests requiring owner login

Target viewports: **1366×768**, **1920×1080**. Canonical: `https://zyvavu.test` (port 3107).

### A. Widget / Pattern Library

1. Open Theme Builder → Blocks.
2. Scan Heading, Button, Image, Video, Gallery, Sections.
3. Confirm previews are compact (no giant cards / clipping). Video cards must not autoplay.
4. Insert: `image-square`, `video-standard`, Gallery widget, `section-hero-cta`, `section-testimonial`, `section-gallery`, `section-media-start`.
5. Undo each insert; Redo once.
6. Resize library overlay; collapse/reopen.

### A2. Image / Video / Gallery Settings

1. Image: single compact Fields panel — preview, Change/Remove, alt, caption, aspect, fit, position.
2. Image ActionBar Link → shared Link Editor; Cancel restores Fields focus. No duplicate href field in Fields.
3. Image ActionBar Change Image + Style Borders/Spacing; Canvas ↔ frontend parity after Save/Reload.
4. Video: pick Media Library video + poster; controls on; autoplay off by default; enable reduced motion and confirm poster remains.
5. Gallery: add 3+ images from Media Library; columns 2/3/4; gap; frontend parity.

### A3. Button focused editor

1. Select Button → Fields show Label only.
2. ActionBar Link → destination + open behavior → Apply/Cancel/Undo.
3. Button Design first in Style toolbar → Normal/Hover groups (no Icon tab) → theme color tokens → Save/Reload.
4. Confirm Spacing/Animation remain available; Background/Borders style docks are absent for Button.

### B. Tiptap + Link

1. Double-click Heading/P → Bold/Italic/Underline.
2. Select text → Link → Page / Web / Email / Phone Apply.
3. Confirm unavailable destinations cannot activate.
4. Escape vs Cancel; reopen existing link.
5. Outside click commits; Escape cancels session.

### C. Style domains

1. Select Section → Background (solid/gradient/pattern) → Apply/Cancel/Reset.
2. Borders linked → unlinked → reopen.
3. Button Design Normal/Hover → Save template → Reload.
4. Animation Test replay → confirm Undo stack unchanged.
5. Typography/Spacing Tablet/Mobile overrides → Reset property → Save/Reload.

### D. Responsive canvas / frontend

1. Set tablet fontSize + mobile spacing on a Heading.
2. Preview tablet/mobile widths if available.
3. Publish/preview frontend route; confirm cascade and no style leakage between duplicate widgets.

### E. Settings ownership

1. Single-click → Widget Settings.
2. Open Background/Layout/Borders → close → Fields visible/focused.
3. Document Title: no Content, no inline edit; tag + typography only.

---

## 6. Suggested correction order (after visual pass)

1. Any insertion/preview regressions for new Section layouts.
2. Link selection/focus issues on real canvas.
3. Responsive canvas ↔ frontend mismatches.
4. Remaining label/contrast density issues.
5. Only then consider Wrapping/Overflow or Icon Button (research-gated).

---

## 7. Exact next engineering task (post-acceptance)

1. Owner marks UI items PASS/FAIL with screenshots.
2. Agent fixes FAIL items only.
3. Optional: clean pre-existing `tsc` debt in a separate scoped PR.
4. Commit only when PO requests.
