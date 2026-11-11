# Visual Builder — Owner Acceptance Pack (Nov 11)

One consolidated visual/functional pass.  
Status labels: **DONE** / **PARTIAL** / **BLOCKED** / **NOT_STARTED**.  
Verification: **CODE VERIFIED** / **TEST VERIFIED** / **UI VERIFIED** / **UI NOT VERIFIED**.

Branch: `codex/style-engine-feature-expansion` · Workspace: `D:\workspace-2026\zyvavu`  
Canonical: `https://zyvavu.test` (port 3107) · Viewports: **1366×768**, **1920×1080**.  
No commit/push in this workstream. Coverage: `docs/wix-research-coverage-matrix.md`.

---

## 1. Code status snapshot

| Area | Status | Verification |
| --- | --- | --- |
| Typography Fields + semantic presets + tag independence | DONE | CODE / TEST · UI NOT VERIFIED |
| Borders / linked radius / spacing / effects | DONE | CODE / TEST · UI NOT VERIFIED |
| Button Design V1 Normal/Hover | DONE | CODE / TEST · UI NOT VERIFIED |
| Responsive V1 (fontSize/lineHeight/align/spacing) | DONE | CODE / TEST · UI NOT VERIFIED |
| Widget / Pattern Library | DONE | CODE / TEST · UI NOT VERIFIED |
| Link Editor destinations + Apply/Cancel/Escape | DONE | CODE / TEST · UI NOT VERIFIED |
| Background layers + shared palette | DONE | CODE / TEST · UI NOT VERIFIED |
| Animation Entrance/Hover/Loop + non-mutating replay | DONE | CODE / TEST · UI NOT VERIFIED |
| Image / Video / Gallery V1 | DONE | CODE / TEST · UI NOT VERIFIED |
| Video ActionBar Change Video + Link | DONE | CODE / TEST · UI NOT VERIFIED |
| Gallery per-item Fields (alt/caption/href) | DONE | CODE / TEST · UI NOT VERIFIED |
| FeaturedMedia + ItemImage fit/aspect | DONE | CODE / TEST · UI NOT VERIFIED |
| Atom Button / Image focused editors | DONE | CODE / TEST · UI NOT VERIFIED |
| **Unified Style modal (PO 2026-11-11)** | **DONE** | CODE / TEST · UI NOT VERIFIED — supersedes Style dock |
| Style selection lock + ActionBar alignment | DONE | CODE / TEST · UI NOT VERIFIED |
| **Full-width Workspace Shell (PO 2026-11-11)** | **DONE** | CODE / TEST · UI NOT VERIFIED — no permanent 3-col width |
| Floating Library + Floating Fields | DONE | CODE / TEST · UI NOT VERIFIED |
| Compact Theme Builder header | DONE | CODE / TEST · UI NOT VERIFIED |

### Remaining / blocked (do not expand before UI FAIL)

| Item | Status | Notes |
| --- | --- | --- |
| Wrapping / Overflow typography | BLOCKED | Research-gated |
| Button Icon + Normal Layout | BLOCKED | Validation rejects unfinished Icon |
| Scroll / Mouse animation | BLOCKED / OUT | Shell-only by design |
| Section width/padding Style parity | PARTIAL | Fields-owned `inherit` |
| TextBlock typography Style ownership | PARTIAL | Documented Style vs Fields |
| Gallery organizer / masonry | OUT_OF_SCOPE | TC-B11+ |
| Mega Menu engine rewrite | OUT_OF_SCOPE | Audit-only |
| Full-width CTA width=100% | BLOCKED | No safe style contract |
| Pre-existing `tsc` debt | PARTIAL | Unrelated; separate PR |
| Production migrate / build | BLOCKED | Policy |

---

## 2. Automated tests (pre-acceptance)

```
pnpm exec vitest run \
  tests/unit/atom-specific-editors.unit.spec.tsx \
  tests/unit/domain-style-entry-points.unit.spec.tsx \
  tests/unit/button-style.unit.spec.tsx \
  tests/unit/style-expansion.unit.spec.tsx \
  tests/unit/v4-media-widgets.unit.spec.tsx \
  tests/unit/tiptap-link-editor.unit.spec.ts
```

**Result:** **49/49 PASS** · TEST VERIFIED · **UI NOT VERIFIED**

---

