/**
 * Centralized Overlay Layers Policy
 * Defines clear, non-conflicting z-index hierarchy for Zyvavu Admin and Theme Builder overlays.
 *
 * Hierarchy:
 * Editor Canvas (1)
 *   < Top Toolbar (20)
 *   < Style Modal (1050)
 *   < Nested Palette Modal (1150)
 *   < Active Dropdown / Combobox Popover (1250)
 *   < Notifications / Tooltips (1500)
 */
export const ADMIN_OVERLAY_LAYERS = {
  CANVAS: 1,
  TOOLBAR: 20,
  STYLE_MODAL: 1050,
  PALETTE_MODAL: 1150,
  ACTIVE_DROPDOWN: 1250,
  FRONTEND_TOOLBAR: 1400,
  NOTIFICATIONS: 1500,
} as const

export type AdminOverlayLayer = keyof typeof ADMIN_OVERLAY_LAYERS
