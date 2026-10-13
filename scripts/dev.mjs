import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const server = JSON.parse(readFileSync(new URL('../config/dev-server.json', import.meta.url), 'utf8'))
const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'dev',
    '--hostname',
    server.host,
    '--port',
    String(server.port),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  },
)

child.on('exit', (code) => process.exit(code ?? 1))
