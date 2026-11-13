import { createHash } from 'node:crypto'
import { checkShape, fields, list, options, string, type Issue } from '../shape'
import { contextShape, ToolError } from '../tool-contract'
import type { BuilderScope } from '@/lib/theme-engine/builder-navigation'
import { classifyByIntent, listKnownIntents } from './intents'
import { buildCapabilitySnapshot, type CapabilitySnapshot } from './snapshot'
import {
  ASSESSMENT_SCHEMA_VERSION,
  type CapabilityAssessment,
  type CapabilityStatus,
  type DecisionInput,
  type OwnerDecision,
  type OverallReadiness,
  type RequirementAssessment,
  type RequirementInput,
  type RequirementPriority,
} from './types'
import { renderCapabilityAssessmentMarkdown } from './report'

const idPattern = /^[a-z][a-z0-9-]{1,63}$/
const statuses = ['SUPPORTED', 'COMPOSABLE', 'MISSING', 'UNSUPPORTED'] as const
const priorities = ['required', 'optional'] as const
const decisions = ['REUSE', 'BUILD', 'DEFER', 'REJECT'] as const
const readinessValues = ['READY', 'READY_WITH_DEFERRED', 'BLOCKED'] as const
export const builderScopeShape = fields({
  mode: options('full', 'single'),
  themeId: string,
  template: contextShape,
  loopItemId: string,
}, ['mode', 'themeId'])

export const requirementInputShape = fields({
  id: string,
  description: string,
  intent: string,
  priority: options(...priorities),
  capabilityHints: list(string),
  template: contextShape,
}, ['id', 'description'])

const decisionInputShape = fields({
  requirementId: string,
  decision: options(...decisions),
  note: string,
}, ['requirementId', 'decision'])

// Intent is string|null; validated in parseAssessment after structural checks.
const assessmentShape = fields({
  schemaVersion: options(ASSESSMENT_SCHEMA_VERSION),
  assessmentId: string,
  themeRequest: string,
  scope: builderScopeShape,
  capabilitySnapshotId: string,
  requirements: list(fields({
    id: string,
    description: string,
    template: contextShape,
    intent: {},
    status: options(...statuses),
    existingCapabilities: list(string),
    proposedSolution: string,
    missingDependencies: list(string),
    reason: string,
    priority: options(...priorities),
    decision: options(null, ...decisions),
    evidence: options('verified', 'inferred'),
  }, ['id', 'description', 'intent', 'status', 'existingCapabilities', 'proposedSolution', 'missingDependencies', 'reason', 'priority', 'decision', 'evidence'])),
  overallReadiness: options(...readinessValues),
  unresolvedRequirements: list(string),
  decisions: list(fields({
    requirementId: string,
    decision: options(...decisions),
    note: string,
  }, ['requirementId', 'decision'])),
}, ['schemaVersion', 'assessmentId', 'themeRequest', 'capabilitySnapshotId', 'requirements', 'overallReadiness', 'unresolvedRequirements', 'decisions'])

function assertIssues(issues: Issue[], message: string) {
  if (issues.length) throw new ToolError('INVALID_ARGUMENTS', message, issues)
}

function normalizePriority(value: unknown): RequirementPriority {
  return value === 'optional' ? 'optional' : 'required'
}

