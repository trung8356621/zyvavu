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
const allowedOrigins = Array.from(new Set([LOCAL_HTTP_ORIGIN, LOCAL_HTTPS_ORIGIN, publicOrigin]))

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'light',
    meta: {
      titleSuffix: '— Zyvavu',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Logo#Icon',
      },
      afterNavLinks: ['@/components/admin/SystemNavLink#SystemNavLink'],
      views: {
        system: {
          Component: '@/components/admin/SystemView#SystemView',
          path: '/system',
          exact: true,
          meta: { title: 'System' },
        },
      },
    },
  },
  collections: [Posts, Pages, Media, Categories, Tags, Menus, Users, UrlRegistry],
  globals: [Settings, SystemSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: publicOrigin,
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
  ],
  plugins: [],
})
