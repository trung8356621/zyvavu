import type { TemplateContext } from '@/lib/theme-engine/types'
import { getLayoutRules, manifests, schemaVersion, widgetContract } from './catalog'
import { fields, list, options, string, type Issue } from './shape'
import {
  assessThemeRequirements,
  ASSESSMENT_SCHEMA_VERSION,
  getCapabilitySnapshot,
  resolveCapabilityAssessment,
  validateCapabilityAssessment,
} from './stage0'
import { contextArgs, contextShape, define, theme, themeArgs, ToolError } from './tool-contract'
import { validateTemplate } from './validate'
import { builderScopeShape, requirementInputShape } from './stage0/assess'
import type { RequirementInput } from './stage0/types'

export const publicRules = {
  composition: {
    section: 'A page-content root is a Section. Sections cannot be nested.',
    container: 'Section content and Columns slots hold widgets. Columns provides grid layout.',
    widget: 'Use registered widgets allowed by the template context.',
    bannerSlider: 'Section → BannerSlider → SlideItem → nested widgets. SlideItem is library slot-only. Banner Item style is on SlideItem nodes; arrows/pagination use controlsStyle.',
    animatedCounter: 'Count-up only (not countdown). Valid in Section/Columns/SlideItem content; never as a direct BannerSlider.slides child.',
    stage0: 'Capability assessment is read-only. NL interpretation stays in the MCP client; this server classifies structured requirements against verified registries.',
  },
  lifecycle: {
    validation: 'Proposal validation is read-only.',
    routes: 'The CMS URL Registry owns live routes. Planning does not reserve them.',
    publish: 'The application owns publishing and its authorization.',
    stageGate: 'Theme Customize/Builder must not advance while Stage 0 readiness is BLOCKED.',
  },
  layout: getLayoutRules(),
}

export function publicWidgets(context?: TemplateContext) {
  return Object.keys(manifests).map((type) => widgetContract(type)!)
    .filter(({ contexts }) => context === undefined || contexts.includes(context))
    .map(({ type, displayName, availability, contexts, capabilities, libraryGroup, librarySlotOnly }) =>
      ({ type, displayName, availability, contexts, capabilities, libraryGroup, librarySlotOnly }))
}
const proposal = { type: 'object' } as const
const pageShape = fields({ path: string, context: contextShape, document: proposal }, ['path', 'context', 'document'])
const decisionShape = fields({
  requirementId: string,
  decision: options('REUSE', 'BUILD', 'DEFER', 'REJECT'),
  note: string,
}, ['requirementId', 'decision'])
const assessmentDocument = { type: 'object' } as const

export const publicTools = {
  zyvavu_get_schema_version: define('Return proposal and Stage 0 assessment contract versions.', fields({}), () => ({
    schemaVersion,
    documentVersion: 1,
    assessmentSchemaVersion: ASSESSMENT_SCHEMA_VERSION,
  })),
  zyvavu_list_widgets: define('List public widget capabilities and context availability.', fields({ context: contextShape }), (args) => ({
    widgets: publicWidgets(args.context as TemplateContext | undefined),
  })),
  zyvavu_get_layout_rules: define('Read Puck slot and context rules.', fields({}), getLayoutRules),
  zyvavu_validate_template: define('Validate a proposed Puck document without saving it.', fields({
    ...contextArgs, document: proposal,
  }, ['themeId', 'context', 'document']), (args) =>
    validateTemplate(args.document, args.context as TemplateContext, theme(args).themeConfig)),
  zyvavu_validate_website_plan: define('Validate route intentions and candidate documents for a website plan without saving or reserving routes.', fields({
    ...themeArgs, pages: list(pageShape),
  }, ['themeId', 'pages']), (args) => {
    const { themeConfig } = theme(args)
    const pages = args.pages as { path: string; context: TemplateContext; document: unknown }[]
    if (!pages.length || pages.length > 20) throw new ToolError('INVALID_ARGUMENTS', 'Provide 1 to 20 planned pages.')
    const routes = new Set<string>()
    const results = pages.map(({ path, context, document }) => {
      const route = path.replace(/\/$/, '').toLowerCase() || '/'
      const issues: Issue[] = []
      if (!/^\/(?:[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/?)?$/i.test(path))
        issues.push({ path: '$.path', code: 'INVALID_ROUTE', message: 'Use a site-relative page path.' })
      if (routes.has(route)) issues.push({ path: '$.path', code: 'DUPLICATE_ROUTE', message: 'Planned paths must be unique.' })
      if ((path === '/') !== (context === 'home') || ['header', 'footer'].includes(context))
        issues.push({ path: '$.context', code: 'INVALID_ROUTE_CONTEXT', message: 'Use home only for the root route and omit theme parts from page entries.' })
      routes.add(route)
      const validation = validateTemplate(document, context, themeConfig, true)
      return { path, context, ...validation, valid: validation.valid && !issues.length, errors: [...issues, ...validation.errors] }
    })
    return { valid: results.every(({ valid }) => valid), pages: results, routeAvailability: 'UNVERIFIED' }
  }),
  zyvavu_get_capability_snapshot: define(
    'Return the verified Stage 0 capability snapshot (widgets, atoms, contexts, bindings, data sources). Read-only facts for assessment clients.',
    fields({}),
    () => getCapabilitySnapshot(),
  ),
  zyvavu_assess_theme_requirements: define(
    'Classify structured theme requirements against the verified capability snapshot. Natural-language parsing stays in the client. Read-only; no theme/template writes.',
    fields({
      themeRequest: string,
      requirements: list(requirementInputShape),
      scope: builderScopeShape,
    }, ['themeRequest', 'requirements']),
    (args) => assessThemeRequirements({
      themeRequest: String(args.themeRequest),
      requirements: args.requirements as RequirementInput[],
      scope: args.scope,
    }),
  ),
  zyvavu_validate_capability_assessment: define(
    'Validate a Stage 0 assessment document shape and readiness consistency. Does not mutate state.',
    fields({ assessment: assessmentDocument }, ['assessment']),
    (args) => validateCapabilityAssessment({ assessment: args.assessment }),
  ),
  zyvavu_resolve_capability_assessment: define(
    'Apply explicit owner decisions (REUSE/BUILD/DEFER/REJECT) to an assessment and recompute the Stage 0 readiness gate. BUILD does not implement code. DEFER never becomes BUILD implicitly.',
    fields({
      assessment: assessmentDocument,
      decisions: list(decisionShape),
      expectedSnapshotId: string,
    }, ['assessment']),
    (args) => resolveCapabilityAssessment({
      assessment: args.assessment,
      decisions: args.decisions as {
        requirementId: string
        decision: 'REUSE' | 'BUILD' | 'DEFER' | 'REJECT'
        note?: string
      }[] | undefined,
      expectedSnapshotId: typeof args.expectedSnapshotId === 'string' ? args.expectedSnapshotId : undefined,
    }),
  ),
}
