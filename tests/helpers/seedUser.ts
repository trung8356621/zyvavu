import crypto from 'node:crypto'

import { getPayload } from 'payload'

import { ROLE_SITE_ADMIN } from '@/access/roles'
import config from '../../src/payload.config.js'

export const testUser = {
  email: `zyvavu-e2e-${crypto.randomBytes(4).toString('hex')}@zyvavu.test`,
  password: crypto.randomBytes(18).toString('base64url'),
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    draft: false,
    data: { ...testUser, role: ROLE_SITE_ADMIN },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
