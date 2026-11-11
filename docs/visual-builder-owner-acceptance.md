# Visual Builder — Owner Acceptance Pack (Nov 11)

## Workspace recovery QA — 2026-11-11

Browser status: **UI NOT VERIFIED**. The owner supplied a screenshot of an authenticated Admin dashboard at `127.0.0.1:3107/admin`. The Codex session received the tab URL and screenshot but had no browser interaction capability. The dashboard screenshot cannot establish the Editor's layout or behavior. No Editor screenshots were captured.

### Reported defects and reproduction

These findings were diagnosed from source against the reported symptoms. Severity is provisional pending a browser retest.

- **UX-01 · P1 · Puck layout and tool rail.** Open Theme Builder, then Page Settings or Outline. Expected: one icon per tool and a readable independent panel. Reported: duplicate icons, navigation at bottom-left, and content wrapping inside a narrow column. Source evidence: the prior grid allocated the library rail width to Puck's entire left sidebar and positioned Puck navigation at its bottom. The new rail and tool panels sit outside that sidebar. Status: browser retest **BLOCKED**.
- **UX-02 · P2 · Widget Fields and library.** Select a widget, open Settings, and open and close Blocks. Expected: consistent headers, scroll, focus restoration, and no canvas width change. Reported: mismatched presentation and compressed controls. Source evidence: Puck's native Fields heading was rendered above the custom heading, and the library positioned its results relative to the category rail. Both now use workspace panel chrome. Status: browser retest **BLOCKED**.
- **UX-03 · P2 · Widget ActionBar.** Select Image or Video, open Design and More, and repeat on a narrower preview. Expected: label and compact Settings, Design, More controls. Reported: a wide toolbar and unclear or duplicate actions. Source evidence: the prior toolbar rendered the full-width media trigger, parent selection, Duplicate and Delete alongside the three main actions, and repeated Design domains in More. Contextual actions now live under More. Status: browser retest **BLOCKED**.
- **UX-04 · P2 · Floating Design.** Open a supported Design domain, minimize, restore, close, then open Widget Settings. Expected: a right-aligned panel within the workspace, with independent scroll and the original session after restore. Reported: unverified interaction and awkward placement. Source evidence: Design used a fixed viewport position with hard-coded offsets. It now uses the workspace as its containing block. Status: browser retest **BLOCKED**.

### Workspace cases at both viewport sizes

Run each case at **1366×768** and **1920×1080**. Record screenshots for failures, actual versus expected behavior, and whether the canvas remains usable. Record the preview width and scroll behavior before and after opening each panel.

1. Open and close Widget Library.
2. Open and close Outline.
3. Open and close Page Settings.
4. Open and close Theme Settings on Single, Page, or Category.
5. Select Heading and a legacy Text widget where present.
6. Select Button.
7. Select Image and FeaturedMedia in their supported contexts.
8. Open and close native Widget Fields.
9. Open the capability-filtered Design menu.
10. Open Animation on a supported widget.
11. Switch Design domains and inspect the previous domain after returning.
12. Minimize and restore Design, confirming the domain and target.
13. Close Design and confirm Fields return.
14. Switch widgets after closing Design. While Design is open, verify the existing selection lock.
15. Undo and redo an in-memory edit.
16. Change Desktop, Tablet, and Mobile, then toggle Preview in the header.
17. Zoom and scroll, checking canvas height, centering, iframe edge, clipping, stacking, and pointer input.
18. Save and reopen an isolated fixture.

### Fixture and capability inventory

The six fixture names are reserved for QA. Their creation is **BLOCKED**. The current Theme Builder saves to a site-wide Settings override keyed by theme and one of the fixed template contexts. A new fixture name alone provides no storage isolation. Use a disposable environment with those same editor routes before saving any of these cases.

