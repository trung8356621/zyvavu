import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const server = JSON.parse(readFileSync(new URL('../config/dev-server.json', import.meta.url), 'utf8'))

const preloadPath = fileURLToPath(new URL('./dev-preload.cjs', import.meta.url)).replaceAll('\\', '/')
const baseNodeOptions = process.env.NODE_OPTIONS || ''
const spaceOption = baseNodeOptions.includes('--max-old-space-size') ? '' : '--max-old-space-size=4096'
const preloadOption = baseNodeOptions.includes('dev-preload') ? '' : `--require "${preloadPath}"`
const nodeOptions = `${baseNodeOptions} --no-deprecation ${spaceOption} ${preloadOption}`.trim()

const isWebpack = process.argv.includes('--webpack')
const bundlerFlag = isWebpack ? '--webpack' : '--turbo'

console.log(`[dev-launcher] Starting Next.js dev server (${isWebpack ? 'webpack' : 'turbopack'}) on http://${server.host}:${server.port} at ${new Date().toISOString()}`)

const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'dev',
    bundlerFlag,
    '--hostname',
    server.host,
    '--port',
    String(server.port),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
  },
)

let isShuttingDown = false

function cleanup(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`[dev-launcher] Received ${signal || 'shutdown'}, terminating child process (PID: ${child.pid})...`)
  try {
    if (child && !child.killed) {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      } else {
        child.kill(signal || 'SIGTERM')
      }
    }
  } catch (err) {
    console.error('[dev-launcher] Error terminating child process:', err)
  }
}

process.on('SIGINT', () => {
  cleanup('SIGINT')
  process.exit(130)
})

process.on('SIGTERM', () => {
  cleanup('SIGTERM')
  process.exit(143)
})

process.on('SIGHUP', () => {
  cleanup('SIGHUP')
  process.exit(129)
})

process.on('uncaughtException', (err) => {
  console.error(`[dev-launcher] Uncaught exception at ${new Date().toISOString()}:`, err)
  cleanup('uncaughtException')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error(`[dev-launcher] Unhandled rejection at ${new Date().toISOString()}:`, reason)
  cleanup('unhandledRejection')
  process.exit(1)
})

child.on('error', (err) => {
  console.error(`[dev-launcher] Child process error at ${new Date().toISOString()}:`, err)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  const timestamp = new Date().toISOString()
  if (signal) {
    console.warn(`[dev-launcher] Next.js child process was killed with signal: ${signal} at ${timestamp}`)
    process.exit(1)
  } else if (code !== 0 && code !== null) {
    console.error(`[dev-launcher] Next.js child process exited with error code: ${code} at ${timestamp}`)
    process.exit(code)
  } else {
    console.log(`[dev-launcher] Next.js child process exited normally (code: ${code}) at ${timestamp}`)
    process.exit(0)
  }
})
