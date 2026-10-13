# CMS Knowledge Pack — local snapshot from Drive Docs

Source: Google Drive folder `CMS-KNOWLEDGE-PACK` (13 Google Docs).
Original Docs are canonical; this is a one-time UTF-8 export snapshot for Cursor.
Generated 2026-10-13. No automatic Drive synchronization.

Included:
- `decisions/decisions.md`: CONFIRMED / PROPOSED / OPEN decision registry
- `skills/*/SKILL.md`: 8 original skill definitions (YAML frontmatter preserved)
- `references/`: project index, MCP contracts and setup notes
- `mcp/server.mjs`: original *draft* server text, exported from Google Doc 11
- `source-manifest.json`: map and checksums of exported files

IMPORTANT: This bundle is not itself proof of Cursor MCP integration. Before declaring success:
1. Confirm `node --check mcp/server.mjs` and perform actual JSON-RPC smoke tests.
2. Fix/report source issues if found; test Cursor tools UI after config/restart.
3. Use absolute Windows paths in `.cursor/mcp.json` or workspace-dependent resolved paths.
4. MCP is local stdio and reads this snapshot; NEVER imply it syncs Drive.
5. Do not silently amend decisions; keep original files and timestamps, diff any updates.
6. Project index (00) mentions TypeScript/older tool names; actual 11 document is JS `.mjs` and 10+12 define the operative tool interface.
7. Full original source docs referenced inside this pack may not be included; don't invent their content.
