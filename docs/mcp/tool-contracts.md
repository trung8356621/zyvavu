# Tool contracts

All tools use object arguments. Optional `source` defaults to `bundled`. Use exact IDs from discovery.

### Zyvavu Public MCP

- `zyvavu_get_capabilities` and `zyvavu_get_schema_version` take `{}` and return availability and contract versions.
- `zyvavu_list_widgets` accepts optional `context` and returns public widget capabilities and availability.
- `zyvavu_get_layout_rules` takes `{}`. It returns context policies and canonical slot names. A policy entry without a registered widget is omitted from authorable widgets.
- `zyvavu_validate_template` requires `themeId`, `context` and `document`. It accepts `source` and returns `valid`, `errors`, `warnings` and `unsupportedCapabilities`.
- `zyvavu_validate_website_plan` requires `themeId` and one to twenty `pages` with `path`, `context` and `document` each. It accepts `source` and returns per-page validation and `routeAvailability: "UNVERIFIED"`. Valid documents include section summaries with widget types, layout slots, color tokens, media fields and responsive breakpoints used.
- `zyvavu_get_capability_snapshot` takes `{}` and returns the verified Stage 0 snapshot (atoms, widgets, contexts, bindings, data sources, known intents, stage gate metadata) plus `capabilitySnapshotId`.
- `zyvavu_assess_theme_requirements` requires `themeRequest` and `requirements[]` (`id`, `description`, optional `intent`, `priority`, `capabilityHints`). It returns `{ assessment, reportMarkdown, stageGate }`. Classification is deterministic against the snapshot; the server does not parse free text into intents.
- `zyvavu_validate_capability_assessment` requires `assessment` and checks schema plus readiness consistency.
- `zyvavu_resolve_capability_assessment` requires `assessment` and accepts `decisions[]` (`requirementId`, `decision`, optional `note`) plus optional `expectedSnapshotId`. It returns an updated assessment and readiness. `DEFER` changes only when an explicit decision is supplied. `BUILD` does not implement code.

Public resources also include `zyvavu://catalog/capability-snapshot`. Assessment report shape is documented in [theme-capability-assessment.md](theme-capability-assessment.md).

### Theme Customize MCP

Bundled (unauthenticated Phase 1) tools remain:

- `zyvavu_list_themes` takes optional `source`. `zyvavu_get_theme` and `zyvavu_get_theme_tokens` require `themeId` and accept `source`.
- The token response includes raw token groups, the application’s built-in color and typography presets, curated and system fonts, and responsive breakpoints. `cssTokens` maps generated CSS names to `value` and `resolvedValue`. The values describe the selected bundled theme’s root declarations.

Authenticated Phase 2A tools (require trusted auth: `auth.payloadToken` or `auth.harness`; caller-supplied `auth.user` is rejected):

- `zyvavu_theme_customize_list` — installed themes + create availability.
- `zyvavu_theme_customize_get` — requires `themeId`; optional `channel` (`draft`|`published`). Returns tokens, cssTokens, revision/updatedAt.
- `zyvavu_theme_customize_validate` — requires `tokens`; shape/type validation only (WCAG AA remains Theme Customize UI/service responsibility).
- `zyvavu_theme_customize_update` — requires `auth`, `stage0Assessment`, `themeId`, `tokens`; optional `channel`, `expectedRevision`, `idempotencyKey`, `slots`. Default store is disposable memory (QA). Payload Settings writes are denied on the default path. Revision conflicts return `CONFLICT`.
- `zyvavu_theme_customize_create` — requires `auth`, `stage0Assessment`, `name`; optional `tokens`, `websiteType`, `description`. Derives immutable Theme ID via `slugify(name)`. Rejects duplicate IDs. Without live bridge: `CREATE_UNAVAILABLE`. With trusted auth + live bridge: reuses `createCustomTheme` (inactive).

### Theme Builder MCP

- `zyvavu_list_templates` requires `themeId`. `zyvavu_get_template` also requires `context`. Both accept `source`. The latter returns the native bundled document.
- `zyvavu_get_widget_schema` requires `type` and describes settings, verified defaults, nesting, links, media and style applicability.
- `zyvavu_get_style_schema` returns the checked override schema and breakpoints. Supply `type` and optional `variant` for widget style domains. Supply `themeId` and optionally `htmlTag` to resolve effective typography.

Tools and resources advertise their surface via `_meta["zyvavu/surface"]`. Use `resources/list` to discover the catalog. Public resources include `zyvavu://catalog/rules`, `zyvavu://catalog/layout`, `zyvavu://catalog/public-widgets` and `zyvavu://catalog/capability-snapshot`. Theme Customize exposes `zyvavu://catalog/token-semantics`. Theme Builder exposes `zyvavu://catalog/styles`, `zyvavu://catalog/widgets` and `zyvavu://catalog/template`.

After `initialize` and `notifications/initialized`, send one JSON object per line.

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"zyvavu_get_theme_tokens","arguments":{"themeId":"corporate"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"zyvavu_get_widget_schema","arguments":{"type":"Heading"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"zyvavu_get_template","arguments":{"themeId":"corporate","context":"page"}}}
```

Tool output is JSON encoded in an MCP text block. Tool failures use `isError: true` with a `code` and `message`, plus optional `issues`. Codes include `INVALID_ARGUMENTS`, `ACCESS_DENIED`, `NOT_FOUND` and `INTERNAL_ERROR`. Invalid document proposals return a normal result with `valid: false`. Findings carry a document-relative path, code and message. Application-wide template policy findings use `$`. JSON-RPC protocol errors are returned separately.
