---
name: cms-admin-design
description: Mandatory Zyvavu Payload Admin UI governance. Use Mantine's official components and sizing/theme APIs; prevent custom atoms, arbitrary sizes, per-collection styling, and regression of native Payload features.
---

# Zyvavu Admin UI — Mantine Reuse Contract (v2)

## Purpose and scope

This skill is mandatory for ANY design, component, CSS, React, navigation, admin custom view, or UI polish task involving Zyvavu **Admin**. It does not define the public Traditional/Modern frontend theme or require replacing Payload's built-in editors/forms.

Read in order before proposing or editing UI:
1. Root `AGENTS.md` and `README.md`.
2. `cms-knowledge-pack/decisions/decisions.md`, especially `DEC-CORE-001`, `DEC-CORE-003`, and `DEC-UI-001`.
3. This skill in full.
4. Current local `src/theme/theme.json`, Payload config/custom styles, installed package versions, relevant components, and Git status.

**The local repository is the source of truth.** Do not assume GitHub reflects uncommitted local changes. Never reset, overwrite, or silently refactor another agent's work. If documents and live code conflict, report before changing behavior.

## Technology decisions

- Payload CMS 3 + Next.js + PostgreSQL provide core CRUD, authorization, editors, upload, versioning, lists and navigation integration. Preserve these native workflows and security boundaries.
- **Mantine is the chosen library for custom Admin UI controls.** Prefer officially supported Mantine components and public APIs rather than inventing new atomic controls.
- Lucide is the preferred icon set (verify current installed package before import). Existing approved brand artwork may remain.
- Existing `src/theme/theme.json` is the single Zyvavu-controlled source for Admin brand colors and chosen high-level UI defaults. It also has a separate `public` section: never share Admin-only styles with the public site.
- A narrow **Mantine theme adapter/provider** may translate JSON values into Mantine's required theme structure. It must not become a second independent source of colors, sizes or defaults.
- Mantine is not a drop-in replacement for Payload's native UI. Leave Payload-native functions and components intact unless a supported extension point and a clear reason exist.

## NON-NEGOTIABLE — No custom atom factory

1. **Do not create ZyvavuButton, ZyvavuInput, ZyvavuSelect, ZyvavuBadge, ZyvavuDialog, ZyvavuTabs, etc.** when an accessible, functional Mantine (or native Payload) component already covers the need. An integration adapter is allowed only for a real interoperability constraint, documented explicitly.
2. Use Mantine's supported props, variants, theme configuration and defaultProps. Avoid creating parallel `size`, `variant` or `color` APIs.
3. No per-screen magic control sizes (`height: 43px`, `font-size: 15px`, bespoke paddings) when the component library owns that dimension. Never use CSS to imitate a Mantine control instead of using the actual component in custom UI.
4. Shared behavior must come from shared library usage and centralized theme settings, **not coincidentally identical CSS copied to many collections**.
5. Never replace native Payload CRUD/list/table/form/editor internals just to make them resemble Mantine. Use supported Payload integration points or a small explicitly scoped bridge. Do not style native controls with broad invasive selectors.
6. No installation of an additional UI kit (shadcn, Ark, etc.) without a new user decision. No new visual builder or complex wrapper framework.

## Sizing, variant, and color governance

- Use Mantine's **documented size scale** where supported: `xs`, `sm`, `md`, `lg`, `xl`.
- `md` is the default custom Admin control size; deliberate compact toolbar/table controls may use `sm`; prominent controls may use `lg` only with justified need. Do not casually vary sizes to make an individual screen attractive.
- Not all Mantine components accept exactly the same props or render at equal pixels. Inspect the installed version's real API; do NOT fabricate a universal `size` prop for a component that lacks one.
- Distinguish `controlSize` from layout `density`. Density affects spacing/table/list rhythm, not every atom's physical dimensions.
- Maintain a centralized, intentionally small Admin config under `theme.json` (proposed keys are `admin.ui.defaultSize`, `admin.ui.defaultRadius`, `admin.ui.density`); inspect current structure and secure approval for exact schema before implementation. Avoid scattering independent defaults across screens.
- Map `admin.primary` into a valid Mantine color palette/primaryColor (not just an undefined theme color name). Map background/surface/text/border with a narrowly scoped Admin provider/theme bridge. Respect Mantine's accessibility and contrast requirements.
- Use Mantine component defaults/theming whenever available. Custom component variants and CSS are last resort and must be justified, shared, documented, and tested.
- Never reinterpret existing `public` config, mutate live DB values, or modify frontend theme behavior during Admin work.

## What may remain custom

- **Business patterns**, e.g. a Payload-aware Posts status filter that actually changes the Payload query; URLs/breadcrumbs with real routing; role-aware navigation structure; a collection-specific title+slug cell.
- **Layout composition**, e.g. positioning a header, toolbar or native table, provided style is shared at pattern level and components are library/native building blocks.
- **Integration adapters**, e.g. joining MantineProvider with Payload Admin safely and mapping theme.json to theme config; a minimally scoped Payload CSS bridge where necessary.

These are NOT permission to reimplement basic UI primitives.

## Approved baseline and preservation

- As of 2026-10-13, user approved the visual direction of the **Zyvavu Admin V4 sidebar**. Keep its branding, Content/Appearance/Settings/System grouping, active state, mobile behavior, and authorization rules unless a separate request changes them.
- Existing Posts List is a functional reference, not a mandate to reproduce its one-off styles. Categories/Pages/Tags/Media should not silently receive fabricated tabs/actions.
- Preserve Payload's built-in authentication, roles, authorization, collection/global access, search, filtering, pagination, bulk operations, RichText/Lexical, draft/publish/versioning, and URL Registry behavior.
- System-admin-only routes must remain backend guarded. UI visibility checks do not replace authorization.

