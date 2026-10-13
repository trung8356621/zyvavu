import { getPayload } from 'payload'
import React from 'react'

import config from '@payload-config'
import { isSystemAdmin } from '@/access/roles'

type SystemViewProps = {
  initPageResult?: {
    req?: {
      user?: unknown
    }
  }
}

export async function SystemView(props: SystemViewProps) {
  const user = props.initPageResult?.req?.user
  if (!isSystemAdmin(user)) {
    return <p>Forbidden. /admin/system is limited to system-admin.</p>
  }

  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({
    slug: 'system-settings',
    overrideAccess: false,
    user: user as never,
  })

  return (
    <section>
      <h1>System</h1>
      <p>Maintenance note: {settings.maintenanceNote || '—'}</p>
    </section>
  )
}
