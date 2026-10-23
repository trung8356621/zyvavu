import { createLocalReq, type Payload } from 'payload'
import { isSiteStaff, isSystemAdmin } from '@/access/roles'
import { resolveSeoPageContext } from '@/lib/seo/context'
import { isReservedPath, normalizePath } from '@/lib/url/normalize'
import { designTemplate, resourceTarget, suppressToolbar, type ToolbarData } from './model'

export const TOOLBAR_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
  Pragma: 'no-cache',
}

export async function resolveToolbar(payload: Payload, request: Request): Promise<ToolbarData | null> {
  const rawPath = new URL(request.url).searchParams.get('path') || '/'
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.length > 2048) return null
  let path: string
  try { path = normalizePath(rawPath) } catch { return null }
  if (isReservedPath(path) || suppressToolbar(path)) return null

  // Do not allow Payload's development autoLogin fallback for missing/invalid sessions.
  const cookie = request.headers.get('cookie') || ''
  const cookieName = `${payload.config.cookiePrefix}-token`
  if (!cookie.split(';').some((entry) => entry.trim().startsWith(`${cookieName}=`) && entry.trim() !== `${cookieName}=`)) return null
  // Payload validates cookie authentication against Origin / Sec-Fetch-Site.
  // Preserve the browser's headers so a valid same-origin session is recognized.
  const headers = new Headers(request.headers)
  headers.set('DisableAutologin', 'true')
  const { user, permissions } = await payload.auth({ headers })
  if (!user || !isSiteStaff(user) || !permissions.canAccessAdmin) return null

  const admin = payload.config.routes.admin
  const data: ToolbarData = {
    path: rawPath,
    displayName: isSystemAdmin(user) ? 'System admin' : 'Site admin',
    dashboard: admin,
    profile: `${admin}/account`,
    logout: `${payload.config.routes.api}/${payload.config.admin.user}/logout`,
    create: [],
  }
  for (const [collection, label] of [['posts', 'Post'], ['pages', 'Page']] as const) {
    if (permissions.collections?.[collection]?.create) {
      data.create.push({ label, href: `${admin}/collections/${collection}/create` })
    }
  }

  const context = await resolveSeoPageContext(payload, path)
  const target = resourceTarget(context)
  if (target && permissions.collections?.[target.collection]?.update) {
    const req = await createLocalReq({ user, req: { headers } }, payload)
    const update = payload.collections[target.collection].config.access.update
    // Conservatively omit conditional Where grants; never infer document-level permission.
    if (update && await update({ id: target.id, req }) === true) {
      data.edit = {
        label: target.collection === 'categories' ? 'Edit Category' : target.collection === 'tags' ? 'Edit Tag' : 'Edit Content',
        href: `${admin}/collections/${target.collection}/${target.id}`,
      }
    }
  }
  if (permissions.globals?.settings?.update) {
    const template = designTemplate(context)
    data.design = {
      label: template ? 'Edit Design' : 'Theme Builder',
      href: `${admin}/theme-builder${template ? `?template=${template}` : ''}`,
    }
  }
  return data
}