## Before implementation: mandatory design approval gate

For any Mantine adoption or cross-screen UI refactor, first deliver a written **PREP REPORT** and STOP. It must contain:

1. `git status`, HEAD commit, installed versions and existing UI dependencies.
2. A **component inventory**: each current UI control/pattern; native Payload vs homemade vs candidate Mantine replacement; recommended disposition (`KEEP_PAYLOAD`, `USE_MANTINE`, `RETAIN_BUSINESS_PATTERN`, `SMALL_BRIDGE`).
3. A **theme schema proposal** limited to needed `theme.json` Admin keys, plus explicit default size/radius/density choices and how Mantine reads them.
4. A **screen coverage matrix** for Posts (with records), Categories (empty), Pages, Tags, Media, Menus, Settings, Editor, Dashboard and Sidebar, listing changes and exceptions.
5. An **integration risk check** for React/Next/Payload/Mantine versions, CSS load ordering/scoping, SSR/hydration, portal overlays, color scheme, accessibility and build/runtime. Verify against installed package and official docs; label unverified risks clearly.
6. A **no-regression test plan** proving changing a single Admin config value affects every intended custom Mantine consumer, without leaking into Public or breaking native Payload.
7. Exact files proposed to change; distinguish documentation-only work from future code changes.

**STOP for user's explicit approval after this report**. No package installation, component refactoring, screen changes or migrations as part of the preparation phase.

## UI verification policy (effective immediately)

- **Do NOT run Playwright, browser automation, screenshot capture scripts, automated login scripts, or repeated browser selector debugging.**
- The project owner will manually inspect the running Admin and provide screenshots and browser errors when necessary.

**Agent responsibilities:**
- Implement UI using the approved Payload/Mantine conventions.
- Run build, typecheck, lint and appropriate non-destructive unit tests.
- Analyze user-provided screenshots and fix identified issues.
- Mark uninspected UI as NOT VERIFIED.
- Never claim visual PASS without owner confirmation.

## UI implementation verification (only after explicit approval)

- First integrate Mantine in a safe, limited Admin boundary using the library's official setup for actual installed Next/React versions and documented Payload extension points.
- Preserve the V4 sidebar unless directly instructed otherwise.
- Visual inspection is conducted manually by the project owner across key viewports (e.g. 1440×900 and mobile 390×844) comparing populated Posts with empty Categories and search-with-no-results. Agents analyze user-supplied screenshots instead of running browser automation.
- Verify keyboard/focus behavior, accessibility, filters, search, pagination, CRUD, draft/publish, role visibility, overlays/portals, and Public CSS isolation via static checks, unit tests, and user feedback.
- Show the config change proof (e.g. admin default `md` to `sm` and back; Admin primary-color change and back). Do not permanently modify production branding just for proof.
- Report UI status as PASS (only with owner confirmation), FAIL, or NOT VERIFIED. Never claim visual PASS autonomously. Builds/tests confirm code integrity, not visual acceptance.
- No commit/push without explicit user authorization.

## Decision status

User has explicitly chosen **Mantine for custom Admin UI** and **Lucide icons**, with `theme.json` as the centralized Zyvavu config. Update `DEC-UI-001` accordingly as a decision covering **Admin**, not automatically Public. If older documents mention shadcn/Embla as proposed for Public themes, preserve that separate Public question; do not silently supersede it.

## UI state quality — adapted from SEO-OPS SaaS design Skill

These presentation rules reinforce the current Payload/Mantine contract; they do not create another design system.

- A screen should have one page title, clear primary action and quieter secondary actions. Do not duplicate titles inside nested panels.
- Keep shared page gutters and alignment consistent among header, toolbar, content panels and tables.
- Prefer calm surfaces, one accent color, modest borders and predictable spacing from existing tokens; avoid card-inside-card decoration, decorative gradients, oversized empty panels and excessive shadows.
- Use library-native controls. Do not copy one-off CSS size rules between screens.
- A modal/drawer opened by user action should show immediate visual feedback. If asynchronous preparation is needed, show a scoped loading state; disable actions depending on incomplete data, and show a meaningful recoverable error if loading fails. Avoid stale data flashes, double submits and blocking the whole page for a local drawer.
- Protect native Payload dialogs, document-conflict warnings, unsaved changes and permissions. The owner has explicitly observed transparent overlay surfaces and white-on-white buttons; treat contrast/background/portal scoping regressions as P0 UI bugs.
- Distinguish not configured, genuinely empty, loading, stale and failed states. Do not fabricate data, duplicate action buttons or place an empty state in an arbitrary tall box.
- On responsive screens, keep actions grouped, decide table overflow deliberately and avoid clipping or offscreen modal buttons.
- The owner supplies desktop/mobile screenshots for visual acceptance; never run Playwright or self-claim visual PASS.

The pre-implementation PREP REPORT approval gate in this Skill applies to new library adoptions and substantial cross-screen design refactors; **small scoped bugfixes already approved by the user may proceed directly** after reading applicable rules, without reopening a full redesign proposal.

Source inspiration: `seo-ops-client/skills/design-omichannel-dashboard` and `.cursor/rules/modal-loading-feedback.mdc`. Filament, Blade and Livewire-specific instructions are intentionally omitted.
