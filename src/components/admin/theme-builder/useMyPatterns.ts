'use client'
import { useEffect, useState } from 'react'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'
export type MyPatternDocument = {
  id: string | number
  name: string
  description?: string
  category: string
  record: PatternJSON
  contentHash: string
  thumbnailHash?: string
  thumbnailStatus?: string
  url?: string | null
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = await response.json()
  if (!response.ok)
    throw new Error(
      body.errors?.[0]?.message || body.message || `Request failed (${response.status})`,
    )
  return body
}
export function useMyPatterns(search: string, enabled: boolean) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({
    query: '',
    revision: -1,
    docs: [] as MyPatternDocument[],
    page: 1,
    totalPages: 1,
    error: '',
  })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const params = new URLSearchParams({
      limit: '50',
      depth: '0',
      sort: '-updatedAt',
      'where[name][like]': search,
    })
    request<{ docs: MyPatternDocument[]; totalPages: number }>(`/api/widget-patterns?${params}`, {
      signal: controller.signal,
    })
      .then((result) =>
        setState({
          query: search,
          revision,
          docs: result.docs,
          page: 1,
          totalPages: result.totalPages,
          error: '',
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            query: search,
            revision,
            docs: [],
            page: 1,
            totalPages: 1,
            error: error.message,
          })
      })
    return () => controller.abort()
  }, [search, revision, enabled])
  const upsert = (doc: MyPatternDocument) =>
    setState((previous) => ({
      ...previous,
      docs: [doc, ...previous.docs.filter((item) => item.id !== doc.id)],
    }))
  const save = async (record: PatternJSON, id?: string | number) => {
    const result = await request<{ doc: MyPatternDocument }>(
      `/api/widget-patterns${id !== undefined ? `/${id}` : ''}`,
      {
        method: id !== undefined ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: record.name,
          description: record.description,
          category: record.category,
          record,
        }),
      },
    )
    upsert(result.doc)
    setRevision((value) => value + 1)
    return result.doc
  }
  const thumbnail = async (doc: MyPatternDocument) => {
    try {
      const result = await request<{ doc: MyPatternDocument }>(
        `/api/widget-patterns/${doc.id}/thumbnail`,
        { method: 'POST' },
      )
      upsert(result.doc)
      setRevision((value) => value + 1)
      return true
    } catch {
      upsert({ ...doc, thumbnailStatus: 'failed', url: null })
      setRevision((value) => value + 1)
      return false
    }
  }
  const remove = async (id: string | number) => {
    await request(`/api/widget-patterns/${id}`, { method: 'DELETE' })
    setState((previous) => ({ ...previous, docs: previous.docs.filter((doc) => doc.id !== id) }))
    setRevision((value) => value + 1)
  }
  const loadMore = async () => {
    const params = new URLSearchParams({
      limit: '50',
      depth: '0',
      sort: '-updatedAt',
      page: String(state.page + 1),
      'where[name][like]': search,
    })
    const result = await request<{ docs: MyPatternDocument[]; page: number; totalPages: number }>(
      `/api/widget-patterns?${params}`,
    )
    setState((previous) => ({
      ...previous,
      docs: [...previous.docs, ...result.docs],
      page: result.page,
      totalPages: result.totalPages,
    }))
  }
  return {
    ...state,
    loading: enabled && (state.query !== search || state.revision !== revision),
    reload: () => setRevision((value) => value + 1),
    save,
    thumbnail,
    remove,
    loadMore,
  }
}
