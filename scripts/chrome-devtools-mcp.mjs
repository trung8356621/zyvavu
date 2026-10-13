import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const packageJson = require.resolve('chrome-devtools-mcp/package.json')
const bin = path.join(path.dirname(packageJson), 'build', 'src', 'bin', 'chrome-devtools-mcp.js')

const child = spawn(
  process.execPath,
  [bin, '--isolated', '--no-usage-statistics', '--no-performance-crux'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1',
    },
  },
)

child.on('exit', (code) => process.exit(code ?? 1))
