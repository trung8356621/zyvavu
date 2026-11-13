type ActiveSlideState = {
  index: number
  slideId?: string
  slideIds: string[]
  /** Monotonic request so the Embla view can scroll after duplicate. */
  scrollRequest?: number
  scrollToIndex?: number
}

type Listener = (sliderId: string, state: ActiveSlideState) => void

const bySlider = new Map<string, ActiveSlideState>()
const listeners = new Set<Listener>()
let scrollRequestSeq = 0

export function setBannerActiveSlide(
  sliderId: string,
  state: Pick<ActiveSlideState, 'index' | 'slideIds'> &
    Partial<Omit<ActiveSlideState, 'index' | 'slideIds'>>,
) {
  if (!sliderId) return
  const prev = bySlider.get(sliderId)
  const next: ActiveSlideState = {
    index: state.index,
    slideId: state.slideId ?? prev?.slideId,
    slideIds: state.slideIds,
    // Preserve scroll fields unless the caller explicitly updates them (duplicate/nav).
    scrollRequest: state.scrollRequest !== undefined ? state.scrollRequest : prev?.scrollRequest,
    scrollToIndex: state.scrollToIndex !== undefined ? state.scrollToIndex : prev?.scrollToIndex,
  }
  const scrollChanged =
    state.scrollRequest !== undefined && state.scrollRequest !== prev?.scrollRequest
  if (
    prev &&
    !scrollChanged &&
    prev.index === next.index &&
    prev.slideId === next.slideId &&
    prev.slideIds.length === next.slideIds.length &&
    prev.slideIds.every((id, i) => id === next.slideIds[i])
  ) {
    return
  }
  bySlider.set(sliderId, next)
  listeners.forEach((listener) => listener(sliderId, next))
}

export function requestBannerScroll(sliderId: string, index: number) {
  if (!sliderId) return
  scrollRequestSeq += 1
  const prev = bySlider.get(sliderId) || { index: 0, slideIds: [] as string[] }
  setBannerActiveSlide(sliderId, {
    ...prev,
    scrollRequest: scrollRequestSeq,
    scrollToIndex: index,
  })
}

export function getBannerActiveSlide(sliderId: string): ActiveSlideState | undefined {
  return bySlider.get(sliderId)
}

export function subscribeBannerActiveSlide(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function clearBannerActiveSlide(sliderId: string) {
  bySlider.delete(sliderId)
}
