SETUP & VALIDATION — KNOWLEDGE PACK
Current Drive output: Google Docs containing textual SKILL.md definitions and MCP source; these are REAL Docs but not executable .md/.mjs files yet. User can attach all directly to Docs Project.
To install local MCP when needed:
1. Export each '02–09 — SKILL' document into a UTF-8 file skills/<skill-name>/SKILL.md, preserving YAML frontmatter. The Docs titles map to skill name. Export '01 — DECISIONS' as decisions/decisions.md, '11 — MCP Server Source' into mcp/server.mjs, and supplementary original docs into references/*.md (use Google Docs download as text then convert if necessary).
2. Keep local layout:
cms-knowledge-pack/
  decisions/decisions.md
  references/roadmap.md
  references/cms-hosting.md
  references/mega-menu.md
  references/seo-backend.md
  skills/cms-architecture/SKILL.md
  skills/cms-seo-backend/SKILL.md
  skills/cms-url-routing/SKILL.md
  skills/cms-mega-menu/SKILL.md
  skills/cms-theme-engine/SKILL.md
  skills/cms-performance/SKILL.md
  skills/cms-multilingual/SKILL.md
  skills/cms-deployment/SKILL.md
  mcp/server.mjs
3. Requires Node >=20 (source uses built-in modules and needs no npm install). Set CMS_KNOWLEDGE_ROOT to the absolute root dir.
4. Cursor MCP config (replace real paths, do NOT paste placeholder unchanged):
{"mcpServers":{"cms-knowledge":{"command":"node","args":["/ABS/PATH/cms-knowledge-pack/mcp/server.mjs"],"env":{"CMS_KNOWLEDGE_ROOT":"/ABS/PATH/cms-knowledge-pack"}}}}
5. Generic stdio client should issue initialize, notifications/initialized, tools/list then tools/call. Client-specific Cursor/Codex instructions may differ by version and should be checked when installing.
6. Smoke test with a local Node subprocess: send JSON-RPC single-line {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}; then tools/list. Verify tools, get_decision('DEC-URL-001'), list_open_questions and one document read.
7. Verify no secret; original docs untouched; consistency of statuses; inspect source files and normalize any formatting altered by Docs exports.
TEST STATUS: Server source included as text. Execution/build/integration in the user's Cursor/Codex environment has NOT been performed in this Drive operation; cannot truthfully claim production-ready MCP without that smoke test.
NOTE: For just using Docs Project, adding the Docs is already sufficient. MCP is OPTIONAL later; never confuse project-knowledge documents with an installed MCP server.
