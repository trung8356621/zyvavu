import { getLayoutRules, schemaVersion } from './catalog'
import { publicRules, publicTools, publicWidgets } from './public'
import { checkShape, fields, type Issue, type RecordValue } from './shape'
import { getCapabilitySnapshot } from './stage0'
import { builderTools, builderWidgets, getStyleSchema } from './theme-builder'
import { customizeTools, themeCustomizeSchema, tokenSemantics } from './theme-customize'
import { define, ToolError } from './tool-contract'
import { documentShape } from './validate'

export { ToolError } from './tool-contract'

type Tool = ReturnType<typeof define>
type Surface = { label: string; tools: Record<string, Tool> }

const baseSurfaces: Record<string, Surface> = {
  public: {
    label: 'Zyvavu Public MCP',
    tools: publicTools,
  },
  'theme-customize': { label: 'Theme Customize MCP', tools: customizeTools },
  'theme-builder': { label: 'Theme Builder MCP', tools: builderTools },
}

function describeSurfaces(): { id: string; label: string; tools: string[] }[] {
  return Object.entries(baseSurfaces).map(([id, { label, tools }]) => ({
    id,
    label,
    tools: id === 'public'
      ? ['zyvavu_get_capabilities', ...Object.keys(tools)]
      : Object.keys(tools),
  }))
}

const surfaces: Record<string, Surface> = {
  public: {
    label: baseSurfaces.public.label,
    tools: {
      zyvavu_get_capabilities: define('Discover Phase 1 operations and their availability.', fields({}), () => ({
        surfaces: describeSurfaces(), schemaVersion, transport: 'stdio', readOnly: true,
        available: [
          'bundled themes and templates',
          'widget and layout discovery',
          'style discovery',
          'proposal validation',
          'website planning',
          'stage0 capability snapshot',
          'stage0 requirement assessment',
          'stage0 owner decision resolution',
          'trusted-auth theme customize read/validate',
          'unauthenticated Theme Customize token schema and import validation',
          'theme customize update via disposable memory store',
          'live theme customize create/update when bridge enabled',
        ],
        partial: [
          'widget field schemas',
          'style validation',
          'effective style',
          'payload-token auth when Payload client unbound',
        ],
        disabled: [
          'caller-supplied role claims as authorization',
          'unauthenticated live CMS reads',
          'payload settings writes from default MCP path',
          'payload settings writes without live bridge',
          'rendering and inspection',
          'embedded LLM calls',
          'automatic widget implementation from Stage 0',
        ],
      })),
      ...baseSurfaces.public.tools,
    },
  },
  'theme-customize': baseSurfaces['theme-customize'],
  'theme-builder': baseSurfaces['theme-builder'],
}

const tools = new Map(Object.entries(surfaces).flatMap(([surface, { tools }]) =>
  Object.entries(tools).map(([name, tool]) => [name, { ...tool, surface }] as const),
))

const mutatingTools = new Set([
  'zyvavu_theme_customize_update',
  'zyvavu_theme_customize_create',
])

export function listTools() {
  return [...tools].map(([name, { description, inputSchema, surface }]) => ({
    name, description, inputSchema, _meta: { 'zyvavu/surface': surface },
    annotations: {
      readOnlyHint: !mutatingTools.has(name),
      destructiveHint: name === 'zyvavu_theme_customize_update',
      idempotentHint: true,
      openWorldHint: false,
    },
  }))
}

export async function callTool(name: string, args: unknown) {
  const tool = tools.get(name)
  if (!tool) throw new ToolError('UNKNOWN_TOOL', 'Unknown tool.')
  const issues: Issue[] = []
  checkShape(args, tool.inputSchema, '$', issues)
  if (issues.length) throw new ToolError('INVALID_ARGUMENTS', 'Tool arguments do not match its input schema.', issues)
  return await tool.run(args as RecordValue)
}

const resources = {
  'zyvavu://catalog/rules': { name: 'Public CMS rules', surface: 'public', read: () => publicRules },
  'zyvavu://catalog/public-widgets': { name: 'Public widget capabilities', surface: 'public', read: () => publicWidgets() },
  'zyvavu://catalog/layout': { name: 'Layout rules', surface: 'public', read: getLayoutRules },
  'zyvavu://catalog/capability-snapshot': {
    name: 'Stage 0 capability snapshot',
    surface: 'public',
    read: () => getCapabilitySnapshot(),
  },
  'zyvavu://catalog/token-semantics': { name: 'Theme token semantics', surface: 'theme-customize', read: () => tokenSemantics },
  'zyvavu://catalog/theme-customize-schema': { name: 'Theme Customize token schema', surface: 'theme-customize', read: () => themeCustomizeSchema },
  'zyvavu://catalog/template': { name: 'Puck proposal document schema', surface: 'theme-builder', read: () => documentShape },
  'zyvavu://catalog/styles': { name: 'Style overrides', surface: 'theme-builder', read: getStyleSchema },
  'zyvavu://catalog/widgets': { name: 'Widget settings schemas', surface: 'theme-builder', read: builderWidgets },
}

export function listResources() {
  return Object.entries(resources).map(([uri, { name, surface }]) => ({
    uri, name, mimeType: 'application/json', _meta: { 'zyvavu/surface': surface },
  }))
}

export function readResource(uri: string) {
  if (!Object.hasOwn(resources, uri)) return undefined
  return resources[uri as keyof typeof resources].read()
}
