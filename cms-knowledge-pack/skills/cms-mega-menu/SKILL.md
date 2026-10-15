---
name: cms-mega-menu
description: Use to build classic versus mega desktop navigation, mixed content blocks, SSR mobile links and product listings.
---
# Mega Menu
Read Mega Menu original. Respect user's explicit corrections.
## Confirmed
Desktop switch Classic (WordPress style) / Mega. Mega columns contain configurable child blocks, including ProductList; selecting category means list PRODUCTS, NOT automatically list subcategories. Manual curated categories order matters. ProductList may be pinned/auto/mixed as proposed variants; MVP exact modes not fixed.
Mobile navigation link structure is extracted from Mega data/schema, rendered actual accessible HTML SSR, then customers may rearrange parent-child order like WP editor. Source links change → regenerate/reset mobile structure per user policy; layout/image-only changes must NOT trigger reset.
## Open
Whether live ProductList product URLs are extracted into mobile menu. Avoid assuming product changes constantly reset mobile.
## Desktop Interaction Contract (Future Frontend)
- Mega Menu opens on CLICK, not hover.
- Click again closes it.
- Clicking outside or pressing Escape closes it.
- A menu parent may be trigger-only.
- An optional split-link behavior may allow parent navigation.
- Only one Mega panel is expanded at a time.
- Keyboard accessibility (tab navigation, arrow keys, Escape) and mobile touch support are required.
- Frontend rendering will be delivered in future phase (not V1A).

## Tests
Two modes, no-JS SSR links, block rendering, category query correctly product, link fingerprint excludes purely visual changes, flexible right sidebar/fullscreen mobile, desktop fallback and performance.
Source https://docs.google.com/document/d/1CZQ0d9y3xGZBlkbz3eJ9BrKqw7t_xGsEAKVGbp768Tk/edit
