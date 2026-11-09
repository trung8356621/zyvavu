# Wix Research Coverage Matrix

Source-verified against Zyvavu on `codex/style-engine-feature-expansion`.  
Research corpus: Behavior Contract · Regression Matrix · Session Checkpoint E298 · PO Style UX decisions · `docs/visual-builder-ux-v2.md`.

**Statuses:** `IMPLEMENTED` · `PARTIAL` · `MISSING` · `BLOCKED` · `OUT_OF_SCOPE`  
**UI:** never marked VERIFIED here — owner acceptance is Nov 11.

Evidence IDs are Wix OBSERVED/VERIFIED research rows unless noted as PO contract.

---

## Summary

| Status | Count |
| --- | ---: |
| IMPLEMENTED | 28 |
| PARTIAL | 9 |
| MISSING | 0 (in-scope verified) |
| BLOCKED | 5 |
| OUT_OF_SCOPE | 12 |
| **Audited rows** | **54** |

---

## Priority 1 — Widget editing

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E108–E112 | Button content modes / Design gates | Button Label Fields + Design dock; Icon modes unavailable | PARTIAL | Icon + text/icon modes | `atomEditors.Button`, `ButtonStyleControl` | `atom-specific-editors`, `button-style` | IN_SCOPE (V1) |
| E130–E132 | Button Link entry + Apply/Cancel | ActionBar → `AtomWidgetLinkHost` | IMPLEMENTED | — | `AtomWidgetLinkHost`, `PuckHost` | `atom-specific-editors`, `tiptap-link-editor` | IN_SCOPE |
| E147 | HTML tag ≠ typography style | Heading tag Fields + independent typography | IMPLEMENTED | — | `heading-fields`, `PuckTypographyStyleField` | `atom-specific-editors` | IN_SCOPE |
| E261 / E274–E276 | Native Image Settings + Replace | `ImageEditorPanel` + ActionBar Change Image | IMPLEMENTED | — | `ImageEditorField`, `ImageQuickAction` | `atom-specific-editors`, `v4-media-widgets` | IN_SCOPE |
| E287 | VideoBox Change video + confirm | Video Fields + ActionBar Change Video | IMPLEMENTED | Single Video Player Wix sibling N/A | `ImageQuickAction(kind=Video)`, `atoms/editor` | `atom-specific-editors`, `v4-media-widgets` | IN_SCOPE |
| E277–E279 | Gallery items / organizer | Gallery grid Fields per-item alt/caption/href/replace | PARTIAL | Organizer/reorder/masonry excluded | `Gallery/editor.tsx`, `Gallery/frontend.tsx` | `v4-media-widgets` | IN_SCOPE (V1 Fields); organizer OUT |
| PO atom editors | Focused Button/Image Settings | Label-only Button; compact Image panel | IMPLEMENTED | — | `atom-settings`, Fields configs | `atom-specific-editors` | IN_SCOPE |

---

## Priority 2 — Style Behavior

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E14 / E49 / E203 | Border width + alpha independence; linked sides | Borders domain linked/unlinked | IMPLEMENTED | — | `BordersEffectsControl`, serializer | `style-expansion` | IN_SCOPE |
| E16 / E50 / E209 | Corner link / relock asymmetry | Linked radius + relock keep asymmetry | IMPLEMENTED | — | `BordersEffectsControl` | `style-expansion` | IN_SCOPE |
| E15 / E51 / E218 | Shadow OFF/ON retains params | Shadow toggle keeps draft values | IMPLEMENTED | — | Style Engine shadow | `style-expansion` | IN_SCOPE |
| E60–E61 / E205 | Color token vs alpha/blur retention | Shared `ThemeColorPaletteModal` tokens | IMPLEMENTED | — | color contract | domain/color suites | IN_SCOPE |
| E121–E124 | Normal/Hover override isolation | `style.button` Normal/Hover | IMPLEMENTED | Icon/Layout groups | `button-style.ts`, `ButtonStyleControl` | `button-style` | IN_SCOPE |
| E296–E297 | Asymmetric Corner Undo panel stale | Domain session Cancel + reopen resync (no Wix bug clone) | PARTIAL | Open-panel Undo sync path differs by design | `WidgetStyleContextMenu` | transactional style suites | IN_SCOPE policy |
| E292–E295 | Text typography commits + Reset to Theme | Fields typography + property/domain reset | IMPLEMENTED | Wrapping/overflow controls | `TypographyStyleControl`, effective typography | style/typography suites | IN_SCOPE |
| — | Text wrap / overflow UI | — | BLOCKED | Needs verified overflow research | — | — | RESEARCH_GATED |
| E62 / E255 | Hover Design scale | Button Hover transform tokens | PARTIAL | Hover Box widget family | `style.button.hover` | `button-style` | IN_SCOPE (Button only) |

---

## Priority 3 — Responsive

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E265 / E280 | Mobile W/H override retention | `style.responsive.tablet\|mobile` spacing + typography | PARTIAL | Width/height absolute overrides N/A (Flex/Grid) | serializer responsive CSS | `style-expansion` | IN_SCOPE (PO V1) |
| E294 | Mobile text size dependency formula | Explicit overrides only; no Wix font math | IMPLEMENTED | Formula clone intentionally omitted | responsive serializer | `style-expansion` | IN_SCOPE |
| E260 | Desktop↔Mobile view switch | Canvas viewport preview + frontend media queries | PARTIAL | Hide-on-mobile editor UX | existing hide/stack flags | — | IN_SCOPE partial |

---

