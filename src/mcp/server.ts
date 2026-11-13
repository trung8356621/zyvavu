import { once } from 'node:events'
import { object } from './shape'
import { callTool, listResources, listTools, readResource, ToolError } from './tools'

const supportedVersions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const maxMessageBytes = 512 * 1024
type Id = string | number | null

function failure(id: Id, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function result(id: Id, value: unknown) {
  return { jsonrpc: '2.0', id, result: value }
}

function toolResult(value: unknown, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError }
}

export function createSession() {
  let state: 'new' | 'initializing' | 'ready' = 'new'
  return async (line: string) => {
    let request: unknown
    try {
      request = JSON.parse(line)
    } catch {
      return failure(null, -32700, 'Parse error')
    }
    if (!object(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string')
      return failure(null, -32600, 'Invalid Request')
    const { id, method, params } = request
    if (id === undefined) {
      if (method === 'notifications/initialized' && state === 'initializing') state = 'ready'
      return undefined
    }
    if (typeof id !== 'string' && typeof id !== 'number') return failure(null, -32600, 'Invalid Request')
    if (params !== undefined && !object(params)) return failure(id, -32602, 'Invalid params')
    if (method === 'initialize') {
      if (state !== 'new') return failure(id, -32600, 'Already initialized')
      if (!params || typeof params.protocolVersion !== 'string' || !object(params.capabilities) ||
          !object(params.clientInfo) || typeof params.clientInfo.name !== 'string' ||
          typeof params.clientInfo.version !== 'string')
        return failure(id, -32602, 'Invalid initialization params')
      state = 'initializing'
      return result(id, {
        protocolVersion: supportedVersions.includes(params.protocolVersion) ? params.protocolVersion : supportedVersions[0],
        serverInfo: { name: 'zyvavu', version: '1.0.0' },
        capabilities: { tools: {}, resources: {} },
      })
    }
    if (method === 'ping') return result(id, {})
    if (state !== 'ready') return failure(id, -32002, 'Server has not been initialized')
    try {
      switch (method) {
        case 'tools/list': return result(id, { tools: listTools() })
        case 'tools/call': {
          if (typeof params?.name !== 'string') return failure(id, -32602, 'Tool name is required')
          try {
            const value = await callTool(params.name, Object.hasOwn(params, 'arguments') ? params.arguments : {})
            return result(id, toolResult(value))
          } catch (error) {
            if (error instanceof ToolError && error.code === 'UNKNOWN_TOOL') return failure(id, -32602, error.message)
            return result(id, toolResult(error instanceof ToolError
              ? { code: error.code, message: error.message, issues: error.issues }
              : { code: 'INTERNAL_ERROR', message: 'Tool execution failed.' }, true))
          }
        }
        case 'resources/list': return result(id, { resources: listResources() })
        case 'resources/templates/list': return result(id, { resourceTemplates: [] })
        case 'resources/read': {
          if (typeof params?.uri !== 'string') return failure(id, -32602, 'Resource URI is required')
          const value = readResource(params.uri)
          if (value === undefined) return failure(id, -32002, 'Resource not found')
          return result(id, {
            contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(value) }],
          })
        }
        default: return failure(id, -32601, 'Method not found')
      }
    } catch {
      return failure(id, -32603, 'Internal error')
    }
  }
}

export async function serveStdio() {
  const handle = createSession()
  const line = Buffer.alloc(maxMessageBytes)
  let size = 0
  let oversized = false
  for await (const chunk of process.stdin as AsyncIterable<Buffer>) {
    let start = 0
    while (start < chunk.length) {
      const newline = chunk.indexOf(10, start)
      const end = newline === -1 ? chunk.length : newline
      if (size + end - start > maxMessageBytes) oversized = true
      if (!oversized) size += chunk.copy(line, size, start, end)
      if (newline === -1) break
      const response = oversized
        ? failure(null, -32600, 'Message exceeds 512 KiB')
        : await handle(line.toString('utf8', 0, size))
      size = 0
      oversized = false
      if (response && !process.stdout.write(JSON.stringify(response) + '\n'))
        await once(process.stdout, 'drain')
      start = end + 1
    }
  }
}
