# Contact Information — Site Settings + Widget

## Data ownership

- **Source of truth:** Payload Global `settings.contactEntries` (Site Settings → Contact Information).
- **Not stored in** `theme.json` or Puck document value copies.
- Widgets reference entries by stable `entryId` only.

## Entry shape

| Field | Role |
| --- | --- |
| `entryId` | Stable internal ID (widget references). Auto-generated; read-only in Admin. |
| `key` | Editable display label. Renaming does not break widgets or phone/email links. |
| `value` | Editable display value. |
| `link` | Optional URL. When present and Special link is empty, value renders as a link. |
| `semantics` | Optional `phone` \| `email` — stable auto-link behavior (not a general Type dropdown). |
| `order` | Display order (array position / explicit order). |

Sample entries (Hotline, Email, Address, Facebook) are defaults for new installs only — not required fields.

## Link resolution

1. `semantics === 'phone'` → `tel:` from **value** (not key).
2. `semantics === 'email'` → `mailto:` from **value**.
3. Else if `link` is set → sanitized safe URL (`javascript:` / `data:` / `vbscript:` rejected).
4. Else → plain text.

Deleted entries referenced by a widget are skipped at render time.

## Widget `ContactInformation`

Puck props store: `entryIds`, `showLabels`, `showIcons`, `preset`, plus existing Style Engine overrides.

Presets: `vertical` | `inline` | `cards`.

Registered in frontend/editor/manifest registries and template policies (`home`, `page`, `single`, `category`, `footer`) for MCP discovery of widget + settings schema. MCP Phase 2 is out of scope.

## Cache / SSR

Public pages load contact entries via `loadPublicSiteSettings` into `ThemeDataContext.site.contactEntries` on each SSR pass (same policy as other site settings). Changing Site Settings updates all widgets that reference those entry IDs on the next request.
