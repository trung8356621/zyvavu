# Widget Capability Backlog

Read-only Product Owner view for Theme Builder / Public renderer gaps discovered during theme work. Entries classify against the **verified** Widget Registry, Style Engine, Frontend Renderer, and Pattern system. They do **not** change an already-approved Stage 0 assessment unless the owner re-opens scope.

**Statuses:** `SUPPORTED` | `COMPOSABLE` | `MISSING` | `UNSUPPORTED` | `IMPLEMENTED`  
**Owner decisions (separate from detection):** `REUSE` | `BUILD` | `DEFER` | `REJECT` | `null` (pending)  
**Rule:** `BUILD` only records approval for a later coding task. It does not register widgets or clear Stage 0 readiness by itself. `IMPLEMENTED` means registry + runtime + verification for that coding task completed; existing approved Stage 0 assessments stay unchanged until re-assessed.

Source theme context: Theme Builder testing for `mcp-blog-test-2` (2026-11-12).

---

## CB-001 — Promotional Banner

| Field | Value |
| --- | --- |
| Intent id | `ui.promotional-banner` |
| Need | Promotional block: image or background, Heading, description, CTA |
| Status | **COMPOSABLE** |
| Decision | **REUSE** — compose + optional Pattern. Do **not** invent a dedicated Theme Builder Promotional Banner widget |
| Evidence | verified |

### Existing capabilities (verified)

| Layer | What exists |
| --- | --- |
| Widget Registry | Atoms `Heading`, `Text`, `Button`, `Image`; containers `Section`, `Columns`. No dedicated `PromotionalBanner` / `PromoBanner` Theme Builder widget |
| Style Engine | `Section` domains include `background` (solid / gradient / mesh / image + overlay), `spacing`, `dimensions`, `section`, `animation` |
| Renderer | Section → nested atoms/containers; SSR Style Engine surfaces and overlays |
| Patterns | Catalog already covers close compositions: `section-hero-cta`, `section-cta`, `section-media-start`, `section-media-end`, `section-split`; Image preset `media-banner` (21:9). User Pattern save path exists (`private/user-patterns`) |

### Out of scope / do not conflate

- Mega Menu builder `PromoBannerBlock` — menu chrome only, not Theme template widgets.
- Legacy Payload page `banner` content block — not Theme Builder / Style Engine widgets.
- **Banner Slider** (`BannerSlider` / `SlideItem`) — multi-slide carousel; separate capability (`ui.banner-slider`).

### Proposed composition (REUSE)

1. Root `Section` with background image/color (and overlay if needed) **or** `Columns` + `Image` + copy column.
2. Nested `Heading` (title), `Heading`/`Text` (description), `Button` (CTA + `href`).
3. Optionally save the authored tree as a **user Pattern** once the layout is approved.

### Owner decision table

| Option | Meaning |
| --- | --- |
| `REUSE` | Compose with Section/Atoms; save Pattern if useful. No widget coding task |
| `BUILD` | Only after documenting why composition failed; then a separate coding batch |
| `DEFER` / `REJECT` | Explicit owner choice |

---

## CB-002 — Animated Counter / Count Up

| Field | Value |
| --- | --- |
| Intent id | `ui.animated-counter` |
| Need | Statistic that starts at 0 and animates to a target when scrolled into view. **Not** a countdown timer |
| Status | **IMPLEMENTED** |
| Decision | `BUILD` completed — widget registered and verified in coding task |
| Evidence | verified |

### Implemented capability (verified)

| Layer | Finding |
| --- | --- |
| Widget Registry | `AnimatedCounter` in manifests / editor / frontend registries |
| Behavior | `targetValue`, `durationMs`, `prefix`/`suffix`, `decimals`, `useGrouping`, `triggerOnce` (default on), IntersectionObserver trigger, `prefers-reduced-motion` → final value |
| Style Engine | Shared typography / spacing / background / border domains (no separate Counter Style panel) |
| Patterns | `counter-single-highlight`, `counter-stats-row`, `counter-editorial-milestone` |
| MCP | Intent `ui.animated-counter` → `SUPPORTED` when widget present; Architecture Auditor validates props/style |

### Explicitly out of scope

- Countdown / timer-to-zero widgets — Stage 0 intent `ui.countdown-timer` is **MISSING** (`widget:CountdownTimer`). Do **not** mark countdown needs `SUPPORTED` via `AnimatedCounter`.
- Automatic rewrite of prior Stage 0 assessments for `mcp-blog-test-2` (re-assess to pick up new snapshot)

---

## Banner Slider (related capability)

| Field | Value |
| --- | --- |
| Intent id | `ui.banner-slider` |
| Need | Editable multi-slide carousel: Section → BannerSlider → SlideItem → Atoms |
| Status | **IMPLEMENTED** |
| Decision | `BUILD` completed with Embla Carousel |
| Evidence | verified |

### Implemented notes

- Tree: **Section → BannerSlider → SlideItem → nested widgets**. `SlideItem` is library **slot-only** (not a Basic insert).
- Root has **no** user Style panel; Section owns outer chrome.
- Document Style targets on the slider node: `controlsStyle.arrows`, `controlsStyle.pagination`.
- Editor dropdown **Banner Item** / active slide is editor UX: persist style on the concrete `SlideItem` node (`SlideItem.props.style`). MCP proposals must not add editor-state props.
- `SlideItem` supports Style Engine domains **except margin** (UI + validate + runtime strip).
- Field `slidesPerView` (integer 1–6, default **1**; missing/legacy → 1). Visible items ≠ carousel step size.
- Patterns: `banner-slider-hero`, `banner-slider-editorial`, `banner-slider-minimal`.
- MCP Auditor: invalid children (including Counter in `slides`), unsupported style targets, forbidden SlideItem margins, `slidesPerView` range.

### Still owned by Theme Builder lane (coordinate, do not duplicate)

- Editor Style Target wiring / active-slide UX in `WidgetStyleContextMenu` and related builder files may still be in progress.
- If the app field were renamed from `slidesPerView`, MCP must re-sync discovery + enums to the real prop name.

---

## Summary for Product Owner

| ID | Capability | Status | Suggested decision | Blocks Theme Customize/Builder? |
| --- | --- | --- | --- | --- |
| CB-001 | Promotional Banner | COMPOSABLE | `REUSE` (+ optional Pattern) | No — compose now |
| CB-002 | Animated Counter / Count Up | IMPLEMENTED | Completed `BUILD` | No for count-up need |
| — | Banner Slider | IMPLEMENTED | Completed `BUILD` | No for carousel need |
| — | Countdown Timer (`ui.countdown-timer`) | MISSING | Owner `BUILD` / `DEFER` / `REJECT` | Yes if required without decision |

**Note:** Existing approved Stage 0 assessments keep their recorded snapshot id. A **new** assessment reads the updated capability snapshot (includes `BannerSlider`, `SlideItem`, `AnimatedCounter`, and `knownGaps.countdownTimerWidget`).
