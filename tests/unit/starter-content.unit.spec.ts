// @vitest-environment node
import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { seedStarterContent, starterDefinitions } from '@/lib/installation/starter-content'

function fixture() {
  const docs: Record<string, { id: number; slug: string }[]> = {}
  const find = vi.fn(async ({ collection, where }) => ({ docs: (docs[collection] || []).filter(doc => doc.slug === where.slug.equals) }))
  const create = vi.fn(async ({ collection, data }) => {
    const doc = { id: create.mock.calls.length, ...data }
    ;(docs[collection] ||= []).push(doc)
    return doc
  })
  const payload = { find, create } as unknown as Payload
  const req = { transactionID: 'isolated-mock', payload } as PayloadRequest
  return { payload, req, find, create, docs }
}

describe('starter content', () => {
  it.each(['vi', 'en'])('creates eight items, valid blocks and relationships for %s', async language => {
    const f = fixture()
    expect(await seedStarterContent(f.payload, f.req, language, true)).toHaveLength(8)
    expect(f.create).toHaveBeenCalledTimes(8)
    const calls = f.create.mock.calls.map(([args]) => args)
    expect(calls.every(args => args.req === f.req)).toBe(true)
    expect(calls[2].data).toMatchObject({ _status: 'published', categories: [1], tags: [2] })
    expect(calls[3].data).toMatchObject({ slug: 'about', _status: 'published', visibility: 'public' })
    expect(calls.slice(4).every(args => args.data._status === 'draft')).toBe(true)
    expect(calls.some(args => args.data.slug === 'home')).toBe(false)
    expect(calls[3].data.layout[0]).toMatchObject({ blockType: 'richText', content: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text' }] }] } } })
    expect((await seedStarterContent(f.payload, f.req, language, true)).every(item => item.status === 'skipped')).toBe(true)
    expect(f.create).toHaveBeenCalledTimes(8)
  })
  it('dry run only reads and reports planned items', async () => {
    const f = fixture()
    expect((await seedStarterContent(f.payload, f.req, 'vi')).every(item => item.status === 'would-create')).toBe(true)
    expect(f.create).not.toHaveBeenCalled()
  })
  it('preserves existing edited records and reports duplicate slug conflicts', async () => {
    const f = fixture()
    f.docs.pages = [{ id: 90, slug: 'about' }, { id: 91, slug: 'about' }]
    expect(await seedStarterContent(f.payload, f.req, 'en')).toContainEqual({ collection: 'pages', slug: 'about', status: 'conflicting' })
    expect(f.create).not.toHaveBeenCalled()
    await expect(seedStarterContent(f.payload, f.req, 'en', true)).rejects.toThrow('Conflicting starter slug')
  })
  it('refuses writes without the caller transaction', async () => {
    const f = fixture()
    await expect(seedStarterContent(f.payload, {} as PayloadRequest, 'en', true)).rejects.toThrow('requires a transaction')
    expect(f.find).not.toHaveBeenCalled()
  })
  it('selects language without changing stable slugs', () => {
    expect(starterDefinitions('vi-VN').category.title).toBe('Tin tức')
    expect(starterDefinitions('en').category.title).toBe('News')
    expect(starterDefinitions('en').category.slug).toBe('tin-tuc')
  })
})
