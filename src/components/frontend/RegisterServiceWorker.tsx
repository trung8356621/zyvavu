'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!enabled) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister()
      }).catch(() => undefined)
      return
    }
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
  }, [enabled])
  return null
}
