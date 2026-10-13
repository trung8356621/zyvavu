import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const payload = await getPayload({ config })
const slug = 'gioi-thieu'

const existing = await payload.find({
  collection: 'pages',
  where: { slug: { equals: slug } },
  overrideAccess: true,
  draft: true,
  limit: 1,
})

const page = existing.docs[0]
  ? await payload.update({
      collection: 'pages',
      id: existing.docs[0].id,
      overrideAccess: true,
      draft: false,
      data: {
        title: 'Giới thiệu',
        slug,
        excerpt: 'Trang thử nghiệm đã xuất bản.',
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
  : await payload.create({
      collection: 'pages',
      overrideAccess: true,
      draft: false,
      data: {
        title: 'Giới thiệu',
        slug,
        excerpt: 'Trang thử nghiệm đã xuất bản.',
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })

const post = await payload.find({
  collection: 'posts',
  where: { slug: { equals: 'bai-khong-prefetch' } },
  overrideAccess: true,
  draft: true,
  limit: 1,
})
if (!post.docs[0]) {
  await payload.create({
    collection: 'posts',
    overrideAccess: true,
    draft: false,
    data: {
      title: 'Bài không prefetch',
      slug: 'bai-khong-prefetch',
      excerpt: 'Post này không được đưa vào offline manifest.',
      _status: 'published',
    },
  })
}

const menus = await payload.find({
  collection: 'menus',
  where: { name: { equals: 'Header' } },
  overrideAccess: true,
  limit: 1,
})
const items = [{ label: 'Giới thiệu', link: { type: 'page', page: page.id } }]
if (menus.docs[0]) {
  await payload.update({
    collection: 'menus',
    id: menus.docs[0].id,
    overrideAccess: true,
    data: { name: 'Header', location: 'header', items },
  })
} else {
  await payload.create({
    collection: 'menus',
    overrideAccess: true,
    data: { name: 'Header', location: 'header', items },
  })
}

const manifest = await fetch('http://127.0.0.1:3107/api/offline-manifest').catch(() => null)
console.log(`PAGE ${page.id} ${page.slug} ${page._status}`)
console.log(manifest ? `MANIFEST_HTTP ${manifest.status}` : 'MANIFEST_SERVER_DOWN')
process.exit(0)
