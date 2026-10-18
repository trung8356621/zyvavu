# First-run setup (Node.js + PostgreSQL)

No Docker is required. Provision an existing PostgreSQL server and an **empty, dedicated database** first. Its role needs schema/DDL privileges and permission to create `pg_trgm` (or have the provider enable that extension). Do not point the installer at an existing website database.

From the deployed application directory:

```powershell
node scripts/setup.mjs init
pnpm dev
```

Reuse a running development server instead of starting another. Open `/setup` on its existing origin (local default: `https://zyvavu.test`, direct: `http://127.0.0.1:3107/setup`). Paste the private terminal token, select Vietnamese or English, and follow Database → System administrator → Website → Finish. Use HTTPS outside trusted local development. The PostgreSQL password is cleared from page memory after verification; the administrator password stays in page memory until Finish and must be reentered after a reload. Tokens and credentials never go in URLs or browser storage.

`/setup` and `/api/setup` do not initialize Payload to render/test connectivity. The normal public/Admin/API boundary checks configuration and database reachability before Payload. New installation progress and generated secret live in `.setup/state.json`, outside Git. Restrict this directory to the service account: POSIX modes are set automatically; **Windows operators must restrict its NTFS ACL**. Never serve or publish this directory. Keep it on durable storage shared by all application workers. Set `SETUP_STATE_DIR` to a writable absolute private directory if the application directory is read-only; set the same value for both the CLI and Node service.

The installer refuses any database containing application tables in any schema or existing users. It does not create the PostgreSQL database. Finish uses the checked-in Payload migration `up` functions and native `payload-migrations` records, then creates the first Payload `system-admin` and updates the existing Settings global. All schema changes, migration records, administrator creation and settings share a single adapter transaction. The web path avoids Payload's CLI migration wrapper because that wrapper calls `process.exit` on migration failure. No reset, schema push or down migration runs. A filesystem lock serializes workers and a PostgreSQL advisory lock serializes database setup. Existing websites without installer state are recognized by existing users; setup cannot claim them.

Finish writes a new `.env.local` exclusively; it never overwrites an existing file. Existing hosting environment variables take precedence. A preexisting `DATABASE_URL` must exactly match the submitted encoded URL, and an existing `PAYLOAD_SECRET` is retained. Node/Next loads `.env`, `.env.local`, and hosting variables through its normal environment loading. **Restart Node.js after completion**, then visit `/admin` and `/`. The persisted completion marker prevents a lost environment file or database outage from reopening setup. A database outage returns a localized maintenance response (503) for ordinary requests. Existing initialized databases remain protected even if local setup state is missing.

## Manual configuration / read-only hosting

If Finish reports it cannot safely persist configuration:

```powershell
node scripts/setup.mjs export
```

This creates a private `hosting.env` inside the setup state directory; it does not print secrets. Transfer its `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SERVER_URL` to the provider's environment configuration or reconcile them manually with the existing `.env.local`. Do not commit/upload the export to a public directory. Restart Node.js, reopen `/setup`, enter the same token, reenter the administrator password, and finish. A writable durable state directory remains necessary; entirely stateless/read-only hosting cannot safely run this installer.

## Interrupted setup

Reopen `/setup`, enter the same token and select Resume. Database/site progress is retained; administrator credentials are never stored. If the process crashed while holding the file lock, stop **all** application workers, then run:

```powershell
node scripts/setup.mjs recover-lock --server-stopped
```

Restart the service and resume. A database transaction interrupted before commit rolls back; after commit the completion flag allows recovering the local marker without creating another user. For a lost token, stop workers and run `node scripts/setup.mjs rotate-token`, then restart. Rotation is refused for completed installations. Never remove installation state to reinstall an existing database. For a preexisting database, restore its original configuration and secret through the operator, rather than attempting setup.

## Verification boundary

Pure/mocked unit tests cover validation, translated errors, state restrictions, persistence conflicts and transaction behavior without database writes. Live PostgreSQL installation, login/homepage and visual/responsive acceptance require the operator's manual test on an isolated empty database. No browser automation is used.