function classifyFromHints(hints: string[], snapshot: CapabilitySnapshot) {
  const existing: string[] = []
  const missing: string[] = []
  for (const hint of hints) {
    if (hint.startsWith('widget:')) {
      const type = hint.slice('widget:'.length)
      if (snapshot.widgets.some((widget) => widget.type === type)) existing.push(hint)
      else missing.push(hint)
      continue
    }
    if (hint.startsWith('atom:')) {
      const type = hint.slice('atom:'.length)
      if (snapshot.atoms.includes(type as typeof snapshot.atoms[number])) existing.push(hint)
      else missing.push(hint)
      continue
    }
    if (hint.startsWith('context:')) {
      const context = hint.slice('context:'.length)
      if (snapshot.contexts.some((entry) => entry.context === context)) existing.push(hint)
      else missing.push(hint)
      continue
    }
    if (hint.startsWith('data:')) {
      const source = hint.slice('data:'.length) as keyof typeof snapshot.dataSources
      const entry = snapshot.dataSources[source]
      if (!entry) missing.push(hint)
      else if (entry.status === 'SUPPORTED') existing.push(hint)
      else missing.push(hint)
      continue
    }
    if (hint.startsWith('binding:')) {
      if (snapshot.bindings.itemContext || snapshot.bindings.documentContext) existing.push(hint)
      else missing.push(hint)
      continue
    }
    missing.push(hint)
  }
  if (!hints.length) return null
  if (missing.some((hint) => hint.startsWith('data:products')) || missing.includes('collection:products')) {
    return {
      status: 'UNSUPPORTED' as CapabilityStatus,
      existingCapabilities: existing,
      proposedSolution: 'Backend/data dependency is absent; do not treat this as a missing visual widget only.',
      missingDependencies: missing,
      reason: 'One or more data-source hints are unsupported in the current codebase.',
      evidence: 'verified' as const,
    }
  }
  if (existing.length && !missing.length) {
    return {
      status: 'SUPPORTED' as CapabilityStatus,
      existingCapabilities: existing,
      proposedSolution: 'Reuse the matched registered capabilities.',
      missingDependencies: [],
      reason: 'All capability hints resolve against the verified snapshot.',
      evidence: 'verified' as const,
    }
  }
  if (existing.some((hint) => hint.startsWith('atom:')) && missing.every((hint) => !hint.startsWith('data:'))) {
    return {
      status: 'COMPOSABLE' as CapabilityStatus,
      existingCapabilities: existing,
      proposedSolution: 'Compose the requirement from matched Atoms/widgets. Justify any new widget against these existing capabilities.',
      missingDependencies: missing,
      reason: 'Partial matches exist; composition is preferred over a new widget family.',
      evidence: 'inferred' as const,
    }
  }
  return {
    status: 'MISSING' as CapabilityStatus,
    existingCapabilities: existing,
    proposedSolution: 'No registered capability fully satisfies the hints. Any BUILD must explain why composition is insufficient.',
    missingDependencies: missing.length ? missing : hints,
    reason: 'Capability hints do not fully resolve against the verified snapshot.',
    evidence: 'inferred' as const,
  }
}

function classifyRequirement(input: RequirementInput, snapshot: CapabilitySnapshot): RequirementAssessment {
  if (!idPattern.test(input.id)) {
    throw new ToolError('INVALID_ARGUMENTS', `Requirement id "${input.id}" must match ${idPattern}.`)
  }
  const priority = normalizePriority(input.priority)
  const hints = Array.isArray(input.capabilityHints)
    ? input.capabilityHints.filter((hint): hint is string => typeof hint === 'string')
    : []
  if (input.intent) {
    const byIntent = classifyByIntent(input.intent, snapshot)
    if (!byIntent) {
      throw new ToolError('INVALID_ARGUMENTS', `Unknown intent "${input.intent}". Use zyvavu_get_capability_snapshot knownIntents.`)
    }
    return {
      id: input.id,
      description: input.description,
      intent: input.intent,
      priority,
      decision: null,
      ...byIntent,
    }
  }
  const byHints = classifyFromHints(hints, snapshot)
  if (byHints) {
    return {
      id: input.id,
      description: input.description,
      intent: null,
      priority,
      decision: null,
      ...byHints,
    }
  }
  return {
    id: input.id,
    description: input.description,
    intent: null,
    status: 'MISSING',
    existingCapabilities: [],
    proposedSolution: 'Provide a known intent or capabilityHints so the server can classify against verified registries.',
    missingDependencies: ['classification:unspecified'],
    reason: 'No intent or capability hints were supplied; classification cannot invent support from the free-text description alone.',
    priority,
    decision: null,
    evidence: 'inferred',
  }
}

