/** Shared Settings/Canvas/Preview/frontend rule: missing, null, or 0 → 1 (MCP 1–6). */
export function normalizeSlidesPerView(value?: number | null) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1
  return Math.max(1, Math.min(6, n || 1))
}
