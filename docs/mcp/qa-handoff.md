# QA and Phase 2 handoff

Run `node --import tsx --test src/mcp/phase1.test.ts` in the project root. The integration test spawns the stdio process with an unusable database URL and checks initialization, schemas, read-only discovery, error handling, denied live access and absence of a write tool. The tests validate bundled examples and native Puck proposals. No development database or browser is involved.

Phase 1 validates the documented subset of builder inputs. Its validation is not an editor round-trip or proof of rendered behavior. Live CMS records, media existence, route collisions against URL Registry, saved-instance lock comparisons and global effective styles beyond existing typography resolution remain outside Phase 1.

## Phase 1 port status

Phase 1 is present in the main repository (`src/mcp`, `docs/mcp`) and registered as Cursor MCP server `zyvavu`. Focused `phase1.test.ts` is the acceptance gate for this slice. Sibling tree `D:\workspace-2026\zyvavu-mcp` was the source copy and is not required for runtime.

## Stage 0 status

Stage 0 capability assessment is implemented on the Public surface (`src/mcp/stage0/*`). Acceptance: `node --import tsx --test src/mcp/stage0.test.ts src/mcp/phase1.test.ts`. Stage 0 remains read-only. Owner `BUILD` decisions do not register widgets. Theme Customize/Builder must honor the readiness gate (`READY` / `READY_WITH_DEFERRED` only).

## Phase 2A status — Theme Customize

Implemented on the Theme Customize surface:

- Stage 0 handoff payload (no assessment DB)
- Trusted-auth list/get/validate/update (`payloadToken` or harness; forged `auth.user` rejected)
- Disposable memory store for mutation QA (does not touch live Settings / URL Registry / active themes)
- Theme identity: `slugify(name)` → immutable Theme ID; duplicate rejection without numeric suffixes
- Create: `CREATE_UNAVAILABLE` without live bridge

Acceptance (memory path): `node --import tsx --test src/mcp/phase1.test.ts src/mcp/stage0.test.ts src/mcp/phase2a.test.ts`

## Phase 2A.1 — trusted auth + live bridge

- Trusted auth boundary in `src/mcp/auth.ts` (no caller-supplied role trust)
- Live bridge controls in `src/mcp/live-bridge.ts` (`ZYVAVU_MCP_LIVE_WRITES`, QA theme prefix, refuse active/bundled writes)
- Create reuses `createCustomTheme`; updates use Settings `themeStyles` payload store compatible with Theme Customize
- Automated live-bridge tests use an **in-memory mock Payload** only (`src/mcp/phase2a1.test.ts`)

Acceptance: `node --import tsx --test src/mcp/phase2a.test.ts src/mcp/phase2a1.test.ts`

**Isolation proof:** Phase 2A.1 automated tests do **not** mutate `DATABASE_URL` / the developer active theme. Real-database live writes remain **blocked** until an isolated QA database URL is provisioned and bound. Do not enable `ZYVAVU_MCP_LIVE_WRITES=1` against the day-to-day development database.

## Phase 2B / remaining backlog

1. Bind real Payload JWT verification in the MCP stdio process for non-harness operators.
2. Provision disposable QA database for true live write verification (separate from developer Settings).
3. Finish shared Default Style Contract / effective-style resolver where still partial.
4. Theme Builder Phase 2B: authenticated document reads/writes via audited `saveThemeTemplateOverride` after QA isolation; revision/idempotency; Publish remains separately authorized.
5. Keep Public surface read-only; never expose private builder mutation tools publicly.
