# Zyvavu MCP Phase 1 / 2A / 2A.1

Status (2026-11-12): Phase 1 + Stage 0 + Phase 2A Theme Customize + Phase 2A.1 trusted auth / live bridge under `src/mcp`. Cursor registers `zyvavu` in `.cursor/mcp.json` alongside `cms-knowledge` and `chrome-devtools`.

Default MCP path does not write Payload Settings. Live create/update requires trusted auth + `ZYVAVU_MCP_LIVE_WRITES=1` + bound Payload + isolated `qa-*` targets. Theme Creation UI is not modified by MCP.

Zyvavu MCP serves bundled discovery, Stage 0 capability assessment, trusted-auth Theme Customize read/validate/update, and read-only proposal validation over local stdio.

```powershell
node --import tsx src/mcp/stdio.ts
node --import tsx --test src/mcp/phase1.test.ts src/mcp/stage0.test.ts src/mcp/phase2a.test.ts src/mcp/phase2a1.test.ts
```

Configure a client that supports stdio to start `node` with arguments `["--import", "tsx", "src/mcp/stdio.ts"]` and the project root as its working directory. If the client lacks a working-directory option, use its local launch wrapper to change to the project root before running Node. Keep wrapper output off stdout.

The process accepts MCP JSON-RPC over stdin and emits newline-delimited replies on stdout. It supports initialization, ping, tools and resources. The process negotiates versions 2024-11-05 through 2025-11-25 as enumerated in the source. See the [MCP stdio specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) and [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle).

Only trusted local clients should launch the executable. Caller-supplied `auth.user` role claims are rejected. Live CMS mutations stay disabled until the live bridge and isolation gates pass. No passwords or access tokens appear in tool responses.

- [Architecture and Knowledge Pack audit](architecture.md)
- [Tools and example requests](tool-contracts.md)
- [Stage 0 capability assessment](theme-capability-assessment.md)
- [Widget Capability Backlog](capability-backlog.md) (PO BUILD / REUSE / DEFER queue; does not mutate approved assessments)
- [Puck proposal contract](template-schema.md)
- [QA and Phase 2 handoff](qa-handoff.md)
