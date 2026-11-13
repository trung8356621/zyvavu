import type { BuilderScope } from '@/lib/theme-engine/builder-navigation'
import type { TemplateContext } from '@/lib/theme-engine/types'

export const ASSESSMENT_SCHEMA_VERSION = 1 as const

export type CapabilityStatus = 'SUPPORTED' | 'COMPOSABLE' | 'MISSING' | 'UNSUPPORTED'
export type RequirementPriority = 'required' | 'optional'
export type OwnerDecision = 'REUSE' | 'BUILD' | 'DEFER' | 'REJECT'
export type OverallReadiness = 'READY' | 'READY_WITH_DEFERRED' | 'BLOCKED'

export type RequirementInput = {
  template?: TemplateContext
  id: string
  description: string
  intent?: string
  priority?: RequirementPriority
  capabilityHints?: string[]
}

export type RequirementAssessment = {
  template?: TemplateContext
  id: string
  description: string
  intent: string | null
  status: CapabilityStatus
  existingCapabilities: string[]
  proposedSolution: string
  missingDependencies: string[]
  reason: string
  priority: RequirementPriority
  /** Owner decision is stored separately from detection; null until resolved. */
  decision: OwnerDecision | null
  evidence: 'verified' | 'inferred'
}

export type CapabilityAssessment = {
  scope?: BuilderScope
  schemaVersion: typeof ASSESSMENT_SCHEMA_VERSION
  assessmentId: string
  themeRequest: string
  capabilitySnapshotId: string
  requirements: RequirementAssessment[]
  overallReadiness: OverallReadiness
  unresolvedRequirements: string[]
  decisions: { requirementId: string; decision: OwnerDecision; note?: string }[]
}

export type DecisionInput = {
  requirementId: string
  decision: OwnerDecision
  note?: string
}