function computeReadiness(requirements: RequirementAssessment[]): {
  overallReadiness: OverallReadiness
  unresolvedRequirements: string[]
} {
  const unresolved: string[] = []
  let deferred = false
  for (const requirement of requirements) {
    if (requirement.priority !== 'required') continue
    const resolvedByReuse =
      (requirement.status === 'SUPPORTED' || requirement.status === 'COMPOSABLE') &&
      (requirement.decision === null || requirement.decision === 'REUSE')
    if (resolvedByReuse) continue
    if (requirement.decision === 'REUSE' && requirement.existingCapabilities.length) continue
    if (requirement.decision === 'DEFER') {
      deferred = true
      continue
    }
    // BUILD records approval only; capability is still absent until a separate coding task.
    // REJECT / null leave the requirement unresolved for Stage 1/2.
    unresolved.push(requirement.id)
  }
  if (unresolved.length) return { overallReadiness: 'BLOCKED', unresolvedRequirements: unresolved }
  if (deferred) return { overallReadiness: 'READY_WITH_DEFERRED', unresolvedRequirements: [] }
  return { overallReadiness: 'READY', unresolvedRequirements: [] }
}

function assessmentIdFor(themeRequest: string, requirements: RequirementAssessment[], snapshotId: string, scope?: BuilderScope) {
  return createHash('sha256')
    .update(JSON.stringify({
      schemaVersion: ASSESSMENT_SCHEMA_VERSION,
      themeRequest,
      snapshotId,
      scope,
      requirements: requirements.map(({ id, status, intent, priority, template, description }) =>
        ({ id, status, intent, priority, ...(scope ? { template, description } : {}) }),
      ),
    }))
    .digest('hex')
    .slice(0, 16)
}

function parseScope(value: unknown): BuilderScope | undefined {
  if (value === undefined) return undefined
  const issues: Issue[] = []
  checkShape(value, builderScopeShape, '$.scope', issues)
  assertIssues(issues, 'Generation scope is invalid.')
  const scope = value as { mode: 'full' | 'single'; themeId: string; template?: string; loopItemId?: string }
  if (!scope.themeId.trim() || (scope.mode === 'full'
    ? scope.template !== undefined || scope.loopItemId !== undefined
    : !scope.template || (scope.template === 'loopItem' ? !scope.loopItemId?.trim() : scope.loopItemId !== undefined))) {
    throw new ToolError('INVALID_ARGUMENTS', 'Full scope requires a Theme ID. Single scope also requires a template and a stable Loop Item ID when applicable.')
  }
  return scope.mode === 'full'
    ? { mode: 'full', themeId: scope.themeId }
    : { mode: 'single', themeId: scope.themeId, template: scope.template as Extract<BuilderScope, { mode: 'single' }>['template'],
        ...(scope.loopItemId ? { loopItemId: scope.loopItemId } : {}) }
}

export function getCapabilitySnapshot() {
  const snapshot = buildCapabilitySnapshot()
  return {
    ...snapshot,
    knownIntents: listKnownIntents(),
    stageGate: {
      advancesToThemeCustomize: ['READY', 'READY_WITH_DEFERRED'],
      blockedPreventsStage1and2: true,
      buildDecisionDoesNotImplement: true,
    },
  }
}

