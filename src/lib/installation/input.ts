// Shared, lightweight validation for the client; no database or theme templates.
export type DatabaseInput = { host: string; port: string; database: string; username: string; password: string; ssl: string }
export type WebsiteInput = { siteName: string; siteUrl: string; language: string; timezone: string; activeThemeId: string }
export class SetupError extends Error {
  constructor(public key: string, public status = 400) { super(key) }
}
export function validateAdmin(input: { email: string; password: string }) {
  if (!input || typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 ||
    typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) throw new SetupError('adminValidation')
  return { email: input.email.trim().toLowerCase(), password: input.password }
}
