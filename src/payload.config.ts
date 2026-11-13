import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Menus } from './collections/Menus'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { UrlRegistry } from './collections/UrlRegistry'
import { Users } from './collections/Users'
import { WidgetPatterns } from './collections/WidgetPatterns'
import { SeoSettings } from './globals/SeoSettings'
import { Settings } from './globals/Settings'
import { SystemSettings } from './globals/SystemSettings'
import { buildOfflineManifest } from './lib/offline/manifest'
import { LOCAL_HTTP_ORIGIN, LOCAL_HTTPS_ORIGIN, canonicalPublicOrigin } from './lib/site/origin'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const publicOrigin = canonicalPublicOrigin(process.env.NEXT_PUBLIC_SERVER_URL)
const devOrigins = [
  'http://127.0.0.1:3107',
  'http://localhost:3107',
  'http://127.0.0.1',
  'http://localhost',
]
const allowedOrigins = Array.from(
  new Set([
    LOCAL_HTTP_ORIGIN,
    LOCAL_HTTPS_ORIGIN,
    publicOrigin,
    ...(process.env.NODE_ENV !== 'production' ? devOrigins : []),
  ]),
)

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'light',
    autoLogin: false,
    meta: {
      titleSuffix: '— Zyvavu',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: ['@/components/admin/ThemeProvider#ThemeProvider'],
      beforeDashboard: ['@/components/admin/DashboardWelcome#DashboardWelcome'],
      Nav: '@/components/admin/navigation/ZyvavuNav#ZyvavuNav',
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Logo#Icon',
      },
      views: {
        system: {
          Component: '@/components/admin/SystemView#SystemView',
          path: '/system',
          exact: true,
          meta: { title: 'System' },
        },
        seoSettings: {
          Component: '@/components/admin/SeoSettingsView#SeoSettingsView',
          path: '/seo-settings',
          exact: true,
          meta: { title: 'SEO Settings' },
        },
        menuBuilder: {
          Component: '@/components/admin/menus/MegaMenuBuilderView#MegaMenuBuilderView',
          path: '/menu-builder',
          exact: true,
          meta: { title: 'Mega Menu Builder' },
        },
        themes: {
          Component: '@/components/admin/themes/ThemesListView#ThemesListView',
          path: '/themes',
          exact: true,
          meta: { title: 'Themes' },
        },
        themeBuilder: {
          Component: '@/components/admin/theme-builder/ThemeBuilderView#ThemeBuilderView',
          path: '/theme-builder',
          exact: true,
          meta: { title: 'Theme Builder' },
        },
        themeCustomizer: {
          Component: '@/components/admin/theme-customizer/ThemeCustomizerView#ThemeCustomizerView',
          path: '/theme-customizer',
          exact: true,
          meta: { title: 'Theme Style Customizer' },
        },
      },
    },
  },
  collections: [Posts, Pages, Media, Categories, Tags, Menus, Users, UrlRegistry, WidgetPatterns],
  globals: [Settings, SystemSettings, SeoSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NODE_ENV === 'production' ? publicOrigin : undefined,
  cors: allowedOrigins,
  csrf: allowedOrigins,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: false,
    extensions: ['pg_trgm'],
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  sharp,
  endpoints: [
    {
      path: '/offline-manifest',
      method: 'get',
      handler: async (req) => {
        const manifest = await buildOfflineManifest(req.payload)
        return Response.json(manifest, {
          headers: { 'cache-control': 'no-store' },
        })
      },
    },
    {
      path: '/themes/activate',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { setActiveThemeId } = await import('@/lib/theme-engine/resolver')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        const { themeId } = body || {}
        if (!themeId) {
          return Response.json({ success: false, message: 'themeId is required' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const ok = await setActiveThemeId(req.payload, themeId)
        if (!ok) {
          return Response.json(
            { success: false, message: 'Failed to activate theme' },
            { status: 400 },
          )
        }
        return Response.json({ success: true, activeTheme: themeId })
      },
    },
    {
      path: '/themes/create',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { createCustomTheme } = await import('@/lib/theme-engine/custom-themes')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { listBundledThemeIds, getAllInstalledThemes } = await import('@/lib/theme-engine/themes')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const occupied = [
          ...listBundledThemeIds(),
          ...getAllInstalledThemes().map((theme) => theme.id),
        ]
        const result = await createCustomTheme(
          req.payload,
          {
            name: body?.name,
            description: body?.description,
            baseThemeId: body?.baseThemeId,
            websiteType: body?.websiteType,
          },
          occupied,
        )
        if (!result.success) {
          return Response.json(result, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        return Response.json({
          success: true,
          activated: false,
          theme: {
            id: result.theme.id,
            label: result.theme.label,
            description: result.theme.description,
            version: result.theme.version,
            websiteType: result.theme.websiteType,
          },
        })
      },
    },
    {
      path: '/themes/preview-cookie',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { isValidThemeId, normalizeThemeId } = await import('@/lib/theme-engine/themes')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const { themeId } = body || {}
        const headers = new Headers({ 'Content-Type': 'application/json' })
        if (themeId && isValidThemeId(themeId)) {
          headers.set(
            'Set-Cookie',
            `zyvavu_preview_theme=${normalizeThemeId(themeId)}; Path=/; SameSite=Lax; Max-Age=3600`,
          )
        } else {
          headers.set('Set-Cookie', `zyvavu_preview_theme=; Path=/; SameSite=Lax; Max-Age=0`)
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers })
      },
    },
    {
      path: '/theme-builder/save',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { saveThemeTemplateOverride } = await import('@/lib/theme-engine/resolver')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { template, document, themeId, loopItemId, homeVersionId, templateVersionId } = body || {}
        if (!template || !document) {
          return Response.json(
            { success: false, message: 'Template and document are required' },
            { status: 400 },
          )
        }
        if (template === 'loopItem') {
          const { saveLoopItemTemplate } = await import('@/lib/theme-engine/loop-item-templates')
          const id =
            (typeof loopItemId === 'string' && loopItemId.trim()) ||
            (typeof document?.metadata?.loopItemId === 'string' && document.metadata.loopItemId) ||
            ''
          const res = await saveLoopItemTemplate(req.payload, id, document, themeId)
          return Response.json(res, { status: res.success ? 200 : 400 })
        }
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const {
          isVersionableTemplateContext,
          saveTemplateVersion,
          LEGACY_TEMPLATE_VERSION_ID,
        } = await import('@/lib/theme-engine/template-versions')
        if (isVersionableTemplateContext(template)) {
          await ensureCustomThemesRegistered(req.payload)
          const id =
            (typeof templateVersionId === 'string' && templateVersionId.trim()) ||
            (typeof homeVersionId === 'string' && homeVersionId.trim()) ||
            (typeof document?.metadata?.templateVersionId === 'string' && document.metadata.templateVersionId) ||
            (typeof document?.metadata?.homeVersionId === 'string' && document.metadata.homeVersionId) ||
            LEGACY_TEMPLATE_VERSION_ID
          const res = await saveTemplateVersion(req.payload, template, id, document, themeId)
          return Response.json(res, { status: res.success ? 200 : 400 })
        }
        const res = await saveThemeTemplateOverride(
          req.payload,
          template,
          document,
          req.user,
          themeId,
        )
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-builder/template-version/create',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { createTemplateVersion } = await import('@/lib/theme-engine/template-versions')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { themeId, name, document, sourceVersionId, template, context } = body || {}
        if (!document) {
          return Response.json({ success: false, message: 'document is required' }, { status: 400 })
        }
        const versionContext = context || template
        if (!versionContext) {
          return Response.json({ success: false, message: 'template/context is required' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const res = await createTemplateVersion(req.payload, {
          themeId,
          name,
          document,
          sourceVersionId,
          context: versionContext,
        })
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-builder/template-version/set-primary',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { setPrimaryTemplateVersion } = await import('@/lib/theme-engine/template-versions')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { themeId, versionId, template, context } = body || {}
        if (!versionId) {
          return Response.json({ success: false, message: 'versionId is required' }, { status: 400 })
        }
        const versionContext = context || template
        if (!versionContext) {
          return Response.json({ success: false, message: 'template/context is required' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const res = await setPrimaryTemplateVersion(req.payload, versionContext, versionId, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-builder/home-version/create',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { createTemplateVersion } = await import('@/lib/theme-engine/template-versions')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { themeId, name, document, sourceVersionId } = body || {}
        if (!document) {
          return Response.json({ success: false, message: 'document is required' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const res = await createTemplateVersion(req.payload, {
          themeId,
          name,
          document,
          sourceVersionId,
          context: 'home',
        })
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-builder/home-version/set-primary',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { setPrimaryTemplateVersion } = await import('@/lib/theme-engine/template-versions')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { themeId, versionId } = body || {}
        if (!versionId) {
          return Response.json({ success: false, message: 'versionId is required' }, { status: 400 })
        }
        await ensureCustomThemesRegistered(req.payload)
        const res = await setPrimaryTemplateVersion(req.payload, 'home', versionId, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-builder/loop-item',
      method: 'get',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        if (!isSiteStaff(req.user)) return Response.json({ message: 'Forbidden' }, { status: 403 })
        const { ensureCustomThemesRegistered } = await import('@/lib/theme-engine/register-custom-themes')
        const { isValidThemeId, normalizeThemeId } = await import('@/lib/theme-engine/themes')
        const { listLoopItemTemplates, resolveLoopItemTemplate } = await import('@/lib/theme-engine/loop-item-templates')
        const themeId = req.searchParams.get('theme')
        await ensureCustomThemesRegistered(req.payload)
        if (!themeId || !isValidThemeId(themeId) || normalizeThemeId(themeId) !== themeId) {
          return Response.json({ message: 'Theme not found' }, { status: 404 })
        }
        const items = await listLoopItemTemplates(req.payload, themeId)
        const available = await Promise.all(items.map(async ({ id, name }) =>
          await resolveLoopItemTemplate(req.payload, id, themeId) ? { id, name } : null,
        ))
        return Response.json({ items: available.filter(Boolean) })
      },
    },
    {
      path: '/theme-builder/loop-item/create',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { createLoopItemTemplate } = await import('@/lib/theme-engine/loop-item-templates')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
        }
        const { name, themeId } = body || {}
        const res = await createLoopItemTemplate(req.payload, name, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-customizer/import',
      method: 'post',
      handler: async (req) => {
        const { handleThemeImport } = await import('@/lib/theme-engine/theme-import')
        return handleThemeImport(req)
      },
    },
    {
      path: '/theme-builder/import',
      method: 'post',
      handler: async (req) => {
        const { handleTemplateImport } = await import('@/lib/theme-engine/template-import')
        return handleTemplateImport(req)
      },
    },
    {
      path: '/theme-customizer/save-draft',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { saveThemeStyleOverride } = await import('@/lib/theme-engine/styles')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        const { tokens, slots, themeId } = body || {}
        if (!tokens) {
          return Response.json({ success: false, message: 'Tokens are required' }, { status: 400 })
        }
        const res = await saveThemeStyleOverride(req.payload, tokens, false, slots, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-customizer/publish',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { saveThemeStyleOverride } = await import('@/lib/theme-engine/styles')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        const { tokens, slots, themeId } = body || {}
        if (!tokens) {
          return Response.json({ success: false, message: 'Tokens are required' }, { status: 400 })
        }
        const res = await saveThemeStyleOverride(req.payload, tokens, true, slots, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-customizer/custom-preset',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { saveCustomPreset } = await import('@/lib/theme-engine/styles')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        let body: any
        try {
          body = await req.json?.()
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
        }
        const { type, preset } = body || {}
        if (!type || !preset) {
          return Response.json(
            { success: false, message: 'type and preset are required' },
            { status: 400 },
          )
        }
        const res = await saveCustomPreset(req.payload, type, preset)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-customizer/custom-preset',
      method: 'delete',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { deleteCustomPreset } = await import('@/lib/theme-engine/styles')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        const url = new URL(req.url || '', 'http://localhost')
        const type = (url.searchParams.get('type') || 'colors') as 'colors' | 'typography'
        const id = url.searchParams.get('id') || ''
        if (!id) {
          return Response.json({ success: false, message: 'id is required' }, { status: 400 })
        }
        const res = await deleteCustomPreset(req.payload, type, id)
        return Response.json(res, { status: res.success ? 200 : 400 })
      },
    },
    {
      path: '/theme-customizer/fonts',
      method: 'get',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { getAvailableFonts } = await import('@/lib/theme-engine/fonts')
        if (!isSiteStaff(req.user)) {
          return Response.json({ success: false, message: 'Forbidden' }, { status: 403 })
        }
        const fonts = await getAvailableFonts()
        return Response.json({ fonts })
      },
    },
  ],
  plugins: [],
})
