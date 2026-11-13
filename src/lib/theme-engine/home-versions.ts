/** Thin Home wrappers over shared Template Versions. */
import type { Payload, PayloadRequest } from 'payload'
import type { ThemeTemplateDocument } from './types'
import {
  allocateTemplateVersionId,
  createTemplateVersion,
  listTemplateVersions,
  resolvePrimaryTemplateDocument,
  resolveTemplateVersion,
  saveTemplateVersion,
  setPrimaryTemplateVersion,
} from './template-versions'
import type { HomeVersionIndex, HomeVersionMeta } from './home-versions-types'

export type { HomeVersionIndex, HomeVersionMeta } from './home-versions-types'
export {
  LEGACY_HOME_VERSION_ID,
  homeVersionDocKey,
  homeVersionIndexKey,
  legacyHomeDocKey,
} from './home-versions-types'

type Req = Partial<PayloadRequest> | undefined

export const allocateHomeVersionId = allocateTemplateVersionId

export async function listHomeVersions(payload: Payload, themeId?: string) {
  return listTemplateVersions(payload, 'home', themeId)
}

export async function resolveHomeVersion(
  payload: Payload,
  versionId: string,
  themeId?: string,
  req?: Req,
) {
  return resolveTemplateVersion(payload, 'home', versionId, themeId, req)
}

export async function resolvePrimaryHomeDocument(
  payload: Payload,
  themeId: string,
  store?: Record<string, unknown>,
) {
  return resolvePrimaryTemplateDocument(payload, 'home', themeId, store)
}

export async function saveHomeVersion(
  payload: Payload,
  versionId: string,
  document: ThemeTemplateDocument,
  themeId?: string,
  req?: Req,
) {
  return saveTemplateVersion(payload, 'home', versionId, document, themeId, req)
}

export async function createHomeVersion(
  payload: Payload,
  args: {
    themeId?: string
    name?: string
    document: ThemeTemplateDocument
    sourceVersionId?: string
  },
  req?: Req,
): Promise<
  | { success: true; meta: HomeVersionMeta; document: ThemeTemplateDocument }
  | { success: false; errors: string[] }
> {
  return createTemplateVersion(payload, { ...args, context: 'home' }, req)
}

export async function setPrimaryHomeVersion(
  payload: Payload,
  versionId: string,
  themeId?: string,
  req?: Req,
): Promise<{ success: boolean; errors?: string[]; index?: HomeVersionIndex }> {
  return setPrimaryTemplateVersion(payload, 'home', versionId, themeId, req)
}
