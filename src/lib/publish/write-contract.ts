import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook, PayloadRequest } from 'payload'

/**
 * Write contract for Page and Post updates, including future external API calls.
 *
 * - `draft: true` saves a version only. The published row, public URL, and redirect history stay as they are.
 * - `_status: "published"` publishes. Omitted fields are taken from the latest version, which may be an unpublished draft.
 * - `_status: "draft"` unpublishes. The canonical public URL is removed and redirect history is kept.
 * - `visibility: "private"` on a page removes the public URL without changing `_status`.
 * - A partial update that omits `_status` and does not set `draft: true` changes only the submitted fields on the
 *   published row. It does not unpublish and does not copy unpublished draft fields onto live content.
 *   Payload then stores that published row as the latest version. The previous draft remains in version history.
 */

type PublishWriteIntent = {
  draft: boolean
  statusProvided: boolean
  submittedKeys: string[]
}

const contextKey = 'zyvavuPublishWrite'

export const capturePublishWrite: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'update' || !args || typeof args !== 'object') return args
  const data = 'data' in args ? args.data : undefined
  if (!data || typeof data !== 'object' || Array.isArray(data)) return args
  const request = req as PayloadRequest
  request.context[contextKey] = {
    draft: Boolean('draft' in args && args.draft),
    statusProvided: Object.prototype.hasOwnProperty.call(data, '_status'),
    submittedKeys: Object.keys(data),
  } satisfies PublishWriteIntent
  return args
}

export const preservePublishedPartialUpdate: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !data) return data
  const intent = req.context[contextKey] as PublishWriteIntent | undefined
  if (!intent || intent.draft || intent.statusProvided) return data
  if (!originalDoc || originalDoc._status !== 'draft' || typeof originalDoc.id !== 'number') return data

  const published = (await req.payload.findByID({
    collection: collection.slug as 'pages',
    id: originalDoc.id,
    depth: 0,
    draft: false,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as ({ _status?: string | null } & Record<string, unknown>) | null
  if (!published || published._status !== 'published') return data

  const submitted = new Set(intent.submittedKeys)
  const next: Record<string, unknown> = { ...data }
  for (const key of Object.keys(next)) {
    if (submitted.has(key)) continue
    if (Object.prototype.hasOwnProperty.call(published, key)) next[key] = published[key]
  }
  return next
}
