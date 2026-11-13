import type { Data } from '@puckeditor/core'
import { requestBannerScroll } from './active-slide-store'

export type BannerSlideLocation = {
  sliderId: string
  slideId: string
  slideIndex: number
  zone: string
}

function walkFindParent(
  items: any[],
  childId: string,
  parentId?: string,
  parentType?: string,
): { parentId: string; parentType: string } | null {
  for (const item of items) {
    if (!item?.props?.id) continue
    if (item.props.id === childId && parentId && parentType) {
      return { parentId, parentType }
    }
    for (const value of Object.values(item.props || {})) {
      if (Array.isArray(value) && value.some((child) => child?.type && child?.props)) {
        const found = walkFindParent(value, childId, item.props.id, item.type)
        if (found) return found
      }
    }
  }
  return null
}

/** Walk up until a SlideItem ancestor is found (nested widgets supported). */
export function findEnclosingBannerSlide(
  data: Data | null | undefined,
  widgetId: string,
): BannerSlideLocation | null {
  if (!data || !widgetId) return null

  for (const [zoneKey, items] of Object.entries(data.zones || {})) {
    const list = items as any[]
    const slideIndex = list.findIndex((item) => item?.props?.id === widgetId)
    if (slideIndex !== -1 && list[slideIndex]?.type === 'SlideItem') {
      const sep = zoneKey.lastIndexOf(':')
      if (sep <= 0 || zoneKey.slice(sep + 1) !== 'slides') continue
      return {
        sliderId: zoneKey.slice(0, sep),
        slideId: widgetId,
        slideIndex,
        zone: zoneKey,
      }
    }
    // Nested widget inside a slide in this zone
    for (let slideIndex = 0; slideIndex < list.length; slideIndex++) {
      const slide = list[slideIndex]
      if (slide?.type !== 'SlideItem') continue
      const nested = walkFindParent(slide.props?.content || [], widgetId, slide.props.id, 'SlideItem')
      if (nested) {
        const sep = zoneKey.lastIndexOf(':')
        if (sep <= 0 || zoneKey.slice(sep + 1) !== 'slides') continue
        return {
          sliderId: zoneKey.slice(0, sep),
          slideId: slide.props.id,
          slideIndex,
          zone: zoneKey,
        }
      }
    }
  }

  // Slot-canonical trees
  const findInContent = (items: any[]): BannerSlideLocation | null => {
    for (const item of items) {
      if (!item?.props?.id) continue
      if (item.type === 'BannerSlider' && Array.isArray(item.props.slides)) {
        const slides = item.props.slides as any[]
        for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
          const slide = slides[slideIndex]
          if (slide?.type !== 'SlideItem') continue
          if (slide.props?.id === widgetId) {
            return {
              sliderId: item.props.id,
              slideId: widgetId,
              slideIndex,
              zone: `${item.props.id}:slides`,
            }
          }
          if (walkFindParent(slide.props?.content || [], widgetId, slide.props.id, 'SlideItem')) {
            return {
              sliderId: item.props.id,
              slideId: slide.props.id,
              slideIndex,
              zone: `${item.props.id}:slides`,
            }
          }
        }
      }
      for (const value of Object.values(item.props || {})) {
        if (Array.isArray(value) && value.some((child) => child?.type && child?.props)) {
          const found = findInContent(value)
          if (found) return found
        }
      }
    }
    return null
  }

  return findInContent(data.content || [])
}

export function duplicateBannerSlide(args: {
  dispatch: (action: any) => void
  location: BannerSlideLocation
  selectSlider?: boolean
  getSelectorForId?: (id: string) => { index: number; zone?: string } | undefined
}) {
  const { dispatch, location, selectSlider, getSelectorForId } = args
  dispatch({
    type: 'duplicate',
    sourceIndex: location.slideIndex,
    sourceZone: location.zone,
  })
  requestBannerScroll(location.sliderId, location.slideIndex + 1)
  if (selectSlider && getSelectorForId) {
    const selector = getSelectorForId(location.sliderId)
    if (selector) dispatch({ type: 'setUi', ui: { itemSelector: selector } })
  }
}

/** After a slide disappears, pick the next index (or previous when deleting the last). */
export function nextSlideIndexAfterDelete(deletedIndex: number, remainingCount: number) {
  if (remainingCount <= 0) return 0
  if (deletedIndex < remainingCount) return deletedIndex
  return remainingCount - 1
}
