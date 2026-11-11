/**
 * Idempotent sample category tree (max 3 levels) for local preview.
 * Usage: node --import tsx scripts/seed-sample-categories.mjs
 */
import { config } from 'dotenv'
import { getPayload } from 'payload'

config({ path: '.env.local' })

const configPromise = (await import('../src/payload.config.ts')).default
const payload = await getPayload({ config: configPromise })

/** @type {Array<{ title: string, slug: string, children?: any[] }>} */
const TREE = [
  {
    title: 'Công nghệ',
    slug: 'cong-nghe',
    children: [
      {
        title: 'Lập trình',
        slug: 'lap-trinh',
        children: [
          { title: 'JavaScript', slug: 'javascript' },
          { title: 'TypeScript', slug: 'typescript' },
          { title: 'Python', slug: 'python' },
        ],
      },
      {
        title: 'DevOps',
        slug: 'devops',
        children: [
          { title: 'Docker', slug: 'docker' },
          { title: 'CI/CD', slug: 'ci-cd' },
        ],
      },
      { title: 'AI & Machine Learning', slug: 'ai-ml' },
    ],
  },
  {
    title: 'Kinh doanh',
    slug: 'kinh-doanh',
    children: [
      {
        title: 'Marketing',
        slug: 'marketing',
        children: [
          { title: 'SEO', slug: 'seo' },
          { title: 'Content Marketing', slug: 'content-marketing' },
        ],
      },
      {
        title: 'Bán hàng',
        slug: 'ban-hang',
        children: [{ title: 'CRM', slug: 'crm' }],
      },
    ],
  },
  {
    title: 'Đời sống',
    slug: 'doi-song',
    children: [
      {
        title: 'Sức khỏe',
        slug: 'suc-khoe',
        children: [
          { title: 'Dinh dưỡng', slug: 'dinh-duong' },
          { title: 'Thể thao', slug: 'the-thao' },
        ],
      },
      { title: 'Du lịch', slug: 'du-lich' },
    ],
  },
]

async function upsertCategory({ title, slug, parentId = null }) {
  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = { title, slug, parent: parentId }
  // disableTransaction: category must be visible before url-registry FK insert in afterChange.
  if (existing.docs[0]) {
    const doc = await payload.update({
      collection: 'categories',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
      disableTransaction: true,
    })
    console.log(`updated: ${slug} (#${doc.id})${parentId ? ` parent=#${parentId}` : ''}`)
    return doc
  }
  const doc = await payload.create({
    collection: 'categories',
    data,
    overrideAccess: true,
    disableTransaction: true,
  })
  console.log(`created: ${slug} (#${doc.id})${parentId ? ` parent=#${parentId}` : ''}`)
  return doc
}

async function walk(nodes, parentId = null, depth = 1) {
  for (const node of nodes) {
    if (depth > 3) throw new Error(`Category depth exceeds 3 at ${node.slug}`)
    const doc = await upsertCategory({
      title: node.title,
      slug: node.slug,
      parentId,
    })
    if (node.children?.length) await walk(node.children, doc.id, depth + 1)
  }
}

await walk(TREE)
const total = await payload.find({
  collection: 'categories',
  limit: 1,
  overrideAccess: true,
})
console.log(`done. total categories: ${total.totalDocs}`)
process.exit(0)
