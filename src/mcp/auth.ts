import { isSiteStaff, roleOf } from '@/access/roles'
import { object, type RecordValue } from './shape'
import { ToolError } from './tool-contract'

export type McpPrincipal = {
  id: string
  role: string
  trust: 'harness' | 'payload-token'
}

export type McpAuthUserRecord = {
  id: string
  role: string
  email?: string
}

type PayloadAuthClient = {
  auth: (args: { headers: Headers }) => Promise<{ user: unknown }>
  findByID: (args: {
    collection: 'users'
    id: string
    overrideAccess?: boolean
  }) => Promise<{ id: string | number; role?: string | null } | null>
}

type AuthHarnessState = {
  secret: string
  users: Map<string, McpAuthUserRecord>
}

let harnessState: AuthHarnessState | null = null
let payloadAuthClient: PayloadAuthClient | null = null

/** Test/local harness only. Live processes must use env ZYVAVU_MCP_HARNESS_SECRET. */
export function configureMcpAuthHarness(input: {
  secret: string
  users: McpAuthUserRecord[]
}) {
  if (!input.secret.trim()) {
    throw new Error('Harness secret must be non-empty.')
  }
  harnessState = {
    secret: input.secret,
    users: new Map(input.users.map((user) => [user.id, user])),
  }
}

export function resetMcpAuthForTests() {
  harnessState = null
  payloadAuthClient = null
}

export function setMcpPayloadAuthClient(client: PayloadAuthClient | null) {
  payloadAuthClient = client
}

function envHarnessSecret() {
  const value = process.env.ZYVAVU_MCP_HARNESS_SECRET
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function principalFromUser(user: McpAuthUserRecord, trust: McpPrincipal['trust']): McpPrincipal {
  if (!isSiteStaff(user)) {
    throw new ToolError('ACCESS_DENIED', 'Theme Customize requires site-admin or system-admin.')
  }
  return { id: user.id, role: roleOf(user) || user.role, trust }
}

/**
 * Trusted application boundary.
 * Caller-supplied auth.user.id / auth.user.role are NEVER treated as verified authorization.
 */
export async function resolveTrustedPrincipal(auth: unknown): Promise<McpPrincipal> {
  if (!object(auth)) {
    throw new ToolError('ACCESS_DENIED', 'Trusted authentication is required.')
  }

  // Explicitly reject forged role claims even if also present alongside other fields.
  if (object(auth.user) && !auth.payloadToken && !object(auth.harness)) {
    throw new ToolError(
      'ACCESS_DENIED',
      'Caller-supplied auth.user is not a trusted identity. Provide a verified payloadToken or harness secret.',
    )
  }

  if (typeof auth.payloadToken === 'string' && auth.payloadToken.trim()) {
    const client = payloadAuthClient
    if (!client) {
      throw new ToolError(
        'ACCESS_DENIED',
        'Payload token verification is unavailable in this MCP process.',
      )
    }
    const headers = new Headers({ Authorization: `JWT ${auth.payloadToken.trim()}` })
    const result = await client.auth({ headers })
    const user = result?.user
    if (!user || typeof user !== 'object') {
      throw new ToolError('ACCESS_DENIED', 'Payload token did not resolve to a user.')
    }
    const id = String((user as { id?: unknown }).id ?? '').trim()
    const role = roleOf(user)
    if (!id || !role) {
      throw new ToolError('ACCESS_DENIED', 'Payload token did not resolve to a site-staff principal.')
    }
    return principalFromUser({ id, role }, 'payload-token')
  }

  if (object(auth.harness)) {
    const secret = typeof auth.harness.secret === 'string' ? auth.harness.secret : ''
    const userId = typeof auth.harness.userId === 'string' ? auth.harness.userId.trim() : ''
    if (!secret || !userId) {
      throw new ToolError('ACCESS_DENIED', 'Harness authentication requires secret and userId.')
    }
    const expected = harnessState?.secret || envHarnessSecret()
    if (!expected || secret !== expected) {
      throw new ToolError('ACCESS_DENIED', 'Harness secret is invalid or harness auth is disabled.')
    }
    const local = harnessState?.users.get(userId)
    if (local) return principalFromUser(local, 'harness')

    const client = payloadAuthClient
    if (client) {
      const doc = await client.findByID({
        collection: 'users',
        id: userId,
        overrideAccess: true,
      })
      const role = roleOf(doc)
      if (!doc || !role) {
        throw new ToolError('ACCESS_DENIED', 'Harness userId did not resolve to a site-staff user.')
      }
      return principalFromUser({ id: String(doc.id), role }, 'harness')
    }
    throw new ToolError('ACCESS_DENIED', 'Harness userId is unknown and Payload lookup is unavailable.')
  }

  throw new ToolError(
    'ACCESS_DENIED',
    'Trusted authentication is required (payloadToken or harness). Caller-supplied roles are rejected.',
  )
}

export function authArgs() {
  return {
    auth: {
      type: 'object' as const,
      properties: {
        payloadToken: { type: 'string' as const },
        harness: {
          type: 'object' as const,
          properties: {
            secret: { type: 'string' as const },
            userId: { type: 'string' as const },
          },
          required: ['secret', 'userId'] as const,
          additionalProperties: false as const,
        },
        // Accepted in schema only so forged payloads reach the trust boundary and are rejected.
        user: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            role: { type: 'string' as const },
          },
          required: ['id', 'role'] as const,
          additionalProperties: false as const,
        },
      },
      additionalProperties: false as const,
    },
  }
}

export function redactPrincipal(principal: McpPrincipal) {
  return { id: principal.id, role: principal.role, trust: principal.trust }
}

export async function readAuth(args: RecordValue) {
  return resolveTrustedPrincipal(args.auth)
}
