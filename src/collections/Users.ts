import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import {
  isSystemAdmin,
  noUsersExist,
  ROLE_SITE_ADMIN,
  ROLE_SYSTEM_ADMIN,
  systemAdminFieldAccess,
} from '@/access/roles'

const guardRole: CollectionBeforeChangeHook = async ({ data, req, operation, originalDoc }) => {
  const next = { ...data }
  const firstUser = operation === 'create' && (await noUsersExist(req))

  if (firstUser) {
    next.role = ROLE_SYSTEM_ADMIN
    return next
  }

  if (req.context?.trustedRole === true || isSystemAdmin(req.user)) return next

  if (next.role === ROLE_SYSTEM_ADMIN || originalDoc?.role === ROLE_SYSTEM_ADMIN) {
    throw new APIError('Only a system admin can assign or change the system-admin role.', 403)
  }

  next.role = originalDoc?.role || ROLE_SITE_ADMIN
  return next
}

const publicOrigin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://zyvavu.test'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: {
    cookies: {
      secure: publicOrigin.startsWith('https://'),
      sameSite: 'Lax',
    },
  },
  access: {
    admin: ({ req }) => req.user?.role === ROLE_SYSTEM_ADMIN || req.user?.role === ROLE_SITE_ADMIN,
    create: async ({ req }) => {
      if (isSystemAdmin(req.user)) return true
      return !req.user && (await noUsersExist(req))
    },
    read: ({ req }) => {
      if (isSystemAdmin(req.user)) return true
      if (req.user?.role === ROLE_SITE_ADMIN) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (isSystemAdmin(req.user)) return true
      if (req.user?.role === ROLE_SITE_ADMIN) return { id: { equals: req.user.id } }
      return false
    },
    delete: ({ req }) => isSystemAdmin(req.user),
  },
  hooks: {
    beforeChange: [guardRole],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: ROLE_SITE_ADMIN,
      saveToJWT: true,
      options: [
        { label: 'System admin', value: ROLE_SYSTEM_ADMIN },
        { label: 'Site admin', value: ROLE_SITE_ADMIN },
      ],
      access: {
        create: systemAdminFieldAccess,
        update: systemAdminFieldAccess,
      },
    },
  ],
}
