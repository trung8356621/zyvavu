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
    autoLogin:
      process.env.NODE_ENV !== 'production'
        ? {
            email: 'trungtien1993@gmail.com',
          }
        : false,
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
  collections: [Posts, Pages, Media, Categories, Tags, Menus, Users, UrlRegistry],
  globals: [Settings, SystemSettings],
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
        const ok = await setActiveThemeId(req.payload, themeId)
        if (!ok) {
          return Response.json({ success: false, message: 'Failed to activate theme' }, { status: 400 })
        }
        return Response.json({ success: true, activeTheme: themeId })
      },
    },
    {
      path: '/themes/preview-cookie',
      method: 'post',
      handler: async (req) => {
        const { isSiteStaff } = await import('@/access/roles')
        const { isValidThemeId, normalizeThemeId } = await import('@/lib/theme-engine/themes')
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
        const headers = new Headers({ 'Content-Type': 'application/json' })
        if (themeId && isValidThemeId(themeId)) {
          headers.set(
            'Set-Cookie',
            `zyvavu_preview_theme=${normalizeThemeId(themeId)}; Path=/; SameSite=Lax; Max-Age=3600`,
          )
        } else {
          headers.set(
            'Set-Cookie',
            `zyvavu_preview_theme=; Path=/; SameSite=Lax; Max-Age=0`,
          )
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
        const { template, document, themeId } = body || {}
        if (!template || !document) {
          return Response.json({ success: false, message: 'Template and document are required' }, { status: 400 })
        }
        const res = await saveThemeTemplateOverride(req.payload, template, document, req.user, themeId)
        return Response.json(res, { status: res.success ? 200 : 400 })
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
          return Response.json({ success: false, message: 'type and preset are required' }, { status: 400 })
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
