'use client'

import React, { useEffect, useRef } from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import { BannerSliderView } from './BannerSliderView'
import { normalizeSlidesPerView } from './normalize-slides-per-view'
import {
  getBannerActiveSlide,
  requestBannerScroll,
  setBannerActiveSlide,
} from './active-slide-store'
import { nextSlideIndexAfterDelete } from './banner-slide-ops'
import type { BannerSliderProps } from './frontend'

const usePuck = createUsePuck()
const EMPTY_SLIDE_IDS: string[] = []
const slideIdsSnapshotCache = new Map<string, string[]>()

function sameSlideIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/** Stable getSnapshot result for usePuck/useSyncExternalStore (no new [] each read). */
function readCachedSlideIds(cacheKey: string, next: string[]) {
  const prev = slideIdsSnapshotCache.get(cacheKey) || EMPTY_SLIDE_IDS
  if (sameSlideIds(prev, next)) return prev
  const stable = next.length ? next : EMPTY_SLIDE_IDS
  slideIdsSnapshotCache.set(cacheKey, stable)
  return stable
}

function safeGetItemById(getItemById: ((id: string) => any) | undefined, id: string) {
  if (!getItemById || !id) return null
  try {
    return getItemById(id) ?? null
  } catch {
    return null
  }
}

function BannerSliderEditorHost({
  id,
  autoplay,
  intervalMs,
  loop,
  showArrows,
  showPagination,
  paginationMode,
  slidesPerView,
  controlsStyle,
  slides: Slides,
}: BannerSliderProps & { id?: string; slides?: React.ComponentType<any> }) {
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const dispatch = usePuck((s) => s.dispatch)
  const zoneKey = id ? `${id}:slides` : ''
  const cacheKey = id || zoneKey || 'banner-slider'
  const prevSlideIdsRef = useRef<string[]>(EMPTY_SLIDE_IDS)

  const slideIds = usePuck((s) => {
    const indexes = (s as any).appState?.indexes || (s as any).state?.indexes
    const fromIndex = zoneKey
      ? (indexes?.zones?.[zoneKey]?.contentIds as string[] | undefined)
      : undefined
    if (fromIndex) return readCachedSlideIds(cacheKey, fromIndex)
    const self = id ? safeGetItemById(s.getItemById, id) : null
    const slot = self?.props?.slides
    if (!Array.isArray(slot) || !slot.length) return readCachedSlideIds(cacheKey, EMPTY_SLIDE_IDS)
    return readCachedSlideIds(
      cacheKey,
      slot.map((item: any) => item?.props?.id).filter(Boolean) as string[],
    )
  })

  useEffect(() => {
    if (!id) return
    const prev = prevSlideIdsRef.current
    const current = getBannerActiveSlide(id)
    let index = current?.index || 0

    // Slide deleted: jump to next, or previous when the last slide was removed.
    if (prev.length > slideIds.length) {
      const deletedIndex = prev.findIndex((slideId) => !slideIds.includes(slideId))
      index = nextSlideIndexAfterDelete(
        deletedIndex >= 0 ? deletedIndex : current?.index || 0,
        slideIds.length,
      )
      if (slideIds.length === 0) {
        const selector = getSelectorForId?.(id)
        if (selector) dispatch({ type: 'setUi', ui: { itemSelector: selector } })
      } else {
        requestBannerScroll(id, index)
      }
    } else {
      index = Math.min(index, Math.max(0, slideIds.length - 1))
    }

    prevSlideIdsRef.current = slideIds
    setBannerActiveSlide(id, {
      index,
      slideId: slideIds[index],
      slideIds,
    })
  }, [dispatch, getSelectorForId, id, slideIds])

  const perView = normalizeSlidesPerView(slidesPerView)

  return (
    <BannerSliderView
      id={id}
      autoplay={autoplay}
      intervalMs={intervalMs}
      loop={loop}
      showArrows={showArrows}
      showPagination={showPagination}
      paginationMode={paginationMode}
      slidesPerView={perView}
      controlsStyle={controlsStyle}
      Slides={Slides}
      canvasMode
      slideIds={slideIds}
    />
  )
}

export const bannerSliderEditor: ComponentConfig<BannerSliderProps> = {
  label: 'Banner Slider',
  fields: {
    slidesPerView: {
      type: 'number',
      label: 'Số item hiển thị mỗi lượt',
      min: 1,
      max: 6,
    },
    autoplay: {
      type: 'radio',
      label: 'Autoplay',
      options: [
        { label: 'On', value: true },
        { label: 'Off', value: false },
      ],
    },
    intervalMs: {
      type: 'number',
      label: 'Autoplay interval (ms)',
      min: 1500,
      max: 30000,
    },
    loop: {
      type: 'radio',
      label: 'Loop',
      options: [
        { label: 'On', value: true },
        { label: 'Off', value: false },
      ],
    },
    showArrows: {
      type: 'radio',
      label: 'Navigation arrows',
      options: [
        { label: 'Show', value: true },
        { label: 'Hide', value: false },
      ],
    },
    showPagination: {
      type: 'radio',
      label: 'Pagination',
      options: [
        { label: 'Show', value: true },
        { label: 'Hide', value: false },
      ],
    },
    paginationMode: {
      type: 'select',
      label: 'Pagination mode',
      options: [
        { label: 'Dots', value: 'dots' },
        { label: 'Numbers', value: 'numbers' },
      ],
    },
    slides: {
      type: 'slot',
      allow: ['SlideItem'],
    },
  },
  defaultProps: {
    slidesPerView: 1,
    autoplay: true,
    intervalMs: 5000,
    loop: true,
    showArrows: true,
    showPagination: true,
    paginationMode: 'dots',
  },
  resolveData: async ({ props }) => ({
    props: {
      ...props,
      slidesPerView: normalizeSlidesPerView(
        (props as { slidesPerView?: number | null }).slidesPerView,
      ),
    },
  }),
  render: (props) => <BannerSliderEditorHost {...props} />,
}
