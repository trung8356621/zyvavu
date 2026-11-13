import type { Payload } from 'payload'
import { listBundledThemeIds } from '@/lib/theme-engine/themes'

/**
 * Live Theme Customize bridge controls.
 * Default MCP path stays memory-only. Live Payload mutations require explicit opt-in
 * and disposable QA targeting — never the silent use of localhost as production.
 */

export type LiveBridgeConfig = {
  enabled: boolean
  allowBundledThemeWrites: boolean
  qaThemePrefix: string
  reason: string
}

let payloadClient: Payload | null = null
let testOverride: LiveBridgeConfig | null = null

export function setMcpPayloadClient(payload: Payload | null) {
  payloadClient = payload
}

export function getMcpPayloadClient() {
  return payloadClient
}

export function setLiveBridgeConfigForTests(config: LiveBridgeConfig | null) {
  testOverride = config
}

export function resetLiveBridgeForTests() {
  payloadClient = null
  testOverride = null
}

export function resolveLiveBridgeConfig(): LiveBridgeConfig {
  if (testOverride) return testOverride
  const enabled = process.env.ZYVAVU_MCP_LIVE_WRITES === '1'
  const allowBundledThemeWrites = process.env.ZYVAVU_MCP_ALLOW_BUNDLED_WRITES === '1'
  const qaThemePrefix =
    typeof process.env.ZYVAVU_MCP_QA_THEME_PREFIX === 'string' &&
    process.env.ZYVAVU_MCP_QA_THEME_PREFIX.trim()
      ? process.env.ZYVAVU_MCP_QA_THEME_PREFIX.trim().toLowerCase()
      : 'qa-'
  if (!enabled) {
    return {
      enabled: false,
      allowBundledThemeWrites: false,
      qaThemePrefix,
      reason: 'ZYVAVU_MCP_LIVE_WRITES is not enabled. Default MCP path uses disposable memory store only.',
    }
  }
  if (!payloadClient) {
    return {
      enabled: false,
      allowBundledThemeWrites,
      qaThemePrefix,
      reason: 'Live writes enabled but no Payload client is bound to this MCP process.',
    }
  }
  return {
    enabled: true,
    allowBundledThemeWrites,
    qaThemePrefix,
    reason: 'Live bridge enabled with bound Payload client.',
  }
}

/** Refuse mutating the active theme or bundled themes unless explicitly allowed. */
export function assertIsolatedWriteTarget(input: {
  themeId: string
  activeThemeId?: string | null
  operation: 'create' | 'update'
}) {
  const config = resolveLiveBridgeConfig()
  const themeId = input.themeId.trim().toLowerCase()
  if (input.activeThemeId && themeId === input.activeThemeId.trim().toLowerCase()) {
    throw new Error(
      `Refusing to ${input.operation} the active theme "${themeId}". Use a disposable QA theme.`,
    )
  }
  if (!config.allowBundledThemeWrites && listBundledThemeIds().includes(themeId)) {
    throw new Error(
      `Refusing to ${input.operation} bundled theme "${themeId}". Create/use a qa-* disposable theme.`,
    )
  }
  if (
    input.operation === 'update' &&
    !config.allowBundledThemeWrites &&
    !themeId.startsWith(config.qaThemePrefix)
  ) {
    throw new Error(
      `Refusing live update for "${themeId}". Live updates require Theme ID prefix "${config.qaThemePrefix}".`,
    )
  }
}
