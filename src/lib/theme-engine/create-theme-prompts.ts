import { THEME_BUILDER_TEMPLATE_OPTIONS, type BuilderScope } from './builder-navigation'
export { themeBuilderHref } from './builder-navigation'
import {
  normalizeWebsiteType,
  websiteTypeBuilderSuggestions,
  websiteTypeCustomizeGuidance,
  websiteTypeLabel,
  type WebsiteType,
} from './website-type'

export type CreateThemePromptContext = {
  themeId: string
  themeName: string
  websiteType?: WebsiteType | string | null
  styleDescription?: string
  websiteRequirements?: string
}

/**
 * Deterministic prompt builders for GPT Work / MCP clients.
 * No network calls. Reusable by future API clients without UI coupling.
 */
export function buildThemeCustomizePrompt(ctx: CreateThemePromptContext): string {
  const websiteType = normalizeWebsiteType(ctx.websiteType)
  const style =
    (ctx.styleDescription || '').trim() ||
    '(no style description provided — ask the owner for palette, typography, and layout direction)'
  return `You are configuring Theme Customize for Zyvavu CMS via the Zyvavu MCP server.

## Theme identity (immutable)
- Theme Name: ${ctx.themeName}
- Theme ID: ${ctx.themeId}
- Website Type: ${websiteType} (${websiteTypeLabel(websiteType)})
Use this Theme ID for every MCP call that accepts a Theme ID. Do not invent another ID. Do not rename the ID.
Website Type does not change Theme ID, Puck format, widget registry, or Theme Engine architecture.

## Style direction
${style}

## Website Type design context (suggestions only)
${websiteTypeCustomizeGuidance(websiteType)}
Follow the owner's style description and the live Theme Customize token contract.
Do NOT invent a fixed palette solely from Website Type.

## Required workflow
1. Connect to the Zyvavu MCP server (\`zyvavu\`).
2. Inspect Theme Customize capabilities (\`zyvavu_get_capabilities\`, \`zyvavu_theme_customize_list\` when authenticated).
3. Call the public \`zyvavu_get_theme_customize_schema\` tool or read \`zyvavu://catalog/theme-customize-schema\`. If MCP does not expose the actual schema, report that blocker and stop. Do not infer a schema from examples. Separately try authenticated \`zyvavu_theme_customize_get\` for the current values of \`${ctx.themeId}\`. Report inaccessible values separately.
4. Design a complete configuration across all five groups: colors, typography (body and heading font families, base metrics, h1–h6 and p1–p3), spacing, layout, and radius. Use all relevant schema fields. Preserve known values that should remain unchanged. For each omitted group, report its name and reason outside the JSON. If existing values are inaccessible, do not describe assumptions as the current theme values.
5. Validate the entire proposed document with the public read-only \`zyvavu_validate_theme_import\` tool, passing the exact Theme ID and the JSON document. Resolve errors within the published contract. Authenticated live token proposals can also use \`zyvavu_theme_customize_validate\`.
6. Save only through authorized MCP Theme Customize tools when they are available and Stage 0 readiness allows writes. Before a live update, read current values and retain every intentionally unchanged token. Use manual import if you cannot verify the live values or safely preserve them.
7. Read back the saved result/revision.
8. If direct writes are unavailable, return a UTF-8 file named \`theme.json\` for manual import in Step 1 of the Create Theme Wizard. Use a JSON object with only \`themeId\` (exactly \`${ctx.themeId}\`) and \`tokens\`. Omitted fields retain their existing values during import. Exclude metadata, slots, Puck documents, widget definitions, responsive overrides, scripts, and HTML. Keep the file at or below 64 KB. If you cannot validate against the current contract, report the blocker instead of returning a guessed artifact.

## Hard rules
- Theme Customize is the only place to edit this theme's design tokens.
- Do NOT generate Puck page templates in this step.
- Do NOT modify other themes.
- Never claim the JSON artifact has been imported or saved. A live MCP save requires verified read-back.
`
}

