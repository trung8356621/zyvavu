# Architecture

The stdio session dispatches an allowlisted MCP tool or resource. The tool layer delegates to installed theme definitions, widget manifests, template policies, the pattern slot registry and Style Engine capability metadata. The proposal validator adds structural checks and then applies the application’s template and universal style validators. Effective typography calls the existing resolver. Discovery and validation use the same adapters.

There is no Payload initialization or database dependency. Source selection is explicit when supplied. `bundled` selects checked-in definitions and `live` is denied. Read tools take catalog identifiers and resources use exact URIs. Caller strings cannot select a filesystem path or backend. The transport caps frames at 512 KiB and returns generic messages for unexpected errors.

## Approved logical surfaces

One server registers three contracts. Tools and resources declare their owner in `_meta["zyvavu/surface"]`. The capabilities tool lists the same groups from the dispatcher.

- **Zyvavu Public MCP** owns public CMS rules, Section and container composition, the public widget capability list, layout and read-only validation of caller-provided documents and website plans. It also owns **Stage 0** capability assessment: verified capability snapshots, structured requirement classification, owner decision resolution and the readiness gate. It needs no CMS account. Widget discovery exposes capability labels and context availability.
- **Theme Customize MCP** owns bundled theme selection, design tokens, CSS custom property names and values, shared color and typography presets, spacing, breakpoints and token inheritance. It resolves values for an explicit theme ID. CSS values come from the application’s theme CSS generator. The catalog resolves direct aliases within the generated root declarations and reports unresolved values as null. Stage 1 must not run while Stage 0 readiness is `BLOCKED`.
- **Theme Builder MCP** owns widget settings and defaults, style domain applicability, effective widget typography, Puck document schemas and bundled template examples. The public validator uses the same builder composition and validation contracts. Stage 2 must not run while Stage 0 readiness is `BLOCKED`.

A bundled theme ID selects checked-in data. The current process rejects live sources for all three surfaces. Logical ownership is discovery metadata. Access enforcement belongs at the resolver and service boundary.

## Stage 0 — capability assessment

MCP is Zyvavu’s Theme Factory and Architecture Auditor. Stage 0 compares a website/theme brief (structured requirements from the client) to actual registered capabilities before Theme Customize or Theme Builder work.

- **Facts vs recommendations vs decisions.** The snapshot is verified registry truth. Classification may mark evidence `verified` or `inferred`. Owner decisions (`REUSE` / `BUILD` / `DEFER` / `REJECT`) are stored separately and never invent registry entries.
- **Reuse-first.** Prefer Atoms, existing widgets, containers, patterns, bindings and data sources before proposing `MISSING` widgets. Backend gaps (for example Products) are `UNSUPPORTED`, not cosmetic missing widgets.
- **Read-only.** Stage 0 never writes themes, templates, tokens, widgets or database records and never embeds an LLM. Natural-language parsing stays in the MCP/Model client.
- **Readiness gate.** `READY` and `READY_WITH_DEFERRED` may advance to Stage 1/2. `BLOCKED` must not. `BUILD` approves a later coding task only; it does not implement widgets and does not alone clear the gate.
- **Model API compatibility.** Assessment JSON uses `schemaVersion`, stable requirement IDs, deterministic validation and machine-readable errors with no provider-specific or conversational state. See [theme-capability-assessment.md](theme-capability-assessment.md).

## Phase 2A — Theme Customize

Stage 1 Theme Customize is an independent write scope from Theme Builder. Theme Builder must consume selected Theme Customize tokens without silently rewriting them.

- **Stage 0 handoff.** Writes require a validated assessment payload (`stage0Assessment`) with stable `assessmentId`, `schemaVersion`, `capabilitySnapshotId`, explicit owner decisions and non-`BLOCKED` readiness. Handoff is not a database table; clients pass the approved assessment. Current capability snapshot is required for writes. `DEFER` never becomes `BUILD` implicitly.
- **Auth (Phase 2A.1).** Caller-supplied `auth.user.id` / `auth.user.role` are **rejected**. Trusted principals come from `auth.payloadToken` (Payload JWT verification) or `auth.harness` (shared `ZYVAVU_MCP_HARNESS_SECRET` + resolved site-staff user). Role is taken from the verified user record; `isSiteStaff` remains the gate. MCP never accepts passwords and never returns credentials/tokens in tool results.
- **Theme identity.** Theme ID = accent-free lowercase URL slug of Theme Name (`slugify`). Theme ID is unique and immutable after creation. Display-name renames do not change Theme ID. Duplicate slugs are rejected without numeric suffixes. `websiteType` is metadata only.
- **Persistence reuse.** Token updates reuse `validateThemeTokens` and Settings `themeStyles` keys compatible with `saveThemeStyleOverride` (including corporate legacy aliases). Create reuses `createCustomTheme` / `theme_custom_registry`. Default MCP path uses a disposable **memory store**. Live Payload writes require `ZYVAVU_MCP_LIVE_WRITES=1`, a bound Payload client, trusted auth, and isolated `qa-*` targets (never the active theme / bundled themes by default).
- **Create status.** Without the live bridge: `CREATE_UNAVAILABLE`. With trusted auth + live bridge: create via `createCustomTheme` (inactive, no Puck clone). Theme Creation UI is not modified by MCP.
- **Contract drift.** MCP and application share `validateThemeTokens`. Disagreement surfaces as `CONTRACT_DRIFT` rather than a second validator.

## Local Knowledge Pack audit

- **10 MCP Design & Contracts — REUSABLE.** Local stdio, no port, stdout reserved for protocol and read-only operation fit Phase 1. Knowledge search continues in its own server.
- **11 MCP Server Source — NEEDS_ADAPTATION.** The checked-in JavaScript implementation serves snapshot documentation and uses a fixed protocol version. Phase 1 uses a separate TypeScript endpoint with lifecycle negotiation, bounded frames, a tool allowlist and fixed resource URIs. The checkpoint has no direct MCP SDK dependency.
- **12 MCP Setup & Validation — NEEDS_ADAPTATION.** The generic initialize/initialized/list/call sequence applies. The knowledge root and its Cursor configuration belong to the original server.
- **02 CMS Architecture — REUSABLE.** Source confirms Next/Payload ownership and existing role checks. The MCP adapter stays inside the template contract and never uses elevated Payload access.
- **06 CMS Theme Engine — NEEDS_ADAPTATION.** Source provides Corporate, Industrial and Editorial themes, Puck policies and token-backed widget overrides. The broad proposed theme families in the snapshot are insufficient for discovery.
- **01 Decisions & Open Questions — REUSABLE.** Preserve decision status and site/system boundaries. No decisions were promoted.
- **Drive-only revisions — UNKNOWN.** This audit uses the committed snapshot at `cf23396`.

The full editor registry imports UI stylesheet dependencies that require a Next build pipeline. Phase 1 reads the headless manifests and existing slot definitions and adds checked input metadata for verified fields. Widget schemas are marked `PARTIAL` to account for editor-only and legacy fields. No editor, widget renderer, Style Engine or dependency files are changed.