export function assessThemeRequirements(args: {
  themeRequest: string
  requirements: RequirementInput[]
  scope?: unknown
}) {
  if (typeof args.themeRequest !== 'string' || !args.themeRequest.trim()) {
    throw new ToolError('INVALID_ARGUMENTS', 'themeRequest must be a non-empty string.')
  }
  if (!Array.isArray(args.requirements) || !args.requirements.length || args.requirements.length > 50) {
    throw new ToolError('INVALID_ARGUMENTS', 'Provide 1 to 50 structured requirements.')
  }
  const issues: Issue[] = []
  args.requirements.forEach((requirement, index) => {
    checkShape(requirement, requirementInputShape, `$.requirements[${index}]`, issues)
  })
  assertIssues(issues, 'Requirement inputs are invalid.')
  const scope = parseScope(args.scope)
  if (scope?.mode === 'single' && args.requirements.some((requirement) => !requirement.template)) {
    throw new ToolError('INVALID_ARGUMENTS', 'Tag each requirement with its template context for a Single Template assessment.')
  }
  const scopedInputs = scope?.mode === 'single'
    ? args.requirements.filter((requirement) => requirement.template === scope.template)
    : args.requirements
  if (!scopedInputs.length) throw new ToolError('INVALID_ARGUMENTS', 'Provide requirements for the selected template.')
  const ids = new Set<string>()
  for (const requirement of args.requirements) {
    if (ids.has(requirement.id)) {
      throw new ToolError('INVALID_ARGUMENTS', `Duplicate requirement id "${requirement.id}".`)
    }
    ids.add(requirement.id)
  }
  const snapshot = buildCapabilitySnapshot()
  const requirements = scopedInputs.map((requirement) => ({
    ...classifyRequirement(requirement, snapshot),
    ...(requirement.template ? { template: requirement.template } : {}),
  }))
  const { overallReadiness, unresolvedRequirements } = computeReadiness(requirements)
  const assessment: CapabilityAssessment = {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    assessmentId: assessmentIdFor(args.themeRequest.trim(), requirements, snapshot.capabilitySnapshotId, scope),
    ...(scope ? { scope } : {}),
    themeRequest: args.themeRequest.trim(),
    capabilitySnapshotId: snapshot.capabilitySnapshotId,
    requirements,
    overallReadiness,
    unresolvedRequirements,
    decisions: [],
  }
  return {
    assessment,
    ...(scope?.mode === 'single' ? {
      excludedRequirementIds: args.requirements.filter((requirement) => requirement.template !== scope.template).map(({ id }) => id),
    } : {}),
    reportMarkdown: renderCapabilityAssessmentMarkdown(assessment, snapshot),
    stageGate: {
      ready: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      overallReadiness,
      canAdvanceToThemeCustomize: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      canAdvanceToThemeBuilder: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
    },
  }
}

function parseAssessment(value: unknown): CapabilityAssessment {
  const issues: Issue[] = []
  checkShape(value, assessmentShape, '$', issues)
  assertIssues(issues, 'Assessment document is invalid.')
  const assessment = value as CapabilityAssessment
  const scope = parseScope(assessment.scope)
  if ((scope?.mode === 'single' && assessment.requirements.some((requirement) => requirement.template !== scope.template)) ||
      assessment.assessmentId !== assessmentIdFor(assessment.themeRequest, assessment.requirements, assessment.capabilitySnapshotId, scope)) {
    throw new ToolError('INVALID_ARGUMENTS', 'Assessment identity or requirements do not match its generation scope. Run a fresh assessment.')
  }
  for (const requirement of assessment.requirements) {
    if (!idPattern.test(requirement.id)) {
      throw new ToolError('INVALID_ARGUMENTS', `Requirement id "${requirement.id}" is invalid.`)
    }
    if (requirement.intent !== null && typeof requirement.intent !== 'string') {
      throw new ToolError('INVALID_ARGUMENTS', `Requirement "${requirement.id}" intent must be string or null.`)
    }
  }
  return assessment
}

function applyDecision(
  requirement: RequirementAssessment,
  decision: OwnerDecision,
): RequirementAssessment {
  if (decision === 'REUSE' && !requirement.existingCapabilities.length) {
    throw new ToolError(
      'INVALID_ARGUMENTS',
      `REUSE is invalid for "${requirement.id}" because existingCapabilities is empty.`,
    )
  }
  // Explicit replacement only — DEFER never becomes BUILD implicitly.
  return { ...requirement, decision }
}

