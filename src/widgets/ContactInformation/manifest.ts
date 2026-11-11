import type { WidgetManifest } from '@/lib/theme-engine/types'
import { sampleContactEntryIds } from '@/lib/site/contact'

export const contactInformationManifest: WidgetManifest = {
  id: 'ContactInformation',
  version: 1,
  label: 'Contact Information',
  category: 'general',
  capabilities: ['site.contact'],
  supportedContexts: ['*', 'home', 'page', 'footer', 'single', 'category'],
  requiredData: ['site.contactEntries'],
  defaultProps: {
    entryIds: sampleContactEntryIds(),
    showLabels: true,
    showIcons: true,
    preset: 'vertical',
  },
  styleSlots: ['root', 'item', 'label', 'value'],
}