## 3. Manual workflow checks (Nov 11)

Mark each: PASS / FAIL / SKIP. Attach screenshot notes for FAIL.

### A. Widget Library

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| A1 | Theme Builder → Blocks; scan Heading, Button, Image, Video, Gallery, Sections | Compact preview cards; no giant clipping; Video cards do not autoplay | E01 / library | UI NOT VERIFIED |
| A2 | Insert `image-square`, `video-standard`, Gallery, `section-hero-cta`, `section-testimonial`, `section-gallery` | Inserts succeed; unique IDs | V4 P7 | UI NOT VERIFIED |
| A3 | Undo each insert; Redo once | History restores correctly | E08 / E259 | UI NOT VERIFIED |
| A4 | Resize library overlay; Escape collapse; reopen category | Overlay clamps; canvas not crushed | PO library | UI NOT VERIFIED |

### B. Heading / Text / Tiptap

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| B1 | Single-click Heading → Fields Content + Tag + Typography | Settings visible; no duplicate Typography Style dock | E147 | UI NOT VERIFIED |
| B2 | Double-click → Bold/Italic/Underline | Marks apply; Escape cancels session | PO Tiptap | UI NOT VERIFIED |
| B3 | Document Title / Category Title | No Content; no inline edit; tag+typography only | PO bound titles | UI NOT VERIFIED |

### C. Button

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| C1 | Select Button → Fields show Label only | No href/newTab in Fields | E108 / atom editors | UI NOT VERIFIED |
| C2 | ActionBar Link → Page/Web/Email/Phone → Apply / Cancel | Apply persists; Cancel restores | E130–E131 / E196–E198 | UI NOT VERIFIED |
| C3 | Style → Button Design first → Normal/Hover theme colors | No Icon tab; Spacing/Animation remain | E112 / E121 | UI NOT VERIFIED |
| C4 | Save template → Reload | Button Design survives | E64 | UI NOT VERIFIED |

### D. Image / Video / Gallery

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| D1 | Image Fields: preview, Change/Remove, alt, caption, aspect, fit, position | Single compact panel | E261 | UI NOT VERIFIED |
| D2 | Image ActionBar Change Image + Link; Cancel Link restores Fields | Shared Link Editor; no duplicate href Fields | E274–E276 / E130 | UI NOT VERIFIED |
| D3 | Video: Media Library source + poster; controls on; autoplay off | Reduced motion shows poster | E287 / reduced-motion | UI NOT VERIFIED |
| D4 | Video ActionBar Change Video + Link | Source updates; link Apply/Cancel | E287 | UI NOT VERIFIED |
| D5 | Gallery: add 3+ images; edit per-item alt/caption/href; columns 2/3/4 | Captions/links on frontend; no organizer UI | E277 V1 | UI NOT VERIFIED |
| D6 | Image/Video/Gallery Save → Reload → frontend route | Parity with canvas | E64 | UI NOT VERIFIED |

### E. Section / Container / Columns

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| E1 | Insert Section layouts (media-start, feature-grid, CTA, editorial) | Nested structure intact | Batch 11 / E250 | UI NOT VERIFIED |
| E2 | Section Background solid/gradient/pattern → Cancel/Reset | Session Cancel restores; domain Reset scoped; **large shared Style modal** (not right dock) | E64 / PO 2026-11-11 | UI NOT VERIFIED |
| E2b | Open Animation/Background/Layout/Borders from ActionBar | Same modal host; header shows widget + domain; selection outline remains | PO Style modal | UI NOT VERIFIED |
| E2c | Style open → click canvas elsewhere → close Style | Selection stays on Style target; Fields restored on close | selection lock | UI NOT VERIFIED |
| E2d | ActionBar four Style icons + overflow at 1366 / 1920 | One row height; icons/gaps/centers aligned with label | ActionBar CSS | UI NOT VERIFIED |
| E2e | Default load: no empty left/right reserved columns | Canvas uses remaining workspace; only 60px library rail | Workspace shell | UI NOT VERIFIED |
| E2f | Open Library overlay / Fields / Style | Canvas width unchanged; Style keeps selection | Workspace shell | UI NOT VERIFIED |
| E2g | Close Fields; iframe scrollbar vs preview edge | No blank strip / double scrollbar | Canvas scroll | UI NOT VERIFIED |
| E2h | Compact header one primary row | Back, theme/template, Save; details in menu | ThemeBuilder | UI NOT VERIFIED |
| E3 | Columns gap/alignment if present | No absolute positioning tools | Flex/Grid-first | UI NOT VERIFIED |
| E4 | Section `containerWidth` / `verticalPadding` in Fields | Still Fields-owned (`inherit`) — expected PARTIAL | ownership doc | UI NOT VERIFIED |

