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
}

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
]

export function demoFilename(asset: DemoAsset) {
  return `zyvavu-demo-${asset.id}.webp`
}
