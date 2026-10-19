import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { Access, CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'
import { isSiteStaff } from '@/access/roles'
import { validatePatternJSON, type PatternJSON } from './json'
export const ownedPatternAccess: Access = ({ req }) =>
  isSiteStaff(req.user) ? { owner: { equals: req.user!.id } } : false
export function patternContentHash(record: PatternJSON) {
  return createHash('sha256')
    .update(JSON.stringify({ payload: record.payload, theme: record.theme }))
    .digest('hex')
}
export const guardPatternWrite: CollectionBeforeValidateHook = ({
  data: incoming,
  originalDoc,
  req,
  operation,
}) => {
  const data = incoming || {}
  if (!isSiteStaff(req.user)) throw new APIError('Forbidden', 403)
  if (
    operation === 'update' &&
    String(typeof originalDoc.owner === 'object' ? originalDoc.owner.id : originalDoc.owner) !==
      String(req.user!.id)
  )
    throw new APIError('Forbidden', 403)
  if (data.source && data.source !== 'user')
    throw new APIError('System and theme patterns are immutable', 403)
  if (
    data.owner !== undefined &&
    String(typeof data.owner === 'object' ? data.owner.id : data.owner) !== String(req.user!.id)
  )
    throw new APIError('Pattern ownership cannot be transferred', 403)
  if (
    req.context.expectedPatternHash &&
    originalDoc?.contentHash !== req.context.expectedPatternHash
  )
    throw new APIError('Pattern changed during thumbnail capture', 409)
  const input = data.record || originalDoc?.record
  validatePatternJSON(input)
  const record: PatternJSON = {
    ...input,
    id: originalDoc?.record?.id || input.id,
    source: 'user',
    name: data.name ?? input.name,
    description: data.description ?? input.description,
    category: data.category ?? input.category,
  }
  delete record.thumbnail
  validatePatternJSON(record)
  const hash = patternContentHash(record)
  record.version = originalDoc
    ? (originalDoc.record?.version || 1) + (hash !== originalDoc.contentHash ? 1 : 0)
    : 1
  const output: Record<string, unknown> = {
    ...data,
    name: record.name,
    description: record.description,
    category: record.category,
    source: 'user',
    owner: req.user!.id,
    record,
    contentHash: hash,
  }
  if (hash !== originalDoc?.contentHash) {
    output.thumbnailStatus = 'pending'
    output.thumbnailHash = null
  }
  return output
}
export type CaptureTicket = {
  key: string
  hash: string
  owner?: string
  themeId: string
  expires: number
}
export function signCaptureTicket(ticket: CaptureTicket, secret: string) {
  if (!secret) throw new Error('Capture requires an application secret')
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
}
export function verifyCaptureTicket(token: string | null, secret: string): CaptureTicket | null {
  if (!token || !secret || token.length > 2048) return null
  try {
    const [body, signature] = token.split('.')
    const expected = createHmac('sha256', secret).update(body).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
    const ticket = JSON.parse(Buffer.from(body, 'base64url').toString()) as CaptureTicket
    if (
      typeof ticket.expires !== 'number' ||
      !Number.isFinite(ticket.expires) ||
      ticket.expires < Date.now() ||
      ticket.expires > Date.now() + 120000 ||
      typeof ticket.key !== 'string' ||
      !/^[a-z0-9-]+$/i.test(ticket.key) ||
      typeof ticket.hash !== 'string' ||
      typeof ticket.themeId !== 'string'
    )
      return null
    return ticket
  } catch {
    return null
  }
}
