import { spawn } from 'node:child_process'
import fs from 'node:fs'

const target = process.argv[2]
const child = spawn(process.execPath, [target, '--isolated', '--no-usage-statistics', '--no-performance-crux'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1' },
})
let buffer = Buffer.alloc(0)
const messages = []
let stderr = ''
const waiters = []

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
})

child.stdout.on('data', (chunk) => {
  if (messages.length === 0 && buffer.length < 500) {
    console.log('STDOUT_CHUNK', JSON.stringify(chunk.toString('utf8').slice(0, 300)))
  }
  buffer = Buffer.concat([buffer, chunk])
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) break
    const header = buffer.slice(0, headerEnd).toString('utf8')
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) break
    const length = Number(match[1])
    const start = headerEnd + 4
    if (buffer.length < start + length) break
    messages.push(JSON.parse(buffer.slice(start, start + length).toString('utf8')))
    buffer = buffer.slice(start + length)
  }
  for (const waiter of [...waiters]) waiter()
})

function send(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`)
  child.stdin.write(body)
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

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('server did not start')), 20000)
  const check = () => {
    if (!stderr.includes('usage statistics') && !stderr.includes('DevTools')) return
    clearTimeout(timer)
    resolve()
  }
  child.stderr.on('data', check)
  check()
})

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'zyvavu-check', version: '1.0.0' },
  },
})

try {
  const init = await waitFor((message) => message.id === 1, 20000)
  send({ jsonrpc: '2.0', method: 'notifications/initialized' })
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  const listed = await waitFor((message) => message.id === 2, 90000)
  const tools = listed.result?.tools || []
  fs.writeFileSync(
    'D:\\zyvavu-bootstrap\\chrome-tools.json',
    JSON.stringify(
      tools.map((tool) => ({ name: tool.name, description: tool.description })),
      null,
      2,
    ),
  )
  console.log('INIT', init.result?.serverInfo?.name || init.error?.message || 'ok')
  console.log('TOOLS', tools.map((tool) => tool.name).join(','))
} catch (error) {
  console.log('MCP_FAIL', error.message)
  console.log(stderr.slice(0, 2000))
} finally {
  child.kill()
  setTimeout(() => process.exit(0), 400)
}
