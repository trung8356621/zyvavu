import 'dotenv/config'
import { execFileSync } from 'node:child_process'

const url = new URL(process.env.DATABASE_URL || '')
const out = execFileSync(
  'C:\\laragon\\bin\\postgresql\\postgresql\\bin\\psql.exe',
  [
    '-h',
    url.hostname,
    '-p',
    url.port || '5432',
    '-U',
    decodeURIComponent(url.username),
    '-d',
    url.pathname.replace(/^\//, ''),
    '-tA',
    '-c',
    "SELECT current_user || '|' || current_database();",
    '-c',
    "SELECT COALESCE(extname, 'missing') FROM pg_extension WHERE extname = 'pg_trgm';",
    '-c',
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
  ],
  {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    encoding: 'utf8',
  },
)
console.log(out.trim())
