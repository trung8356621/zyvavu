import { serveStdio } from './server'

try {
  await serveStdio()
} catch {
  process.stderr.write('Zyvavu MCP transport stopped.\n')
  process.exitCode = 1
}
