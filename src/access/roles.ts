import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export const ROLE_SYSTEM_ADMIN = 'system-admin'
export const ROLE_SITE_ADMIN = 'site-admin'

export type AppRole = typeof ROLE_SYSTEM_ADMIN | typeof ROLE_SITE_ADMIN

type WithRole = { role?: string | null }

export const roleOf = (user: unknown): string | undefined => {
  if (!user || typeof user !== 'object') return undefined
  const role = (user as WithRole).role
  return typeof role === 'string' ? role : undefined
}

export const isSystemAdmin = (user: unknown): boolean => roleOf(user) === ROLE_SYSTEM_ADMIN

export const isSiteStaff = (user: unknown): boolean => {
  const role = roleOf(user)
  return role === ROLE_SYSTEM_ADMIN || role === ROLE_SITE_ADMIN
}

export const systemAdminAccess: Access = ({ req }) => isSystemAdmin(req.user)

export const siteStaffAccess: Access = ({ req }) => isSiteStaff(req.user)

export const systemAdminFieldAccess: FieldAccess = ({ req }) => isSystemAdmin(req.user)

export const publicOrStaffRead: Access = ({ req }) => {
  if (isSiteStaff(req.user)) return true
  const where: Where = {
    and: [{ _status: { equals: 'published' } }, { visibility: { equals: 'public' } }],
  }
  return where
}

export const publishedRead: Access = ({ req }) => {
  if (isSiteStaff(req.user)) return true
  return { _status: { equals: 'published' } }
}

export async function noUsersExist(req: PayloadRequest): Promise<boolean> {
  const { totalDocs } = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    req,
  })
  return totalDocs === 0
}
