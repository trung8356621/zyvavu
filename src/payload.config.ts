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
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const httpOrigin = 'http://zyvavu.test'
const httpsOrigin = 'https://zyvavu.test'
const publicOrigin = process.env.NEXT_PUBLIC_SERVER_URL || httpOrigin
const allowedOrigins = [httpOrigin, httpsOrigin]

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '— zyvavu',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeNavLinks: ['@/components/admin/SystemNavLink#SystemNavLink'],
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
  collections: [Users, Media, Pages, Posts, Categories, Tags, Menus, UrlRegistry],
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
