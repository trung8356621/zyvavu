import { cache } from 'react'
import { redirect } from 'next/navigation'
import { installationStatus } from './status'

// Layouts, pages and metadata can execute concurrently; each entry uses the same gate.
// Imports happen after the gate, so not-found/metadata rendering cannot initialize an unconfigured Payload.
export const getInstalledPayload = cache(async () => {
  const status = await installationStatus()
  if (status === 'DATABASE_UNAVAILABLE') redirect('/maintenance')
  if (status !== 'INSTALLED') redirect('/setup')
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@/payload.config')])
  try { return await getPayload({ config }) }
  catch (error) {
    // Handle an outage between the state check and Payload connecting; keep unrelated failures visible.
    if (error instanceof Error && /cannot connect to Postgres/i.test(error.message)) redirect('/maintenance')
    throw error
  }
})
