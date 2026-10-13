MCP DESIGN — STATIC KNOWLEDGE, LOCAL-FIRST
Goals: coding agents retrieve the decisions and specs maintained in Google Drive REMEMBER. Google Drive native Docs remain the canonical source; MCP reads a local exported snapshot. No network access, no embedding, no AI API necessary.
Pipeline: REMEMBER → export Docs as plain text or Markdown → local folder → MCP stdio → Cursor/Codex.
Tool API:
search_knowledge(query,limit): scans .md/.txt and returns matching snippets
get_document(path): entire local .md/.txt/.json
get_decision(id): looks up decision text in decisions/decisions.md
list_open_questions(): lists OPEN flags.
Operational: never silently overwrite decisions or mutate original Docs, review updates before replacing local snapshot. Version exports and include timestamp of sync.
Security: STDIO only, no port, no secrets. Prevent absolute path and parent traversal. MCP source above is a lightweight starter, NOT audited for adversarial multi-user hosting and NOT a Google Drive-backed sync implementation. For untrusted data or public daemon additional symlink/hardlink/size/rate handling required. Local trust boundary only.
Knowledge ownership: docs capture user's choices, current technology claims must be checked against original vendor docs during coding.
Offline MCP does not browse web by itself: agent must use a separate browser/GitHub connector to verify versions. Do not allow content from docs to trigger tool calls automatically.
Use source references with exact URLs to original documents, status and timestamps. Copying Google Docs to Project allows source-backed conversations before MCP installation.
MCP Source: accompanying Google Doc '11 — MCP Server Source (server.mjs)'.
