'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { suppressToolbar, type ToolbarData } from '@/lib/frontend-toolbar/model'

// Mantine and toolbar styles load only after server authorization, never into public HTML.
const Toolbar = dynamic(() => import('./Toolbar'), { ssr: false })

export function FrontendAdminToolbar() {
  const path = usePathname()
  const search = useSearchParams().toString()
  const [data, setData] = useState<ToolbarData | null>(null)

  useEffect(() => {
    if (suppressToolbar(path, search, window.parent !== window)) return
    let active = true
    let controller: AbortController | undefined
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch(`/api/frontend-admin-toolbar?path=${encodeURIComponent(path)}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        })
        const result = response.ok ? await response.json() : { toolbar: null }
        if (active) setData(result.toolbar)
      } catch (error) {
        if (active && !(error instanceof Error && error.name === 'AbortError')) setData(null)
      }
    }
    void refresh()
    const timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 60_000)
    const onFocus = () => { void refresh() }
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) void refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [path, search])

  if (!data || data.path !== path || suppressToolbar(path, search)) return null
  return <Toolbar key={path} data={data} onLogout={() => setData(null)} />
}
