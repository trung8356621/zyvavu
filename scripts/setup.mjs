import { randomBytes, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'

const directory = path.resolve(process.env.SETUP_STATE_DIR || '.setup')
const file = path.join(directory, 'state.json')
const action = process.argv[2] || 'init'
if (action === 'init') {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const token = randomBytes(32).toString('hex')
  await writeFile(file, JSON.stringify({ tokenHash: createHash('sha256').update(token).digest('hex'), secret: randomBytes(48).toString('hex'), phase: 'started' }), { flag: 'wx', mode: 0o600 })
  console.log(`Setup token (keep private): ${token}\nOpen /setup. State: ${directory}`)
} else if (action === 'export') {
  const state = JSON.parse(await readFile(file, 'utf8'))
  if (!state.databaseUrl || !state.website) throw new Error('Complete the database and website stages first.')
  const target = path.join(directory, 'hosting.env')
  await writeFile(target, `DATABASE_URL=${state.databaseUrl}\nPAYLOAD_SECRET=${state.secret}\nNEXT_PUBLIC_SERVER_URL=${state.website.siteUrl}\n`, { flag: 'wx', mode: 0o600 })
  console.log(`Private configuration written to ${target}. Transfer values to the hosting environment; do not publish this file.`)
} else if (action === 'recover-lock') {
  if (process.argv[3] !== '--server-stopped') throw new Error('Stop all application workers first; then pass --server-stopped.')
  await unlink(path.join(directory, 'lock'))
  console.log('Installation lock removed. Restart the application and resume /setup.')
} else if (action === 'rotate-token') {
  const state = JSON.parse(await readFile(file, 'utf8'))
  if (state.phase === 'installed') throw new Error('Installation is locked.')
  const token = randomBytes(32).toString('hex')
  state.tokenHash = createHash('sha256').update(token).digest('hex')
  await writeFile(file, JSON.stringify(state), { mode: 0o600 })
  console.log(`Setup token (keep private): ${token}`)
} else throw new Error('Supported actions: init, export, rotate-token, recover-lock')
