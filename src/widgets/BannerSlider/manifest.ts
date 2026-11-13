import type { WidgetManifest } from '@/lib/theme-engine/types'

export const bannerSliderManifest: WidgetManifest = {
  id: 'BannerSlider',
  version: 1,
  label: 'Banner Slider',
  category: 'layout',
  capabilities: ['layout.slider', 'media.carousel'],
  supportedContexts: ['*'],
  defaultProps: {
    slidesPerView: 1,
    autoplay: true,
    intervalMs: 5000,
    loop: true,
    showArrows: true,
    showPagination: true,
    paginationMode: 'dots',
    controlsStyle: {
      arrows: {
        background: { mode: 'color', colorToken: 'surface' },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
        radius: { radiusToken: 'full' },
        spacing: { padding: { token: 'sm' } },
      },
      pagination: {
        spacing: { gapToken: 'sm', padding: { token: 'sm' } },
        colorToken: 'primary',
      },
    },
  },
  // Root has no user Style panel; Banner Item / arrows / pagination use Style Targets.
  styleSlots: ['bannerItem', 'arrows', 'pagination'],
}
