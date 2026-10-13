import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const bin = 'node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js'
const child = spawn(process.execPath, [bin, '--isolated', '--no-usage-statistics', '--no-performance-crux', '--accept-insecure-certs'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1' },
})
let buffer = ''
const messages = []
let stderr = ''
const waiters = []

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
  for (const waiter of [...waiters]) waiter()
})
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8')
  let newline = buffer.indexOf('\n')
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim()
    buffer = buffer.slice(newline + 1)
    if (line) messages.push(JSON.parse(line))
    newline = buffer.indexOf('\n')
  }
  for (const waiter of [...waiters]) waiter()
})

function send(message) {
  child.stdin.write(JSON.stringify(message) + '\n')
}
function waitFor(predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    const check = () => {
      const found = messages.find(predicate)
      if (!found) return
      clearTimeout(timer)
      resolve(found)
    }
    waiters.push(check)
    check()
  })
}
function textOf(result) {
  const content = result?.result?.content || []
  return content.map((item) => item.text || '').join('\n').slice(0, 1800)
}

let nextId = 1
async function call(method, params) {
  const id = nextId++
  send({ jsonrpc: '2.0', id, method, params })
  const message = await waitFor((entry) => entry.id === id, 90000)
  if (message.error) throw new Error(`${method} ${message.error.message}`)
  return message
}

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('banner timeout')), 20000)
    const check = () => {
      if (!stderr.includes('DevTools')) return
      clearTimeout(timer)
      resolve()
    }
    waiters.push(check)
    check()
  })
  const init = await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'zyvavu-check', version: '1.0.0' },
  })
  send({ jsonrpc: '2.0', method: 'notifications/initialized' })
  console.log('INIT', init.result?.serverInfo?.name, init.result?.serverInfo?.version)
  const listed = await call('tools/list', {})
  const names = (listed.result?.tools || []).map((tool) => tool.name)
  console.log('TOOLS', names.join(','))

  fs.mkdirSync(os.tmpdir(), { recursive: true })
  let openedText = ''
  try {
    const opened = await call('tools/call', {
      name: 'new_page',
      arguments: { url: 'https://zyvavu.test/gioi-thieu', timeout: 60000 },
    })
    openedText = textOf(opened)
  } catch (error) {
    openedText = String(error.message)
  }
  const pages = await call('tools/call', { name: 'list_pages', arguments: {} })
  const pagesText = textOf(pages)
  console.log('PAGES', pagesText.replace(/\s+/g, ' ').slice(0, 700))
  const pageMatch = pagesText.match(/(\d+): [^\n]*gioi-thieu/) || pagesText.match(/(\d+): /)
  const pageId = pageMatch ? Number(pageMatch[1]) : undefined
  console.log('PAGE_ID', pageId ?? 'missing')

  const snapshot = await call('tools/call', {
    name: 'take_snapshot',
    arguments: pageId ? { pageId } : {},
  })
  console.log('SNAPSHOT', textOf(snapshot).replace(/\s+/g, ' ').slice(0, 700))

  const consoleMessages = await call('tools/call', {
    name: 'list_console_messages',
    arguments: pageId ? { pageId } : {},
  })
  console.log('CONSOLE', textOf(consoleMessages).replace(/\s+/g, ' ').slice(0, 700))

  const network = await call('tools/call', {
    name: 'list_network_requests',
    arguments: pageId ? { pageId } : {},
  })
  console.log('NETWORK', textOf(network).replace(/\s+/g, ' ').slice(0, 900))

  const desktopShot = path.join(os.tmpdir(), 'zyvavu-desktop.png')
  await call('tools/call', {
    name: 'take_screenshot',
    arguments: { ...(pageId ? { pageId } : {}), format: 'png', filePath: desktopShot },
  })
  console.log('DESKTOP_SHOT', fs.existsSync(desktopShot), fs.statSync(desktopShot).size)

  await call('tools/call', {
    name: 'resize_page',
    arguments: { ...(pageId ? { pageId } : {}), width: 390, height: 844 },
  })
  const mobileShot = path.join(os.tmpdir(), 'zyvavu-mobile.png')
  await call('tools/call', {
    name: 'take_screenshot',
    arguments: { ...(pageId ? { pageId } : {}), format: 'png', filePath: mobileShot },
  })
  console.log('MOBILE_SHOT', fs.existsSync(mobileShot), fs.statSync(mobileShot).size)

  const sw = await call('tools/call', {
    name: 'evaluate_script',
    arguments: {
      ...(pageId ? { pageId } : {}),
      function:
        'async () => { const reg = await navigator.serviceWorker.ready; await new Promise((resolve) => setTimeout(resolve, 1500)); const cacheNames = await caches.keys(); const pages = cacheNames.filter((name) => name.startsWith("zyvavu-pages-")); let cached = []; for (const name of pages) { const cache = await caches.open(name); cached = cached.concat((await cache.keys()).map((request) => new URL(request.url).pathname)); } return { controller: Boolean(navigator.serviceWorker.controller), scope: reg.scope, cached }; }',
    },
  })
  console.log('SW', textOf(sw).replace(/\s+/g, ' ').slice(0, 500))
  await call('tools/call', {
    name: 'emulate',
    arguments: { ...(pageId ? { pageId } : {}), networkConditions: 'Offline' },
  })
  await call('tools/call', {
    name: 'navigate_page',
    arguments: { ...(pageId ? { pageId } : {}), type: 'reload' },
  })
  const offlineSnapshot = await call('tools/call', {
    name: 'take_snapshot',
    arguments: pageId ? { pageId } : {},
  })
  const offlineText = textOf(offlineSnapshot)
  console.log('OFFLINE_HAS_PAGE', offlineText.includes('Giới thiệu'))
  console.log('OFFLINE_FALLBACK', offlineText.includes('Đang offline') || offlineText.includes('Offline'))
  console.log('OFFLINE_SNAPSHOT', offlineText.replace(/\s+/g, ' ').slice(0, 500))
} catch (error) {
  console.log('BROWSE_FAIL', error.message)
  console.log(stderr.slice(0, 800))
} finally {
  child.kill()
  setTimeout(() => process.exit(0), 500)
}
