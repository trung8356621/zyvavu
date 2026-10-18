# Zyvavu CMS

Zyvavu is a Next.js 16.3.3 and Payload CMS 3.90.2 application backed by PostgreSQL. The same application serves the public website and the Payload Admin editorial workspace.

## Architecture

- Next.js `16.3.3`, React `19.2.6`, Payload `3.90.2`, PostgreSQL adapter `3.90.2`.
- `src/collections`: content models, media, users and URL Registry.
- `src/globals`: customer-facing Site Settings and protected System Settings.
- `src/lib/url`: flat URL Registry and menu URL resolution.
- `src/lib/publish`: publish-write contracts and lifecycle safeguards.
- `src/components/admin`: scoped Payload Admin extensions.
- `src/app/(payload)` and `src/app/(frontend)`: Admin and public routes/styles.
- `cms-knowledge-pack`: local exported decisions, skills and MCP source.

`src/theme/theme.json` is the static color source for Admin and Public UI. The two independent objects support only `primary`, `background`, `surface`, `text` and `border`; Admin also supports `sidebar`. `src/theme/cssVariables.ts` maps them to `--zyvavu-*` variables. Edit the relevant object and restart/rebuild normally. Changing Public colors cannot change Admin colors. This is not a database-backed theme engine or theme editor.

## Local development

The canonical workspace is `D:\zyvavu`. Requirements are Node.js `>=20.18.1`, pnpm `9`, `10` or `11`, PostgreSQL, Laragon Nginx and a trusted Laragon development certificate.

- Next.js: `127.0.0.1:3107`, configured in `config/dev-server.json`.
- Site: `http://zyvavu.test` and `https://zyvavu.test` through Nginx.
- Nginx config: `infra/nginx/zyvavu.test.conf`.
- PostgreSQL: local port `5432`; `DATABASE_URL` provides connection details and stays private.

For a new installation, open `/setup` directly: no `.env`, Payload secret, PostgreSQL connection or terminal activation is needed to display the wizard. Temporarily restrict access to the whole application through hosting/firewall controls until installation completes. Follow [the first-run guide](docs/first-run-setup.md) and provision an empty PostgreSQL database separately before finishing. Preserve existing configuration; never commit credentials.

```powershell
pnpm dev
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

Before starting another server:

```powershell
Get-NetTCPConnection -LocalPort 3107 -State Listen
Get-CimInstance Win32_Process | Where-Object CommandLine -Match 'next.*3107'
```

Stop the development server with `Ctrl+C` in its terminal. Do not kill unrelated Node processes.

### Diagnosing 502 Bad Gateway

1. Confirm Next.js is listening on `3107`.
2. Confirm `config/dev-server.json` and Nginx `proxy_pass` use the same port.
3. Check the `pnpm dev` terminal for compilation or environment errors.
4. Confirm Laragon Nginx loaded `infra/nginx/zyvavu.test.conf`.
5. Confirm PostgreSQL listens on `5432` and `DATABASE_URL` is valid without printing it.

HTTPS terminates at Laragon Nginx and is forwarded to Next.js. Authentication cookies and CSRF/CORS origins depend on the configured public origin; test login after changing domain or HTTPS settings.

## Database and generated files

Database changes require explicit task scope. Create migrations with Payload tooling, review them, test against disposable data and run integration tests before shared use. Never edit generated Payload files such as the Admin import map or generated route layout manually. Use:

```powershell
pnpm generate:types
pnpm generate:importmap
```

## Workspace history

`D:\zyvavu-bootstrap` is not a Git repository or the canonical app. It contains bootstrap tooling, package caches and temporary browser/test artifacts. One diagnostic script still writes `chrome-tools.json` there, so it is not documented as safe to delete. Development belongs in `D:\zyvavu`; do not remove or repurpose the bootstrap folder without a separate audit.

## Knowledge Pack and MCP

`cms-knowledge-pack` is a one-time local UTF-8 snapshot exported from canonical Google Drive documents. It does not synchronize with Drive automatically.

Cursor configuration is in `.cursor/mcp.json`. The local `cms-knowledge` server reads the snapshot over stdio. Verify it with the syntax and JSON-RPC checks in `cms-knowledge-pack/references/setup-validation.md`. Cursor MCP configuration does not automatically configure Codex or ChatGPT Work; every client requires separate configuration and verification.

Never independently change an `OPEN` decision to `CONFIRMED`.

## Development rules

- Preserve authentication, permissions, URL Registry and publish lifecycle contracts.
- Zyvavu operates independently; SEO-OPS is optional and communicates only through defined boundaries.
- Run targeted tests and lint. UI changes also require browser verification at relevant desktop/mobile sizes; a build alone is insufficient.
- Inspect `git status`, keep commits focused and preserve unrelated work.
- Never commit or push unless explicitly requested.
