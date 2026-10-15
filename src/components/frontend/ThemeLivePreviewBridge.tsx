'use client'

import { useEffect } from 'react'

/**
 * Lightweight client bridge for Theme Style Customizer live preview.
 * Strictly verifies same-origin messages and updates theme style tags in place.
 * Adds zero runtime overhead on standard page views.
 */
export function ThemeLivePreviewBridge() {
  useEffect(() => {
    // Only activate if we are framed inside the Zyvavu Admin Customizer
    if (typeof window === 'undefined' || window.parent === window) {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin strictly
      if (event.origin !== window.location.origin) {
        return
      }

      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'ZYVAVU_THEME_STYLE_PREVIEW') {
        // 1. Update live CSS variables and theme styles
        if (typeof data.css === 'string') {
          let styleEl = document.getElementById('zyvavu-theme-styles') as HTMLStyleElement | null
          if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'zyvavu-theme-styles'
            document.head.appendChild(styleEl)
          }
          styleEl.textContent = data.css
        }

        // 2. Update dynamic Google Font stylesheet link if provided
        if (typeof data.fontUrl === 'string') {
          let linkEl = document.getElementById('zyvavu-theme-font-link') as HTMLLinkElement | null
          if (!linkEl) {
            linkEl = document.createElement('link')
            linkEl.id = 'zyvavu-theme-font-link'
            linkEl.rel = 'stylesheet'
            document.head.appendChild(linkEl)
          }
          if (linkEl.href !== data.fontUrl) {
            linkEl.href = data.fontUrl
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)

    // Notify parent customizer that iframe is ready to receive styles
    try {
      window.parent.postMessage({ type: 'ZYVAVU_PREVIEW_READY' }, window.location.origin)
    } catch {
      // safe ignore
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