export function buildThemeBuilderPrompt(
  ctx: CreateThemePromptContext,
  selection: { mode: 'full' } | Omit<Extract<BuilderScope, { mode: 'single' }>, 'themeId'> = { mode: 'full' },
): string {
  const websiteType = normalizeWebsiteType(ctx.websiteType)
  const scope: BuilderScope = { ...selection, themeId: ctx.themeId }
  const single = scope.mode === 'single'
  const label = single
    ? THEME_BUILDER_TEMPLATE_OPTIONS.find(({ value }) => value === scope.template)?.label
    : undefined
  const requirements = ctx.websiteRequirements?.trim() ||
    (single ? '(ask the owner for requirements for this template)' : '(ask the owner for website requirements)')
  return [
    'You are building Theme Builder templates for Zyvavu CMS via the Zyvavu MCP server.',
    '',
    '## Theme identity (immutable)',
    '- Theme Name: ' + ctx.themeName,
    '- Theme ID: ' + ctx.themeId,
    '- Website Type: ' + websiteType + ' (' + websiteTypeLabel(websiteType) + ')',
    'Use this Theme ID for every call that accepts one. Website Type is guidance only.',
    '',
    '## Generation scope',
    single ? 'Single Template: ' + label + ' (' + scope.template + ')' : 'Full Theme',
    ...(single ? ['Template identity: ' + ctx.themeId + '/' + scope.template +
      (scope.loopItemId ? '/' + scope.loopItemId : '')] : []),
    'Pass this exact scope to zyvavu_assess_theme_requirements: ' + JSON.stringify(scope),
    'Create a fresh assessment for this scope. Never reinterpret an existing assessment for a different scope.',
    '',
    single ? '## Template requirements' : '## Website requirements',
    requirements,
    ...(!single ? ['', 'Website Type suggestions (do not auto-create):', websiteTypeBuilderSuggestions(websiteType)] : []),
    '',
    '## Required workflow',
    single
      ? 'Audit only the selected template. Set each requirement’s template field to the selected context.'
      : 'Inventory required template types and identities from the existing registry and owner requirements. Set the template field on template-specific requirements.',
    'Stage 0 remains mandatory. Use zyvavu_get_capability_snapshot and zyvavu_assess_theme_requirements with stable requirement IDs.',
    ...(!single ? ['Present one consolidated Stage 0 assessment and inventory for owner approval.'] : []),
    'Report MISSING and UNSUPPORTED capabilities and ask for explicit owner decisions (REUSE / BUILD / DEFER / REJECT). STOP if readiness is BLOCKED. Do not generate templates until READY or READY_WITH_DEFERRED.',
    'Then read current Theme Customize tokens and the relevant widget schemas. Do not change Theme Customize tokens. If a required contract cannot be read or validated, report the blocker.',
    single
      ? 'Build exactly one Puck document proposal for this identity. Reuse existing Header/Footer where applicable. Leave all other documents untouched.'
      : 'Build each approved template independently and validate it separately. Avoid any replace-all operation.',
    'Use the existing Puck architecture (Section → Container → Component where required, Loop Item policy where applicable), registered widgets and shared Atoms. Follow textBinding, srcBinding and hrefBinding contracts, with missing data resolving to null.',
    'Validate each proposal using zyvavu_validate_template for the exact Theme ID and context, or the equivalent existing application validator. Report validation failures and export only validated proposals.',
    'Save and read back each approved document only if authorized MCP Theme Builder write tools exist. Otherwise export UTF-8 JSON for Configure Theme → Step 2 → Nhập Template JSON (opens Theme Builder → Tạo phiên bản mới → Nhập JSON) or the same menu inside Builder, and report that it was not saved.',
    ...(single
      ? [
          'Manual import file contract (one file for this template): envelope `{ "themeId": "' +
            ctx.themeId +
            '", "template": "' +
            scope.template +
            '", "versionId": "<source version id for reference only>", "document": <Puck document> }` where `document` matches `zyvavu://catalog/template` / ThemeTemplateDocument (`version: 1`, `template` matching the selected type, `root`, `content`) and every widget has a unique `props.id`. When the selected template uses a role contract, include required widgets such as document.content before Save/import. Import always creates a NEW version id for that theme+template pair; `versionId` never overwrites the active version. A bare Puck document is accepted when its `template` matches the Builder destination. Do NOT export Theme Customize `{ themeId, tokens }` here — that belongs to Step 1. Exclude scripts and HTML. Keep the file at or below 512 KB.',
        ]
      : [
          'Manual import: export ONE UTF-8 JSON file per approved template (not a multi-template bundle). Each file uses envelope `{ "themeId": "' +
            ctx.themeId +
            '", "template": "<home|single|page|category|header|footer>", "versionId": "<source version id for reference only>", "document": <Puck document> }` with `document.template` matching that file’s `template`, unique widget `props.id`, and role-contract widgets such as document.content when required. Owner imports each file via Configure Theme → Step 2 → Nhập Template JSON (template type is read from the file; destination theme is the wizard theme). Builder → Tạo phiên bản mới → Tạo bản mới từ file JSON remains available. Import creates a NEW version; active version changes only when the owner sets it. Do NOT export Theme Customize `{ themeId, tokens }` here — that belongs to Step 1. Exclude scripts and HTML. Keep each file at or below 512 KB.',
          'Report success, failure or export status per template. Never claim Full Theme completed if any required template failed or remains unsaved.',
        ]),
    'Do not create missing widgets, backend collections or routes. Never assume Products collection, Cart, Checkout, or Payment exist. Report missing backends as UNSUPPORTED.',
    'Never claim the JSON artifact has been imported or saved unless an authorized MCP write was verified by read-back.',
  ].join('\n') + '\n'
}

export function themeCustomizerHref(themeId: string): string {
  return `/admin/theme-customizer?theme=${encodeURIComponent(themeId)}`
}

