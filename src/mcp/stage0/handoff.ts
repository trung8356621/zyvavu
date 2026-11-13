import { checkShape, fields, list, options, string, type Issue } from '../shape'
import { ToolError } from '../tool-contract'
import { builderScopeShape, validateCapabilityAssessment } from './assess'
import { ASSESSMENT_SCHEMA_VERSION, type CapabilityAssessment, type OverallReadiness } from './types'
import { buildCapabilitySnapshot } from './snapshot'

const handoffShape = fields({
  schemaVersion: options(ASSESSMENT_SCHEMA_VERSION),
  assessmentId: string,
  themeRequest: string,
  scope: builderScopeShape,
  capabilitySnapshotId: string,
  requirements: list({ type: 'object' }),
  overallReadiness: options('READY', 'READY_WITH_DEFERRED', 'BLOCKED'),
  unresolvedRequirements: list(string),
  decisions: list({ type: 'object' }),
}, ['schemaVersion', 'assessmentId', 'themeRequest', 'capabilitySnapshotId', 'requirements', 'overallReadiness', 'unresolvedRequirements', 'decisions'])

export type Stage0Handoff = {
  assessmentId: string
  schemaVersion: number
  capabilitySnapshotId: string
  overallReadiness: Exclude<OverallReadiness, 'BLOCKED'>
  snapshotMatchesCurrent: boolean
}

/**
 * Stage 0 handoff is a validated assessment payload — not a DB record.
 * Clients pass the approved assessment; MCP re-verifies readiness deterministically.
 */
export function assertStage0Handoff(assessment: unknown, options?: {
  requireCurrentSnapshot?: boolean
}): Stage0Handoff {
  const issues: Issue[] = []
  checkShape(assessment, handoffShape, '$.stage0Assessment', issues)
  if (issues.length) {
    throw new ToolError('INVALID_ARGUMENTS', 'Stage 0 assessment handoff is invalid.', issues)
  }
  const doc = assessment as CapabilityAssessment
  const consistency = validateCapabilityAssessment({ assessment: doc })
  if (!consistency.valid) {
    throw new ToolError('INVALID_ARGUMENTS', 'Stage 0 assessment readiness is inconsistent.', consistency.errors)
  }
  if (doc.overallReadiness === 'BLOCKED') {
    throw new ToolError('ACCESS_DENIED', 'Stage 0 readiness is BLOCKED; Theme Customize cannot advance.')
  }
  const current = buildCapabilitySnapshot()
  const snapshotMatchesCurrent = doc.capabilitySnapshotId === current.capabilitySnapshotId
  if (options?.requireCurrentSnapshot && !snapshotMatchesCurrent) {
    throw new ToolError(
      'INVALID_ARGUMENTS',
      'Stage 0 capability snapshot is stale relative to the current registries. Re-run assessment.',
    )
  }
  // Stale snapshots are allowed only when the client explicitly accepts them by not requiring current.
  // Theme Customize writes default to requiring a current snapshot.
  return {
    assessmentId: doc.assessmentId,
    schemaVersion: doc.schemaVersion,
    capabilitySnapshotId: doc.capabilitySnapshotId,
    overallReadiness: doc.overallReadiness,
    snapshotMatchesCurrent,
  }
}