export function resolveCapabilityAssessment(args: {
  assessment: unknown
  decisions?: DecisionInput[]
  expectedSnapshotId?: string
}) {
  const assessment = parseAssessment(args.assessment)
  const snapshot = buildCapabilitySnapshot()
  if (args.expectedSnapshotId && args.expectedSnapshotId !== assessment.capabilitySnapshotId) {
    throw new ToolError('INVALID_ARGUMENTS', 'expectedSnapshotId does not match assessment.capabilitySnapshotId.')
  }
  if (assessment.capabilitySnapshotId !== snapshot.capabilitySnapshotId) {
    // Snapshot drift is a warning path: still resolve decisions against the submitted facts,
    // but mark readiness BLOCKED so Stage 1/2 cannot assume current registries.
  }
  const decisionList = Array.isArray(args.decisions) ? args.decisions : []
  const issues: Issue[] = []
  decisionList.forEach((decision, index) => {
    checkShape(decision, decisionInputShape, `$.decisions[${index}]`, issues)
  })
  assertIssues(issues, 'Decision inputs are invalid.')
  const byId = new Map(assessment.requirements.map((requirement) => [requirement.id, requirement]))
  const nextDecisions = [...assessment.decisions]
  for (const entry of decisionList) {
    const requirement = byId.get(entry.requirementId)
    if (!requirement) {
      throw new ToolError('NOT_FOUND', `Requirement "${entry.requirementId}" is absent from the assessment.`)
    }
    const previous = requirement.decision
    if (previous === 'DEFER' && entry.decision === 'BUILD' && decisionList.length === 0) {
      // unreachable guard kept for clarity with the contract tests
    }
    // Only an explicit decision object may change DEFER → BUILD.
    byId.set(entry.requirementId, applyDecision(requirement, entry.decision))
    nextDecisions.push({
      requirementId: entry.requirementId,
      decision: entry.decision,
      ...(typeof entry.note === 'string' ? { note: entry.note } : {}),
    })
  }
  const requirements = assessment.requirements.map((requirement) => byId.get(requirement.id)!)
  let { overallReadiness, unresolvedRequirements } = computeReadiness(requirements)
  if (assessment.capabilitySnapshotId !== snapshot.capabilitySnapshotId) {
    overallReadiness = 'BLOCKED'
    if (!unresolvedRequirements.includes('capability-snapshot-drift')) {
      unresolvedRequirements = [...unresolvedRequirements, 'capability-snapshot-drift']
    }
  }
  const resolved: CapabilityAssessment = {
    ...assessment,
    requirements,
    decisions: nextDecisions,
    overallReadiness,
    unresolvedRequirements,
  }
  return {
    assessment: resolved,
    reportMarkdown: renderCapabilityAssessmentMarkdown(resolved, snapshot),
    stageGate: {
      ready: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      overallReadiness,
      canAdvanceToThemeCustomize: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      canAdvanceToThemeBuilder: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      buildDecisionDoesNotImplement: true,
    },
  }
}

export function validateCapabilityAssessment(args: { assessment: unknown }) {
  const assessment = parseAssessment(args.assessment)
  const { overallReadiness, unresolvedRequirements } = computeReadiness(assessment.requirements)
  const decisionMismatch = assessment.requirements.some((requirement) => {
    const recorded = assessment.decisions.filter((entry) => entry.requirementId === requirement.id).at(-1)
    return (recorded?.decision ?? null) !== requirement.decision
  })
  const valid =
    assessment.overallReadiness === overallReadiness &&
    JSON.stringify(assessment.unresolvedRequirements) === JSON.stringify(unresolvedRequirements) &&
    !decisionMismatch
  return {
    valid,
    expected: { overallReadiness, unresolvedRequirements },
    errors: valid ? [] : [{
      path: '$.overallReadiness',
      code: 'READINESS_MISMATCH',
      message: decisionMismatch
        ? 'Requirement decision fields do not match the decisions log.'
        : 'overallReadiness/unresolvedRequirements do not match the Stage 0 gate rules.',
    }],
    stageGate: {
      ready: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      overallReadiness,
      canAdvanceToThemeCustomize: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
      canAdvanceToThemeBuilder: overallReadiness === 'READY' || overallReadiness === 'READY_WITH_DEFERRED',
    },
  }
}
