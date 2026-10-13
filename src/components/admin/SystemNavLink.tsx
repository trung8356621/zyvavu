'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { isSystemAdmin } from '@/access/roles'

export function SystemNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  if (!isSystemAdmin(user)) return null
  const active = pathname === '/admin/system'
  return (
    <Link className={`nav__link zyvavu-system-link${active ? ' active' : ''}`} href="/admin/system" prefetch={false}>
      {active ? <span className="nav__link-indicator" /> : null}
      <span className="nav__link-label">System</span>
    </Link>
  )
}
