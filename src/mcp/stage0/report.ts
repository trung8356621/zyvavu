import type { CapabilitySnapshot } from './snapshot'
import type { CapabilityAssessment } from './types'

function section(title: string, body: string) {
  return `## ${title}\n\n${body.trim()}\n`
}

export function renderCapabilityAssessmentMarkdown(
  assessment: CapabilityAssessment,
  snapshot: CapabilitySnapshot,
) {
  const byStatus = (status: CapabilityAssessment['requirements'][number]['status']) =>
    assessment.requirements.filter((requirement) => requirement.status === status)

  const supported = byStatus('SUPPORTED')
  const composable = byStatus('COMPOSABLE')
  const missing = byStatus('MISSING')
  const unsupported = byStatus('UNSUPPORTED')

  const ownerRows = assessment.requirements.map((requirement) => {
    const decision = requirement.decision ?? '—'
    return `| ${requirement.id} | ${requirement.status} | ${requirement.priority} | ${decision} | ${requirement.proposedSolution.replace(/\|/g, '/')} |`
  }).join('\n')

  const verifiedNote = 'Evidence marked `verified` comes from live registries/source. Evidence marked `inferred` is heuristic from capabilityHints and must not be treated as a registered widget claim.'

  return [
    '# Theme Capability Assessment',
    '',
    `- Assessment ID: \`${assessment.assessmentId}\``,
    ...(assessment.scope ? [
      `- Generation scope: ${assessment.scope.mode === 'full' ? 'Full Theme' : 'Single Template'} · ${assessment.scope.themeId}${
        assessment.scope.mode === 'single' ? '/' + assessment.scope.template + (assessment.scope.loopItemId ? '/' + assessment.scope.loopItemId : '') : ''
      }`,
    ] : []),
    `- Schema version: \`${assessment.schemaVersion}\``,
    `- Capability snapshot: \`${assessment.capabilitySnapshotId}\``,
    `- Overall readiness: **${assessment.overallReadiness}**`,
    '',
    section('A. Website requirements', assessment.themeRequest || '_No theme request text._'),
    section(
      'B. Existing capabilities (verified snapshot)',
      [
        verifiedNote,
        '',
        `- Atoms: ${snapshot.atoms.join(', ') || '—'}`,
        `- Widgets: ${snapshot.widgets.map((widget) => widget.type).join(', ')}`,
        `- Contexts: ${snapshot.contexts.map((entry) => entry.context).join(', ')}`,
        `- Data sources: posts=${snapshot.dataSources.posts.status}, categories=${snapshot.dataSources.categories.status}, products=${snapshot.dataSources.products.status}`,
        `- Bindings: document=${snapshot.bindings.documentContext}, item=${snapshot.bindings.itemContext}`,
        `- Responsive breakpoints: tabletMax=${snapshot.responsive.breakpoints.tabletMax}, mobileMax=${snapshot.responsive.breakpoints.mobileMax}`,
      ].join('\n'),
    ),
    section(
      'C. Requirements satisfied by composition',
      composable.length
        ? composable.map((requirement) =>
          `- **${requirement.id}** (${requirement.evidence}): ${requirement.description}\n  - Existing: ${requirement.existingCapabilities.join(', ') || '—'}\n  - Solution: ${requirement.proposedSolution}`,
        ).join('\n')
        : '_None._',
    ),
    section(
      'D. Missing widgets/capabilities',
      missing.length
        ? missing.map((requirement) =>
          `- **${requirement.id}** (${requirement.evidence}): ${requirement.description}\n  - Why not reuse: ${requirement.reason}\n  - Missing: ${requirement.missingDependencies.join(', ') || '—'}`,
        ).join('\n')
        : '_None._',
    ),
    section(
      'E. Unsupported backend dependencies',
      unsupported.length
        ? unsupported.map((requirement) =>
          `- **${requirement.id}**: ${requirement.description}\n  - ${requirement.reason}\n  - Dependencies: ${requirement.missingDependencies.join(', ') || '—'}`,
        ).join('\n')
        : '_None._',
    ),
    section(
      'F. Proposed implementation priority',
      [
        '1. Reuse SUPPORTED capabilities first.',
        '2. Compose COMPOSABLE requirements from Atoms/Containers/existing widgets.',
        '3. Owner DEFER non-blocking gaps before Theme Customize/Builder.',
        '4. Owner BUILD only starts a separate coding task — Stage 0 never implements widgets.',
        '',
        supported.length ? `Supported now: ${supported.map((requirement) => requirement.id).join(', ')}` : 'Supported now: —',
        missing.length ? `Candidate BUILD list: ${missing.map((requirement) => requirement.id).join(', ')}` : 'Candidate BUILD list: —',
        unsupported.length ? `Backend blockers: ${unsupported.map((requirement) => requirement.id).join(', ')}` : 'Backend blockers: —',
      ].join('\n'),
    ),
    section(
      'G. Owner decision table',
      [
        '| Requirement | Status | Priority | Decision | Proposal |',
        '| --- | --- | --- | --- | --- |',
        ownerRows || '| — | — | — | — | — |',
        '',
        'Decisions are stored separately from detection results. DEFER never becomes BUILD implicitly. BUILD does not implement code and does not alone make Stage 1/2 READY.',
      ].join('\n'),
    ),
    section(
      'H. Readiness for Theme Customize / Builder',
      [
        `- Gate: **${assessment.overallReadiness}**`,
        `- Unresolved required: ${assessment.unresolvedRequirements.join(', ') || '—'}`,
        '- Advance only when READY or READY_WITH_DEFERRED.',
        '- Stage 0 does not generate tokens or write Puck documents.',
      ].join('\n'),
    ),
  ].join('\n')
}
