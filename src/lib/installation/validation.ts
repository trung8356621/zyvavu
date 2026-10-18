import { normalizeSiteUrl } from '@/lib/site/origin'
import { TIMEZONE_OPTIONS } from '@/lib/dateTime'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'

import { SetupError, type DatabaseInput, type WebsiteInput } from './input'
export { SetupError, validateAdmin, type DatabaseInput, type WebsiteInput } from './input'
export function databaseURL(input: DatabaseInput): string {
  if (!input || typeof input.host !== 'string' || !/^[a-zA-Z0-9.:-]+$/.test(input.host) || input.host.length > 253 ||
    !/^\d+$/.test(input.port) || Number(input.port) < 1 || Number(input.port) > 65535 ||
    ![input.database, input.username].every(v => typeof v === 'string' && v.trim() && v.length <= 128) ||
    typeof input.password !== 'string' || input.password.length > 1024 || !['disable', 'verify-full'].includes(input.ssl)) {
    throw new SetupError('validation')
  }
  const host = input.host.includes(':') ? `[${input.host}]` : input.host
  const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  const url = `postgresql://${encode(input.username)}:${encode(input.password)}@${host}:${input.port}/${encode(input.database)}?sslmode=${input.ssl}`
  try { new URL(url) } catch { throw new SetupError('validation') }
  return url
}
export function validateWebsite(input: WebsiteInput): WebsiteInput {
  if (!input || typeof input.siteName !== 'string' || !input.siteName.trim() || input.siteName.length > 120 ||
    !normalizeSiteUrl(input.siteUrl) || !['vi', 'en'].includes(input.language) ||
    !TIMEZONE_OPTIONS.some(t => t.value === input.timezone) || !getAllInstalledThemes().some(t => t.id === input.activeThemeId)) throw new SetupError('validation')
  return { siteName: input.siteName.trim(), siteUrl: normalizeSiteUrl(input.siteUrl)!, language: input.language, timezone: input.timezone, activeThemeId: input.activeThemeId }
}
export function databaseError(error: unknown): SetupError {
  const code = (error as { code?: string })?.code
  if (code === '28P01' || code === '28000') return new SetupError('authentication')
  if (code === '3D000') return new SetupError('missingDatabase')
  if (code === '42501') return new SetupError('databasePermission')
  return new SetupError('connection')
}