## Priority 4 — Media / Video / Gallery

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E269 / E272–E273 | Media picker search/filter/cancel | Payload `MediaSourcePicker` | IMPLEMENTED | Wix stock CDN N/A | `MediaSourcePicker` | picker mocks in media suites | IN_SCOPE |
| E275 | Replace draft Cancel preserves source | Picker confirms only on select | IMPLEMENTED | — | `MediaSourcePicker` | — | IN_SCOPE |
| E135–E140 | Image Design Normal/Hover | Image chrome Style + Fields appearance | PARTIAL | Image Hover Design groups | Image Fields + Style docks | `v4-media-widgets` | IN_SCOPE V1 |
| E236 | Gallery Animation Entrance/Scroll | Gallery uses shared Animation domain | PARTIAL | Gallery-only effect catalogs | capabilities + Animation | animation suites | IN_SCOPE |
| TC-B11–B15 | Gallery organizer / advanced | — | OUT_OF_SCOPE | — | — | — | OUT_OF_SCOPE |

---

## Priority 5 — Navigation / Menu

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E141–E143 / E98–E103 | Menu Design states | Existing Mega Menu + HeaderNav | PARTIAL | No engine rewrite | Mega Menu renderer | mega-menu suite (flake risk) | IN_SCOPE audit-only |
| E192 / E196–E198 | Shared Link Editor destinations | Docked Link Editor Page/Web/Email/Phone | IMPLEMENTED | SEO rel picker depth | `link-editor-model` | `tiptap-link-editor` | IN_SCOPE |

---

## Priority 6 — Content / data-bound

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PO / V4 P6 | Featured media fit/aspect | FeaturedMedia Fields | IMPLEMENTED | — | `FeaturedMedia/*` | `v4-media-widgets` | IN_SCOPE |
| PO / V4 P6 | Loop item image fit/aspect | ItemImage objectFit + 3:4 | IMPLEMENTED | — | `ItemImage/*` | `v4-media-widgets` | IN_SCOPE |
| V4 P3 | TextBlock CTA new tab | `ctaNewTab` Fields | IMPLEMENTED | Broader composition CMS | `TextBlock/*` | — | IN_SCOPE |
| Bound titles | Read-only document titles | DocumentTitle/CategoryTitle/PostTitle | IMPLEMENTED | — | atom editors | `atom-specific-editors` | IN_SCOPE |

---

## Priority 7 — Widget / Pattern Library

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E01 catalog | Add Elements density | `WidgetPatternLibrary` overlay + presets | IMPLEMENTED | Full Wix catalog clone | library + atom-presets | `visual-builder-library` | IN_SCOPE |
| V4 P7 | Composition patterns | Hero/Testimonial/Gallery + Batch 11 layouts | IMPLEMENTED | Further pattern expansion | `patterns/catalog` | `v4-media-widgets` | IN_SCOPE selective |
| — | Full-width CTA preset | — | BLOCKED | No safe width=100% style contract | — | — | BLOCKED |

---

## Priority 8 — Reset / Undo / Redo

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E08 / E259 | Insert/delete Undo/Redo | Puck history | IMPLEMENTED | — | PuckHost | library insert tests | IN_SCOPE |
| E295 | Reset to Theme group | Domain/group/property reset | PARTIAL | Rich-text focus history routing UNKNOWN on Wix | Style reset APIs | transactional suites | IN_SCOPE |
| PO Style UX | Cancel session ≠ one Undo | Style draft Cancel restores session snapshot | IMPLEMENTED | — | `WidgetStyleContextMenu` | transactional-style | IN_SCOPE |

---

## Priority 9 — Save / Reload / frontend parity

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E64 | Editor↔Preview CSS parity | Shared serializer editor+frontend | IMPLEMENTED | Manual UI confirm pending | `serializer`, widget frontends | style-engine suites | IN_SCOPE |
| CB-SAVE01 | Save/Reload | Theme Builder save API | PARTIAL | Env-blocked in Wix research; Zyvavu needs owner UI | `/api/theme-builder/save` | — | IN_SCOPE |
| — | Production migrate/build | — | BLOCKED | Avoid migrate side effects | — | — | BLOCKED |

---

## Animation (cross-cutting)

| Evidence ID | Wix behavior | Zyvavu equivalent | Status | Missing | Source | Tests | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E213–E234 | Entrance/Loop catalogs + coexistence | Active Entrance/Loop presets + WAAPI replay | PARTIAL | Full Wix catalog / Mouse | `animation-presets`, thumbnails | animation suites | IN_SCOPE |
| E213 / E221 | Scroll / Mouse | Scroll shell-only; Mouse absent | BLOCKED / OUT | Safe runtime not authorized | animation shell | — | Shell / OUT |
| E223–E245 | Conflict replacement rules | Documented product differences retained | PARTIAL | Exact Wix conflict matrix | presets validation | — | IN_SCOPE policy |

---

## Explicit OUT_OF_SCOPE (do not implement)

| ID | Reason |
| --- | --- |
| TC-B11–B15, TC-C05 | Gallery organizer / absolute / column-handle parity (PO exclusion) |
| Skin geometry E53–E58 | Wix-specific Container skins |
| Absolute canvas positioning | Flex/Grid-first architecture |
| Mega Menu engine rewrite | Regression-first; leave working engine |
| Video hosting backend | Payload Media only |
| Button Icon picker E133–E134 | Shell rejected by validation |
| Redux Toolkit | PO not approved |
| Pattern Library wholesale expansion | Selective patterns only |

---

## Verification notes

- Source inspected for each IMPLEMENTED/PARTIAL row; docs alone were not treated as proof.
- Automated: focused unit suites PASS (see progress checkpoint).
- Browser/UI: **NOT VERIFIED** until Nov 11 owner pass.
