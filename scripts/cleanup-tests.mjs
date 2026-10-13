import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

await payload.delete({
  collection: 'pages',
  where: { slug: { like: 'offline-' } },
  overrideAccess: true,
})
await payload.delete({
  collection: 'posts',
  where: { slug: { like: 'offline-' } },
  overrideAccess: true,
})
await payload.delete({
  collection: 'menus',
  where: { name: { like: 'menu-' } },
  overrideAccess: true,
})
await payload.delete({
  collection: 'users',
  where: { email: { like: 'foundation-' } },
  overrideAccess: true,
})

const page = await payload.update({
  collection: 'pages',
  where: { slug: { equals: 'gioi-thieu' } },
  overrideAccess: true,
  draft: false,
  data: {
    excerpt: 'Trang thử nghiệm đã được sửa và xuất bản.',
    _status: 'published',
  },
})
console.log(`UPDATED ${page.docs?.length ?? 0}`)
process.exit(0)
