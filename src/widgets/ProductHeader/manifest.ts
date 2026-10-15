import type { WidgetManifest } from '@/lib/theme-engine/types'

export const productHeaderManifest: WidgetManifest = {
  id: 'ProductHeader',
  version: 1,
  label: 'Product Details Header (Contract)',
  category: 'commerce',
  capabilities: ['product.title', 'product.price', 'product.variants', 'product.purchase'],
  supportedContexts: ['product'],
  requiredData: ['title', 'price'],
  defaultProps: {
    showPrice: true,
    showAddToCart: true,
  },
  styleSlots: ['root', 'title', 'price', 'button'],
}
