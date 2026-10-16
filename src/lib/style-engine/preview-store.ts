'use client'

import React from 'react'
import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'

/**
 * StylePreviewStore
 *
 * External subscriber store for live style previews in Puck canvas.
 * Allows Style Editors (Context Menu, Palette Modal) to transiently override
 * widget styles on the canvas in real time without mutating Puck document history
 * via repeated dispatch(setData) calls.
 */
class StylePreviewStore {
  private previews: Map<string, WidgetSemanticStyle> = new Map()
  private listeners: Set<() => void> = new Set()

  /**
   * Set or update temporary preview style for a widget.
   */
  setPreview(componentId: string, style: WidgetSemanticStyle | null) {
    if (!componentId) return
    if (!style) {
      if (this.previews.has(componentId)) {
        this.previews.delete(componentId)
        this.notify()
      }
    } else {
      this.previews.set(componentId, style)
      this.notify()
    }
  }

  /**
   * Clear preview for a specific widget or all widgets.
   */
  clearPreview(componentId?: string) {
    if (componentId) {
      if (this.previews.has(componentId)) {
        this.previews.delete(componentId)
        this.notify()
      }
    } else {
      if (this.previews.size > 0) {
        this.previews.clear()
        this.notify()
      }
    }
  }

  /**
   * Get preview style if active, checking any possible ID alias (props.id, puck.id, etc.)
   */
  getPreview(...ids: (string | undefined | null)[]): WidgetSemanticStyle | null {
    for (const id of ids) {
      if (id && this.previews.has(id)) {
        return this.previews.get(id) || null
      }
    }
    return null
  }

  /**
   * Subscribe to store changes.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch (err) {
        console.error('[StylePreviewStore] Listener error:', err)
      }
    })
  }
}

export const stylePreviewStore = new StylePreviewStore()

/**
 * React hook to subscribe to live preview styles for a widget.
 * If a preview style exists in stylePreviewStore, returns it.
 * Otherwise returns null (widget falls back to its committed style).
 */
export function useWidgetPreviewStyle(...ids: (string | undefined | null)[]): WidgetSemanticStyle | null {
  return React.useSyncExternalStore(
    (onStoreChange) => stylePreviewStore.subscribe(onStoreChange),
    () => stylePreviewStore.getPreview(...ids),
    () => null, // SSR fallback
  )
}
