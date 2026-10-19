# Widget Library / Pattern System V1 delivery

Branch: `codex/style-engine-feature-expansion`. Base HEAD: `083736f` (`theme editor v4.7`). Changes are uncommitted; no commit, push or merge performed.

## Implemented

- Category tiles use Mantine classNames with icon above centered two-line labels. Dynamic Content / Nội dung động groups existing context-filtered registrations, without new widget IDs.
- 24 canonical system patterns: TextBlock 6, Section 6, Columns 6, FeaturedMedia 6. Variants contain different supported style/layout data; Section/Columns include real nested native Puck Slot arrays. Existing six pattern IDs and registry consumers remain compatible.
- Button pattern catalog is deferred: Button Design remains the previously approved shell; this change does not claim a complete Button Engine.
- Canonical JSON validation, subtree serialization from inline Slots or legacy zones, fresh IDs on insertion, Slot/context checks, and presentation-only application preserving content/bindings. A read-only SSR bridge renders inline Slots without changing stored document ownership or root DropZone behavior.
- My Patterns native Payload REST persistence: save selected committed subtree, list/search/pagination, rename/metadata, confirm delete/update, insert/reuse, owner-only staff access. JSON is saved before capture. Snapshot instances do not subscribe to later pattern edits.
- Simple pattern previews use existing frontend components. Complex previews use individual image references and an explicit pending/unavailable fallback. Accessible card actions and detailed preview modal; optional protected live route opens without another Puck editor.

## Persistence and migration impact

New hidden native collection `widget-patterns`, with metadata, owner, canonical record, content hash and optional private WebP upload. No existing content records were changed.

`src/migrations/20261018_160000_widget_patterns.ts` creates the collection table, upload columns/indexes and its locked-document relationship. **NOT APPLIED**, and not tested against an isolated database. Generated Payload TypeScript types are updated. Native migration generation encountered the repository's stale initial snapshot and an unrelated enum-rename prompt; it was stopped. The scoped migration follows existing hand-written migration conventions.

Owner must review/apply migrations through the normal deployment workflow before using My Patterns. Do not permit development schema auto-push as a substitute for this review. CRUD is implemented and unit-covered; real DB CRUD is **NOT VERIFIED**.

Example canonical JSON (native inline Slots):

```json
{
  "schemaVersion": 1,
  "id": "example-section",
  "name": "Example section",
  "description": "A reusable section subtree",
  "category": "sections",
  "widgetType": "Section",
  "source": "user",
  "version": 1,
  "payload": {
    "content": [{
      "type": "Section",
      "props": {
        "id": "section-source",
        "content": [{
          "type": "TextBlock",
          "props": {"id": "text-source", "title": "Example", "content": "Reusable text"}
        }]
      }
    }],
    "zones": {}
  },
  "theme": {"tokens": []}
}
```

Validation rejects runtime values, unsafe URL schemes, unknown renderers/Slots, duplicate IDs, nested Sections, invalid structured styles, more than 100 widgets, depth over 8 or JSON over 256K characters. It does not persist selection, draft state, functions or React objects.

## Capture and current limitations

`/pattern-preview/[key]` renders allowlisted canonical trees through existing ThemeRenderer with published theme tokens and synthetic content. Staff session or short-lived HMAC ticket required; user tickets bind owner and content hash. No automated login or Admin navigation. Collection loops use manual sample data in preview. Capture requests are GET-only and restricted to same-origin preview/static/media assets.

Capture uses the already installed `@playwright/test` 1.58.2 and Sharp, fixed 1200×800 viewport at DPR 2, reduced motion, individual 1200×800 WebP output. That existing package moved from devDependencies to dependencies; lockfile importer changed accordingly. No successful installation or browser download occurred. The explicitly permitted installation retry with both existing stores failed because offline metadata was unavailable; no further install was attempted.

- System release script: `pnpm exec tsx scripts/generate-pattern-thumbnails.ts section-airy` (explicit IDs only; pass the desired complex IDs, no automatic mass rendering). Requires the existing app, matching PAYLOAD_SECRET, reachable canonical origin and an existing Chromium executable. Optional `PATTERN_CHROMIUM_EXECUTABLE_PATH` selects an owner-provided executable; `PATTERN_CAPTURE_THEME_ID` defaults to corporate.
- System asset target: `public/pattern-library/<id>-v<version>.webp`. **No WebP generated yet**; 18 complex system assets remain pending. The SVG sample is preview-only and does not replace media bindings on insertion.
- User WebPs use native Payload private uploads at `private/pattern-thumbnails`, ignored by Git, with owner access and private/no-store headers. Content hash invalidates stale captures; failures preserve JSON and expose retry.
- Capture concurrency is bounded to one job per application process; no persistent queue/service was introduced. Production requires an available browser executable. No browser/service installation or server restart was performed.
- Environment probe: installed Chromium executable absent; `https://zyvavu.test` cannot resolve from this session. Capture and final image quality are **BLOCKED / NOT VERIFIED**.
- Owner explicitly chose code handoff with capture deferred. No additional browser installation or service changes are authorized by this delivery.
- External resources are blocked during capture; fonts must be available locally or will use fallback fonts. Runtime browser behavior and layout remain **NOT VERIFIED**.

## Verification

- `pnpm generate:types`: PASS, no DB writes.
- `pnpm exec tsc --noEmit --incremental false`: PASS after three scoped typing fixes.
- Focused Vitest: 79 unique tests PASS across pattern-system-v1 (16), visual-builder-library (3), visual-builder-ux-v2 (14), section-builder (9), mandatory-section-architecture (18), style-engine (19). Covers round-trip JSON, complete subtree/fresh IDs, dynamic binding preservation, root restrictions, SSR inline Slots and legacy zone preservation, ACL/tickets, capture-failure JSON retention and library insertion.
- Changed-file ESLint: zero errors; existing/explicit-any and native image warnings remain. Final results recorded in the delivery response.
- Build not repeated: previously established environment blockers remain (Turbopack CSS subprocess sandbox failure; alternative Webpack config has an existing invalid watchOptions.ignored RegExp array). No build PASS claimed.
- Browser acceptance, Undo/Redo, Save/Reload, real native CRUD and resulting WebP quality require owner verification. Unit tests do not establish these browser outcomes.

## Changed files

- UI: `src/components/admin/theme-builder/WidgetPatternLibrary.tsx`, `.module.css`, `PatternPreview.tsx`, `useMyPatterns.ts`.
- Engine: `src/lib/theme-engine/widget-patterns.ts`, `renderer.tsx`, and new `patterns/{json,catalog,server,capture,preview}` modules.
- Persistence: `src/collections/WidgetPatterns.ts`, `src/payload.config.ts`, generated `src/payload-types.ts`, migration and migration index.
- Capture/runtime: preview route group/layout/CSS, `scripts/generate-pattern-thumbnails.ts`, sample SVG, `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `.gitignore`.
- Tests: `tests/unit/pattern-system-v1.unit.spec.tsx`, `tests/unit/visual-builder-library.unit.spec.tsx`.
- This task delivery note. No bulk knowledge-pack sync.
