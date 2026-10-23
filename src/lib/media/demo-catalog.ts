export type DemoAsset = {
  id: string
  kind: 'image' | 'video'
  label: string
  category: string
  sourceIdentity: string
  sourcePage: string
  sourceURL: string
  thumbnailURL: string
  credit: string
  license: string
  licenseURL: string
  verifiedOn: string
  posterAssetId?: string
}

const UNSPLASH_IMAGES = [
  ['1618005182384-a83a8bd57fbe', 'Modern Minimal', 'Abstract / Texture', 'Milad Fakurian'],
  ['1600585154340-be6161a56a0c', 'Subtle Texture', 'Minimal / Neutral', 'R Architecture'],
  ['1550684848-fac1c5b4e853', 'Dark Gradient Wave', 'Hero Background', 'Dynamic Wang'],
  ['1600596542815-ffad4c1539a9', 'Warm Architectural', 'Architecture', 'R Architecture'],
  ['1448375240586-882707db888b', 'Forest Mist', 'Nature', 'Unsplash'],
  ['1579546929518-9e396f3cc809', 'Abstract Blur', 'Abstract / Texture', 'Kseniya Lapteva'],
  ['1497366216548-37526070297c', 'Office interior', 'Business / Corporate', 'Unsplash'],
  ['1497366811353-6870744d04b2', 'Shared workspace', 'Business / Corporate', 'Unsplash'],
  ['1521737711867-e3b97375f902', 'Team workspace', 'Business / Corporate', 'Unsplash'],
  ['1486406146926-c627a92ad1ab', 'Glass towers', 'Architecture', 'Unsplash'],
  ['1518770660439-4636190af475', 'Circuit board', 'Technology', 'Unsplash'],
  ['1519389950473-47ba0277781c', 'Collaborative technology', 'Technology', 'Unsplash'],
  ['1451187580459-43490279c0fa', 'Connected planet', 'Technology', 'Unsplash'],
  ['1464822759023-fed622ff2c3b', 'Mountain summit', 'Nature', 'Unsplash'],
  ['1470770841072-f978cf4d019e', 'Lakeside landscape', 'Nature', 'Unsplash'],
  ['1441974231531-c6227db76b6e', 'Sunlit forest', 'Nature', 'Unsplash'],
  ['1500534623283-312aade485b7', 'Open landscape', 'Hero Background', 'Unsplash'],
  ['1511818966892-d7d671e672a2', 'Architectural lines', 'Architecture', 'Unsplash'],
  ['1487958449943-2429e8be8625', 'Modern facade', 'Architecture', 'Unsplash'],
  ['1495474472287-4d71bcdd2085', 'Coffee ritual', 'Lifestyle', 'Unsplash'],
  ['1509042239860-f550ce710b93', 'Morning coffee', 'Lifestyle', 'Unsplash'],
  ['1511988617509-a57c8a288659', 'Everyday moments', 'Lifestyle', 'Unsplash'],
  ['1490645935967-10de6ba17061', 'Fresh ingredients', 'Food', 'Unsplash'],
  ['1504674900247-0877df9cc836', 'Dinner table', 'Food', 'Unsplash'],
  ['1540189549336-e6e99c3679fe', 'Colorful salad', 'Food', 'Unsplash'],
  ['1557682250-33bd709cbe85', 'Soft color field', 'Abstract / Texture', 'Unsplash'],
  ['1557683316-973673baf926', 'Gradient texture', 'Abstract / Texture', 'Unsplash'],
  ['1518837695005-2083093ee35b', 'Ocean horizon', 'Hero Background', 'Unsplash'],
  ['1469474968028-56623f02e42e', 'Mountain light', 'Hero Background', 'Unsplash'],
  ['1494438639946-1ebd1d20bf85', 'Quiet interior', 'Minimal / Neutral', 'Unsplash'],
  ['1496062031456-07b8f162a322', 'Flower garden', 'Nature', 'Unsplash'],
] as const

export const CURATED_DEMO_IMAGES: readonly DemoAsset[] = UNSPLASH_IMAGES.map(
  ([photo, label, category, credit]) => ({
    id: `unsplash-${photo}`,
    kind: 'image',
    label,
    category,
    sourceIdentity: `Unsplash:photo-${photo}`,
    sourcePage: `https://images.unsplash.com/photo-${photo}`,
    sourceURL: `https://images.unsplash.com/photo-${photo}?auto=format&fit=max&w=1600&q=85`,
    thumbnailURL: `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=320&q=70`,
    credit,
    license: 'Unsplash License',
    licenseURL: 'https://unsplash.com/license',
    verifiedOn: '2026-10-23',
  }),
)

// Only individually reviewed assets belong here. No random URLs or stock API calls.
export const DEMO_MEDIA: readonly DemoAsset[] = [
  {
    id: 'nasa-blue-marble-v1',
    kind: 'image',
    label: 'Blue Marble',
    category: 'Nature / Space',
    sourceIdentity: 'NASA:AS17-148-22727',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg',
    sourceURL:
      'https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg',
    thumbnailURL:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/250px-The_Earth_seen_from_Apollo_17.jpg',
    credit: 'NASA / Apollo 17 crew',
    license: 'Public domain (US government work)',
    licenseURL: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    verifiedOn: '2026-10-22',
  },
  {
    id: 'nasa-earthrise-v1',
    kind: 'image',
    label: 'Earthrise',
    category: 'Nature / Space',
    sourceIdentity: 'NASA:AS08-14-2383',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:NASA-Apollo8-Dec24-Earthrise.jpg',
    sourceURL:
      'https://upload.wikimedia.org/wikipedia/commons/a/a8/NASA-Apollo8-Dec24-Earthrise.jpg',
    thumbnailURL:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/NASA-Apollo8-Dec24-Earthrise.jpg/250px-NASA-Apollo8-Dec24-Earthrise.jpg',
    credit: 'NASA / Bill Anders',
    license: 'Public domain (US government work)',
    licenseURL: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    verifiedOn: '2026-10-22',
  },
  ...CURATED_DEMO_IMAGES,
  {
    id: 'mdn-flower-v1',
    kind: 'video',
    label: 'Flowers in the breeze',
    category: 'Nature',
    sourceIdentity: 'MDN:cc0-videos/flower.mp4',
    sourcePage:
      'https://github.com/mdn/interactive-examples/blob/main/live-examples/media/cc0-videos/flower.mp4',
    sourceURL: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnailURL:
      'https://images.unsplash.com/photo-1496062031456-07b8f162a322?auto=format&fit=crop&w=320&q=70',
    posterAssetId: 'unsplash-1496062031456-07b8f162a322',
    credit: 'MDN contributors; illustrative poster from Unsplash',
    license: 'CC0 1.0 (video); Unsplash License (poster)',
    licenseURL: 'https://github.com/mdn/interactive-examples/blob/main/LICENSE',
    verifiedOn: '2026-10-23',
  },
]

export function demoFilename(asset: DemoAsset) {
  return `zyvavu-demo-${asset.id}.${asset.kind === 'video' ? 'mp4' : 'webp'}`
}
