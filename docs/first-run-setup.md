# First-run setup (Node.js + PostgreSQL)

**Temporarily restrict the entire application to the installer/operator at the hosting, reverse-proxy or firewall layer before exposing a new deployment**, using an IP allowlist or hosting access password. Keep this restriction until installation succeeds and Node.js has restarted. The first person with access can configure the website; same-origin checks and database locks do not identify its owner. Restrict the whole application, including `/setup` and `/api/setup`.

Deploy/build/start Node.js normally. Open `/setup` directly: no Docker, terminal activation or environment file is needed. Reuse the desktop server at `http://127.0.0.1:3107/setup` or `https://zyvavu.test/setup`; if stopped, run `pnpm dev` from `D:\workspace-2026\zyvavu`. Production uses `pnpm build` and `pnpm start` behind its proxy. Use HTTPS outside trusted local development.

Select Vietnamese or English, then follow the four steps:

1. **PostgreSQL:** enter the provisioned host, port, database, username, password and SSL mode, or use the existing hosting `DATABASE_URL`. Verify connectivity. Provision an empty dedicated database separately; the installer does not install packages or create a database. Its role needs schema/DDL privileges and permission to enable `pg_trgm`, or the provider must enable it beforehand.
2. **System administrator:** enter the first administrator email and password. The existing Payload authentication model grants the first account `system-admin`.
3. **Website:** set the name, origin URL, default language, timezone and an existing supported theme.
4. **Finish:** initialize schema, administrator and settings atomically, persist configuration, then restart Node.js. Check `/admin` and `/`, then remove the temporary hosting/firewall restriction.

The database password is cleared from page memory after verification. The administrator password is sent only at Finish and must be reentered after a page reload. Only the VI/EN preference cookie is persisted in the browser. Responses never contain database credentials or the generated Payload secret.

## Installation state and safety

`/setup` rendering does not initialize Payload. Without usable environment configuration it also does not load PostgreSQL. Public/Admin/API requests are gated before Payload; frontend documents and metadata share an additional guard for concurrent rendering and not-found handling.

| State | Behavior |
| --- | --- |
| UNCONFIGURED | Open setup directly; normal website routes redirect to it. |
| CONFIGURING | Private server progress exists; verify the same database again to continue. |
| CONFIGURED_NOT_INSTALLED | Configuration exists but installation is incomplete. Continuation requires a verified empty database before any write. |
| INSTALLED | Usable configuration, a real system administrator and `settings.setupComplete` are verified. The installer is locked server-side. |
| DATABASE_UNAVAILABLE | Installed/potentially committed state cannot be verified, or existing configuration has unknown provenance and is unreachable. Show maintenance, never automatically reinstall. |

Installed state is determined from usable environment configuration and the database (system administrator plus `settings.setupComplete`), without requiring `.setup/state.json`. Database verification, website configuration and finalization check the actual database before proceeding. Existing application tables in any schema or existing users block installation. Once verified, setup stays bound to that database; another request cannot silently switch it. A database connection failure never authorizes installation; continuation requires a verified empty database.

A filesystem lock serializes setup across Node workers; a PostgreSQL advisory lock serializes final installation. Finish runs the existing migration `up` functions and native migration records, creates the first administrator and updates Settings in one adapter transaction, including `pg_trgm`. There is no reset, schema push or down migration. The CLI migration wrapper is avoided because it exits the process on errors.

## Configuration persistence

Progress and the generated secret are automatically saved in `.setup/state.json`, outside Git, only after database verification. Keep this temporary directory private and durable across workers until installation succeeds. POSIX modes are set; Windows operators must restrict its NTFS ACL. Never serve it publicly. For read-only application directories, set `SETUP_STATE_DIR` to an absolute private writable directory in the hosting service environment.

Finish publishes a fully written/fsynced `.env.local` atomically and exclusively. Existing files and unrelated configuration are preserved. Hosting environment variables retain precedence; an existing valid `PAYLOAD_SECRET` is retained. Node/Next loads `.env`, `.env.local` and hosting variables normally. Restart Node.js after completion; dev hot reload is not a production substitute.

If automatic persistence is unavailable, a private `hosting.json` is automatically saved in the state directory. Using the hosting file manager, transfer its exact `DATABASE_URL`, `PAYLOAD_SECRET` and `NEXT_PUBLIC_SERVER_URL` values to hosting environment settings, or reconcile the existing `.env.local`. Do not publish the file. Restart Node.js, reopen `/setup`, verify the same connection, reenter administrator credentials and finish. A durable writable state directory remains necessary until completion. Complex secrets that dotenv expansion could alter use this fallback too.

## Refresh or interrupted installation

Reopen `/setup` and verify the same database. Saved website settings are restored only after the database is confirmed empty. Administrator credentials are never stored. An interrupted transaction rolls back; a committed database blocks a second administrator even if a local completion write was interrupted.

After a process crashes while holding `.setup/lock`, stop all application workers, remove only that stale lock through the hosting file manager, restart and reverify the database. Never remove `state.json` or reset the database. Potentially committed/provisioning states fail closed when connectivity or runtime configuration is missing; restart with persisted configuration before continuation.

## Verification boundary

Normal installed requests reuse a configuration/state-bound inventory verdict for at most 30 seconds per Node process. A small reused PostgreSQL pool probes `SELECT 1`, coalesced for one second, so outages still return maintenance without rescanning schema tables on every request. Changed URL, secret, public origin or local state invalidates the inventory verdict. Incomplete/error results are not retained as installed. Setup write endpoints always perform their own fresh/advisory-locked checks and never trust this navigation cache.

If the database commits but the completion file cannot be persisted, a retry of Finish reaches its locked recovery branch and only repairs local state. After a worker restart, a verified installed database with matching provisioning configuration also finalizes recovery under the filesystem lock. Neither path reruns migrations or creates another administrator.

Loopback PostgreSQL hosts default to SSL disabled for local convenience; remote hosts default to full certificate/hostname verification. An explicitly selected or supplied SSL mode is preserved across host edits and step navigation. No additional PostgreSQL SSL modes are introduced.

Focused tests cover the direct four-step UI, languages, validation, request restrictions, installed-state replay protection, database checks, atomic file writes and transaction rollback using temporary files/mocks. Real installation, login/homepage and responsive visual acceptance require an isolated empty PostgreSQL database and manual owner inspection. No browser automation or laptop database access is used.

## Temporary directory cleanup

After the database transaction commits migrations, the system administrator and `settings.setupComplete`, the installer verifies configuration persistence and removes only its `hosting.json` and `state.json` while holding the filesystem lock. It releases the lock and removes the directory only if empty; unrelated files in a custom `SETUP_STATE_DIR` are preserved. No recursive deletion, database deletion or `.env.local` removal occurs. Failed installation/configuration persistence keeps recovery data. A verified completed installation retries cleanup on subsequent state verification if necessary.

Between configuration publication and Node restart, a usable `.env.local` keeps the installer closed even if runtime variables have not reloaded. Restart Node to load it normally. After restart, valid environment plus database completion determines INSTALLED without `.setup`; an unreachable database returns DATABASE_UNAVAILABLE and never reopens setup. No persistent completion secret or additional marker is needed.
