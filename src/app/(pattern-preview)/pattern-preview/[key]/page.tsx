import React from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSiteStaff } from '@/access/roles'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import { patternContentHash, verifyCaptureTicket } from '@/lib/theme-engine/patterns/server'
import { validatePatternJSON, type PatternJSON } from '@/lib/theme-engine/patterns/json'
import { PatternDocumentPreview } from '@/lib/theme-engine/patterns/preview'
import { resolveActiveThemeConfig } from '@/lib/theme-engine/styles'
import { isValidThemeId } from '@/lib/theme-engine/themes'
export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Pattern Preview' }
export default async function PatternPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ theme?: string }>
}) {
  const { key } = await params
  const { theme } = await searchParams
  const requestHeaders = await headers()
  const ticket = verifyCaptureTicket(
    requestHeaders.get('x-pattern-capture'),
    process.env.PAYLOAD_SECRET || '',
  )
  if (ticket && (ticket.key !== key || ticket.themeId !== theme)) notFound()
  const payload = await getPayload({ config })
  const { user } = ticket ? { user: null } : await payload.auth({ headers: requestHeaders })
  if (!ticket && !isSiteStaff(user)) notFound()
  let record: PatternJSON | undefined
  if (key.startsWith('user-')) {
    try {
      const doc = await payload.findByID({
        collection: 'widget-patterns',
        id: key.slice(5),
        overrideAccess: !!ticket,
        user: user || undefined,
        depth: 0,
      })
      if (
        ticket &&
        (String(typeof doc.owner === 'object' ? doc.owner.id : doc.owner) !== ticket.owner ||
          doc.contentHash !== ticket.hash)
      )
        notFound()
      record = doc.record as PatternJSON
    } catch {
      notFound()
    }
  } else record = SYSTEM_PATTERNS.find((pattern) => pattern.id === key)
  if (!record || (ticket && patternContentHash(record) !== ticket.hash)) notFound()
  validatePatternJSON(record)
  if (theme && !isValidThemeId(theme)) notFound()
  const themeConfig = await resolveActiveThemeConfig(payload, theme)
  return <PatternDocumentPreview pattern={record} themeConfig={themeConfig} />
}
