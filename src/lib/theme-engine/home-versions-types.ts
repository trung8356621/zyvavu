/** @deprecated Prefer template-versions-types. Kept for Home Versions rollout compatibility. */
export {
  LEGACY_TEMPLATE_VERSION_ID as LEGACY_HOME_VERSION_ID,
  type TemplateVersionMeta as HomeVersionMeta,
  type TemplateVersionIndex as HomeVersionIndex,
} from './template-versions-types'

import { templateVersionDocKey, templateVersionIndexKey, legacyTemplateDocKey } from './template-versions-types'

export function homeVersionIndexKey(themeId: string) {
  return templateVersionIndexKey(themeId, 'home')
}

export function homeVersionDocKey(themeId: string, versionId: string) {
  return templateVersionDocKey(themeId, 'home', versionId)
}

export function legacyHomeDocKey(themeId: string) {
  return legacyTemplateDocKey(themeId, 'home')
}