- **QA-01-Atoms · 5 cases.** Implemented: Heading insertion, content, H1–H6/P and inline formatting (1); typography presets, family, weight, size, line height, letter spacing, alignment, color, Reset and history (2); Button label, Link and preset (3); supported Button Normal/Hover, background, borders, spacing and history (4); Image insert/replace, alt, caption, aspect, fit, position, link, Reset and history (5). Legacy Text is available on existing documents. Button Icon and unsupported Normal groups remain unavailable.
- **QA-02-Sections · 4 cases.** Implemented: Section Container and nested Columns insertion (1); slot placement, reorder and selection hierarchy (2); layout, spacing, border, background, pattern and responsive rendering (3); bound title, content, metadata, media and archive widgets in allowed contexts (4). Section's inner container is part of the Section renderer.
- **QA-03-Media · 4 cases.** Implemented: Video insert/replace and poster (1); controls, reduced-motion fallback and responsive rendering (2); Gallery add/replace/remove and per-item alt/caption/href (3); Gallery columns/gap/aspect/fit and FeaturedMedia/ItemImage fit and aspect parity (4). Gallery organizer and masonry are excluded.
- **QA-04-Style · 5 cases.** Use each widget's registered capabilities. Verify Background and Pattern, including the shared color palette (1); Layout and Spacing (2); linked/unlinked Border and Radius, preserving asymmetric values (3); Animation and Effects, including replay and reduced motion (4); cross-domain isolation, direct commit, Cancel, Reset, minimize, reopen and history (5). Scroll animation is a disabled shell. Domain availability varies by widget.
- **QA-05-Responsive · 3 cases.** Implemented: Desktop/Tablet/Mobile viewport and selection persistence (1); explicit font size, line height, alignment and spacing overrides (2); Reset isolation and switching breakpoints with fresh values (3). Existing responsive behavior covers explicit overrides, with Wix sizing formulas outside scope.
- **QA-06-Regression · 9 cases.** Verify select A → edit → B → A (1); close → reopen (2); edit → Undo → Redo (3); theme token inheritance and override → Reset (4); Desktop → Mobile → Desktop (5); Design → close → switch widget → reopen (6); insert → Undo → Redo (7); Save → reopen and full reload in the isolated environment (8); Link Editor across all nine rows and Apply/Cancel/Escape, selection changes, history and href generation (9). None, Page, Web address, Email and Phone are enabled. Section/Anchor, Top/Bottom, Document and Popup/Lightbox should appear disabled.

Capability sources: [widget registry](../src/lib/theme-engine/widget-registry-editor.ts), [style capabilities](../src/lib/style-engine/capabilities.ts), [link destination model](../src/components/builder/inline-edit/link-editor-model.ts), and [research coverage matrix](wix-research-coverage-matrix.md).

**QA count by case group:** 78 total · 0 PASS · 0 FAIL · 42 BLOCKED (36 workspace cases and 6 fixture setups) · 30 NOT_TESTED (capability cases) · 6 OUT_OF_SCOPE (Gallery organizer/masonry, absolute positioning, video hosting, Button Icon, full Scroll/Mouse catalogs, and Mega Menu rewrite). The counts refer to browser QA. Expected disabled controls are covered in the relevant capability cases.

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
| **Editor UX V5 (PO 2026-11-11 final)** | **DONE** | CODE / TEST · UI NOT VERIFIED — one-row header, 3-action bar, floating Design Panel |
| Floating Design Panel (non-modal) | DONE | CODE / TEST · UI NOT VERIFIED — supersedes centered Style modal |
| Style selection lock + ActionBar alignment | DONE | CODE / TEST · UI NOT VERIFIED |
| **Full-width Workspace Shell (PO 2026-11-11)** | **DONE** | CODE / TEST · UI NOT VERIFIED — no permanent 3-col width |
| Floating Library + Floating Fields | DONE | CODE / TEST · UI NOT VERIFIED |
| Compact Theme Builder header (UX V5) | DONE | CODE / TEST · UI NOT VERIFIED |

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
| A4 | Close library with Escape; reopen and switch category | Focus returns to Blocks; Canvas dimensions stay stable | PO library | UI NOT VERIFIED |

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
| E2 | Section Background solid/gradient/pattern → Cancel/Reset | Session Cancel restores; domain Reset scoped; Design remains anchored to the workspace | E64 / PO 2026-11-11 | UI NOT VERIFIED |
| E2b | Open Animation/Background/Layout/Borders from ActionBar | Same modal host; header shows widget + domain; selection outline remains | PO Style modal | UI NOT VERIFIED |
| E2c | Style open → click canvas elsewhere → close Style | Selection stays on Style target; Fields restored on close | selection lock | UI NOT VERIFIED |
| E2d | ActionBar Settings, Design, More at 1366 / 1920 | One row; compact controls and contextual actions in More | ActionBar CSS | UI NOT VERIFIED |
| E2e | Default load: no empty left/right reserved columns | Canvas uses remaining workspace alongside the tool rail | Workspace shell | UI NOT VERIFIED |
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
