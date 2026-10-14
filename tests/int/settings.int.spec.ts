/**
 * @vitest-environment node
 */
import crypto from 'node:crypto'

import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ROLE_SITE_ADMIN, ROLE_SYSTEM_ADMIN } from '@/access/roles'
import { LOCAL_HTTPS_ORIGIN, normalizeSiteUrl } from '@/lib/site/origin'
import { loadPublicSiteSettings } from '@/lib/site/settings'
import { assessSiteSetup } from '@/lib/site/setup'
import { buildOfflineManifest } from '@/lib/offline/manifest'
import config from '@/payload.config'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const password = crypto.randomBytes(18).toString('base64url')

describe('site settings foundation', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'users',
      where: { email: { like: `settings-${suffix}` } },
      overrideAccess: true,
    })
  })

  it('recognizes defaults and an unfinished setup', () => {
    expect(normalizeSiteUrl('http://zyvavu.test')).toBe(LOCAL_HTTPS_ORIGIN)
    expect(normalizeSiteUrl('https://zyvavu.test/path')).toBeNull()
    expect(
      assessSiteSetup({
        siteName: 'zyvavu',
        siteUrl: LOCAL_HTTPS_ORIGIN,
        language: 'vi',
        setupComplete: false,
      }),
    ).toEqual({ complete: false, missing: ['confirmation'] })
    expect(
      assessSiteSetup({
        siteName: 'zyvavu',
        siteUrl: LOCAL_HTTPS_ORIGIN,
        language: 'vi',
        setupComplete: true,
      }).complete,
    ).toBe(true)
  })

  it('lets a site-admin edit site settings and blocks system settings', async () => {
    const original = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    const originalSystem = await payload.findGlobal({ slug: 'system-settings', overrideAccess: true })
    const systemUser = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { trustedRole: true },
      data: {
        email: `settings-${suffix}-system@zyvavu.test`,
        password,
        role: ROLE_SYSTEM_ADMIN,
      },
    })
    const siteUser = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { trustedRole: true },
      data: {
        email: `settings-${suffix}-site@zyvavu.test`,
        password,
        role: ROLE_SITE_ADMIN,
      },
    })

    try {
      expect(original.siteName).toBeTruthy()
      expect(original.language).toBe('vi')
      expect(original.postsPerPage).toBe(10)
      expect(original.pwaEnabled).not.toBe(false)
      expect(original.setupComplete).not.toBe(true)
      expect(normalizeSiteUrl(original.siteUrl)).toBe(LOCAL_HTTPS_ORIGIN)

      const updated = await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: false,
        user: siteUser,
        data: {
          siteName: `Zyvavu ${suffix}`,
          tagline: 'Tagline from site-admin',
          siteUrl: 'http://zyvavu.test',
          language: 'vi',
        },
      })
      expect(updated.siteName).toBe(`Zyvavu ${suffix}`)
      expect(updated.siteUrl).toBe(LOCAL_HTTPS_ORIGIN)

      const publicSettings = await loadPublicSiteSettings(payload)
      expect(publicSettings.siteName).toBe(`Zyvavu ${suffix}`)
      expect(publicSettings.tagline).toBe('Tagline from site-admin')
      expect(publicSettings.language).toBe('vi')
      expect(publicSettings.siteUrl).toBe(LOCAL_HTTPS_ORIGIN)
      expect(publicSettings.pwaEnabled).toBe(true)

      await expect(
        payload.updateGlobal({
          slug: 'settings',
          overrideAccess: false,
          user: siteUser,
          data: { siteUrl: 'https://zyvavu.test/blog' },
        }),
      ).rejects.toThrow(/site url/i)

      await expect(
        payload.updateGlobal({
          slug: 'settings',
          overrideAccess: false,
          user: siteUser,
          data: { language: 'vietnamese' },
        }),
      ).rejects.toThrow(/language/i)

      await expect(
        payload.findGlobal({
          slug: 'system-settings',
          overrideAccess: false,
          user: siteUser,
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)

      await expect(
        payload.updateGlobal({
          slug: 'system-settings',
          overrideAccess: false,
          user: siteUser,
          data: { maintenanceNote: 'site-admin should not write this' },
        }),
      ).rejects.toThrow(/not allowed|forbidden/i)

      const note = await payload.updateGlobal({
        slug: 'system-settings',
        overrideAccess: false,
        user: systemUser,
        data: { maintenanceNote: `note-${suffix}` },
      })
      expect(note.maintenanceNote).toBe(`note-${suffix}`)

      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { pwaEnabled: false, offlinePageLimit: 3 },
      })
      const disabled = await buildOfflineManifest(payload)
      expect(disabled).toMatchObject({ enabled: false, pages: [] })

      const session = await payload.login({
        collection: 'users',
        data: { email: siteUser.email, password },
      })
      const response = await handleEndpoints({
        config,
        request: new Request('http://zyvavu.test/api/globals/settings', {
          method: 'POST',
          headers: {
            authorization: `JWT ${session.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ tagline: 'REST tagline' }),
        }),
      })
      expect(response.status).toBe(200)
      const denied = await handleEndpoints({
        config,
        request: new Request('http://zyvavu.test/api/globals/system-settings', {
          method: 'GET',
          headers: { authorization: `JWT ${session.token}` },
        }),
      })
      expect(denied.status).toBe(403)
    } finally {
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: {
          siteName: original.siteName,
          tagline: original.tagline || '',
          siteUrl: LOCAL_HTTPS_ORIGIN,
          language: original.language,
          postsPerPage: original.postsPerPage,
          pwaEnabled: original.pwaEnabled !== false,
          offlinePageLimit: original.offlinePageLimit,
          setupComplete: original.setupComplete === true,
        },
      })
      await payload.updateGlobal({
        slug: 'system-settings',
        overrideAccess: true,
        data: { maintenanceNote: originalSystem.maintenanceNote || '' },
      })
    }
  }, 20000)
})
