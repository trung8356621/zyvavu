import type { BuilderComponentData, BuilderDocument } from '../../core/types'

export type NormalizedSourceLink = {
  id: string
  label: string
  url: string
  newTab?: boolean
  sourceBlockId: string
  sourceBlockType: string
  sourceIndex: number
}

export type MobileTreeNode = {
  id: string
  label: string
  url: string
  newTab?: boolean
  sourceLinkId?: string
  children?: MobileTreeNode[]
}

export type MobileMenuData = {
  version: number
  items: MobileTreeNode[]
  sourceSnapshot?: NormalizedSourceLink[]
}

export const CURRENT_MOBILE_MENU_VERSION = 1

function createStableLinkId(sourceBlockId: string, index: number, label: string, url: string): string {
  // Deterministic ID based on block identity and link content
  const clean = `${sourceBlockId}:${index}:${url.trim().toLowerCase()}`
  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i)
    hash |= 0
  }
  return `link-${Math.abs(hash).toString(36)}`
}

function processComponentLinks(comp: BuilderComponentData, links: NormalizedSourceLink[]): void {
  if (!comp || !comp.type || !comp.props) return

  const blockId = comp.props.id || 'block'
  const blockType = comp.type

  if (blockType === 'LinkList' && Array.isArray(comp.props.items)) {
    comp.props.items.forEach((item: any, idx: number) => {
      if (item && typeof item === 'object' && item.url) {
        links.push({
          id: createStableLinkId(blockId, idx, item.label || '', item.url || ''),
          label: (item.label || item.url).trim(),
          url: item.url.trim(),
          newTab: Boolean(item.newTab),
          sourceBlockId: blockId,
          sourceBlockType: blockType,
          sourceIndex: idx,
        })
      }
    })
  } else if (blockType === 'PromoBanner') {
    if (comp.props.ctaUrl && comp.props.ctaLabel) {
      links.push({
        id: createStableLinkId(blockId, 0, comp.props.ctaLabel, comp.props.ctaUrl),
        label: comp.props.ctaLabel.trim(),
        url: comp.props.ctaUrl.trim(),
        newTab: Boolean(comp.props.ctaNewTab),
        sourceBlockId: blockId,
        sourceBlockType: blockType,
        sourceIndex: 0,
      })
    }
  } else if (blockType === 'ContactCard') {
    if (comp.props.actionUrl && comp.props.actionLabel) {
      links.push({
        id: createStableLinkId(blockId, 0, comp.props.actionLabel, comp.props.actionUrl),
        label: comp.props.actionLabel.trim(),
        url: comp.props.actionUrl.trim(),
        newTab: Boolean(comp.props.actionNewTab),
        sourceBlockId: blockId,
        sourceBlockType: blockType,
        sourceIndex: 0,
      })
    }
  }
}

export function extractNormalizedSourceLinks(document: BuilderDocument): NormalizedSourceLink[] {
  const links: NormalizedSourceLink[] = []

  // Process root content
  if (Array.isArray(document.content)) {
    for (const comp of document.content) {
      processComponentLinks(comp, links)
    }
  }

  // Process zones (slots)
  if (document.zones && typeof document.zones === 'object') {
    for (const zoneItems of Object.values(document.zones)) {
      if (Array.isArray(zoneItems)) {
        for (const comp of zoneItems) {
          processComponentLinks(comp, links)
        }
      }
    }
  }

  return links
}

export function calculateSourceLinksFingerprint(links: NormalizedSourceLink[]): string {
  const payload = links
    .map((l) => `${l.label}|${l.url}|${l.newTab ? '1' : '0'}`)
    .sort()
    .join(';;')

  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function createDefaultMobileMenuData(sourceLinks: NormalizedSourceLink[] = []): MobileMenuData {
  return {
    version: CURRENT_MOBILE_MENU_VERSION,
    items: sourceLinks.map((sl) => ({
      id: sl.id,
      label: sl.label,
      url: sl.url,
      newTab: sl.newTab,
      sourceLinkId: sl.id,
      children: [],
    })),
    sourceSnapshot: sourceLinks,
  }
}