### F. Typography

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| F1 | Heading typography Select shows semantic labels only | No raw px/token suffixes on closed Select | PO semantic labels | UI NOT VERIFIED |
| F2 | Edit size/weight/color; property Reset | Clears override only; theme inheritance returns | E292–E295 | UI NOT VERIFIED |
| F3 | Change HTML Tag H2↔P independently of style | Typography not forced by tag | E147 | UI NOT VERIFIED |

### G. Background / Border / Effects

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| G1 | Background Color → shared Theme palette Solid/Gradient/Mesh | No native color input / duplicate picker | Color contract | UI NOT VERIFIED |
| G2 | Borders linked → unlink one side → relink | Linked edit fans out; relock keeps asymmetry until edit | E203 / E209 / E50 | UI NOT VERIFIED |
| G3 | Shadow OFF → edit → OFF → ON | Params retained | E51 / E218 | UI NOT VERIFIED |
| G4 | Effects/Blur where capable | Unsupported combinations rejected | validation | UI NOT VERIFIED |

### H. Responsive

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| H1 | Heading: Tablet fontSize + Mobile spacing overrides | Desktop base unchanged | E265 / PO V1 | UI NOT VERIFIED |
| H2 | Preview narrow widths / frontend media queries | Cascade applies; no leakage across duplicate widgets | serializer `data-zyvavu-style-id` | UI NOT VERIFIED |
| H3 | Reset property on responsive override | Clears override only | PO Reset | UI NOT VERIFIED |

### I. Link Editor

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| I1 | Tiptap Link → destinations; unavailable stay disabled | Only None/Page/Web/Email/Phone selectable | E192 | UI NOT VERIFIED |
| I2 | Escape = Cancel; Apply restores frozen selection | Draft discarded on Escape | E196–E198 | UI NOT VERIFIED |
| I3 | Button/Image/Video ActionBar Link | Same docked editor | atom link host | UI NOT VERIFIED |

### J. Animation

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| J1 | Entrance Fade + Loop Breathe; Test Animation | Finite replay; Undo stack unchanged | E219–E227 | UI NOT VERIFIED |
| J2 | Reduced motion enabled | No playback; content remains | reduced-motion | UI NOT VERIFIED |
| J3 | Scroll category | Shell/disabled — expected | E213 shell | UI NOT VERIFIED |

### K. Theme Customize

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| K1 | Change theme typography/color tokens | Inheriting widgets update without persisted overrides | E60 / theme | UI NOT VERIFIED |
| K2 | Mega Menu animations still work | No regression from Style Engine work | Mega Menu audit | UI NOT VERIFIED |

### L. Save / Reload / Undo / Redo

| # | Steps | Expected | Evidence | Status |
| --- | --- | --- | --- | --- |
| L1 | Style Apply then Undo/Redo | Canvas + reopened panel agree | E214 / E284 / PO | UI NOT VERIFIED |
| L2 | Dirty Style draft → switch widget → resolve | Explicit resolve; no silent loss | Style session | UI NOT VERIFIED |
| L3 | Save template → full reload → reopen widgets | Styles/media/links persist | E64 / CB-SAVE | UI NOT VERIFIED |
| L4 | Frontend published/preview route | Matches editor resolved styles | E64 | UI NOT VERIFIED |

---

## 4. Known limitations (expected)

- TipTap Undo of Link Apply is editor History; Puck history commits on text session end.
- My Patterns file-backed V1: thumbnails may stay `pending`; structure preview is fallback.
- Responsive CSS only for explicit tablet/mobile overrides.
- Gallery has no drag-reorder organizer (OUT_OF_SCOPE).

---

## 5. Post-acceptance correction order

1. Insertion/preview regressions  
2. Link selection/focus on real canvas  
3. Responsive canvas ↔ frontend mismatches  
4. Density/contrast labels  
5. Only then consider research-gated Wrapping/Overflow or Icon Button  

Commit only when PO requests.
