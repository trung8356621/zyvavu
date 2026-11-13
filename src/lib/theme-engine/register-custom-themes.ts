import type { Payload } from 'payload'
import { customRecordToInstalled, loadCustomThemes } from './custom-themes'
import { setRuntimeCustomThemes } from './themes'

/** Load custom themes from Settings into the runtime registry (request-scoped process memory). */
export async function ensureCustomThemesRegistered(payload: Payload) {
  const records = await loadCustomThemes(payload)
  setRuntimeCustomThemes(records.map(customRecordToInstalled))
  return records
}
