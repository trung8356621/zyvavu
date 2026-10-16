export const MEDIA_LIBRARY_VIEW_KEY = 'zyvavu.mediaLibrary.view'
export const MEDIA_LIBRARY_VIEW_EVENT = 'zyvavu-media-view'

export type MediaLibraryView = 'grid' | 'table'

export function readMediaLibraryView(): MediaLibraryView {
  if (typeof window === 'undefined') return 'grid'
  try {
    return window.localStorage.getItem(MEDIA_LIBRARY_VIEW_KEY) === 'table' ? 'table' : 'grid'
  } catch {
    return 'grid'
  }
}

export function getServerMediaLibraryView(): MediaLibraryView {
  return 'grid'
}

export function writeMediaLibraryView(view: MediaLibraryView): void {
  window.localStorage.setItem(MEDIA_LIBRARY_VIEW_KEY, view)
  window.dispatchEvent(new Event(MEDIA_LIBRARY_VIEW_EVENT))
}

export function subscribeMediaLibraryView(onStoreChange: () => void): () => void {
  window.addEventListener(MEDIA_LIBRARY_VIEW_EVENT, onStoreChange)
  return () => window.removeEventListener(MEDIA_LIBRARY_VIEW_EVENT, onStoreChange)
}
