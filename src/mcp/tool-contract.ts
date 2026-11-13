import { contexts, themes } from './catalog'
import { options, string, type Issue, type RecordValue, type Shape } from './shape'
export class ToolError extends Error {
  constructor(public code: string, message: string, public issues?: Issue[]) {
    super(message)
  }
}
export const bundled = options('bundled', 'live')
export const contextShape = options(...contexts)
export const themeArgs = { themeId: string, source: bundled }
export const contextArgs = { ...themeArgs, context: contextShape }
export function theme(args: RecordValue) {
  if (args.source === 'live')
    throw new ToolError('ACCESS_DENIED', 'This server has no authenticated live CMS access.')
  const match = themes.find(({ id }) => id === args.themeId)
  if (!match) throw new ToolError('NOT_FOUND', 'Bundled theme does not exist.')
  return match
}
export function define(description: string, inputSchema: Shape, run: (args: RecordValue) => unknown) {
  return { description, inputSchema, run }
}

