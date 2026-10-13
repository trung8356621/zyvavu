'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

import { isSystemAdmin } from '@/access/roles'

export function SystemNavLink() {
  const { user } = useAuth()
  if (!isSystemAdmin(user)) return null
  return (
    <Link href="/admin/system" style={{ display: 'block', padding: '0.5rem 1rem' }}>
      System
    </Link>
  )
}
