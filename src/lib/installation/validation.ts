import { normalizeSiteUrl } from '@/lib/site/origin'
import { TIMEZONE_OPTIONS } from '@/lib/dateTime'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'

export type DatabaseInput = { host: string; port: string; database: string; username: string; password: string; ssl: string }
export type WebsiteInput = { siteName: string; siteUrl: string; language: string; timezone: string; activeThemeId: string }
export class SetupError extends Error {
  constructor(public key: string, public status = 400) { super(key) }
}
export function databaseURL(input: DatabaseInput): string {
  if (!input || typeof input.host !== 'string' || !/^[a-zA-Z0-9.:-]+$/.test(input.host) || input.host.length > 253 ||
    !/^\d+$/.test(input.port) || Number(input.port) < 1 || Number(input.port) > 65535 ||
    ![input.database, input.username].every(v => typeof v === 'string' && v.trim() && v.length <= 128) ||
    typeof input.password !== 'string' || input.password.length > 1024 || !['disable', 'verify-full'].includes(input.ssl)) {
    throw new SetupError('validation')
  }
  const host = input.host.includes(':') ? `[${input.host}]` : input.host
  return `postgresql://${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}@${host}:${input.port}/${encodeURIComponent(input.database)}?sslmode=${input.ssl}`
}
export function validateWebsite(input: WebsiteInput): WebsiteInput {
  if (!input || typeof input.siteName !== 'string' || !input.siteName.trim() || input.siteName.length > 120 ||
    !normalizeSiteUrl(input.siteUrl) || !['vi', 'en'].includes(input.language) ||
    !TIMEZONE_OPTIONS.some(t => t.value === input.timezone) || !getAllInstalledThemes().some(t => t.id === input.activeThemeId)) throw new SetupError('validation')
  return { ...input, siteName: input.siteName.trim(), siteUrl: normalizeSiteUrl(input.siteUrl)! }
}
export function validateAdmin(input: { email: string; password: string }) {
  if (!input || typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 ||
    typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) throw new SetupError('adminValidation')
  return { email: input.email.trim().toLowerCase(), password: input.password }
}
export function databaseError(error: unknown): SetupError {
  const code = (error as { code?: string })?.code
  if (code === '28P01' || code === '28000') return new SetupError('authentication')
  if (code === '3D000') return new SetupError('missingDatabase')
  if (code === '42501') return new SetupError('databasePermission')
  return new SetupError('connection')
}
