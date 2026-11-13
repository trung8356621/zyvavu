# Puck proposal contract

Schema version 1 accepts the native `ThemeTemplateDocument` shape. Supply `version: 1`, `template`, `root` and `content`. Page settings can go in `root.props.pageSettings`. The supported metadata field is `metadata.roleContract: 1`, which opts into application role requirements. Widget props carry content, bindings, style overrides, links and media. Unspecified props retain application behavior. Validation returns findings without rewriting the document.

```json
{
  "version": 1,
  "template": "home",
  "root": {"props": {}},
  "content": [
    {"type": "Section", "props": {"id": "hero", "content": [
      {"type": "Heading", "props": {"id": "hero-title", "text": "Engineering services", "tag": "h1", "style": {
        "typography": {"colorToken": "text"},
        "responsive": {"mobile": {"typography": {"align": "center"}}}
      }}}
    ]}}
  ]
}
```

Use Section at the root of page-content templates. Section owns its `content` slot. For multi-column layouts use Columns and the active `column1` through `column4` slots for its distribution. Legacy Puck zones use the same slot names with `<parent-id>:<slot>` keys and are accepted when each slot has one representation. Widget IDs are unique. Fixed system widgets require their registered binding and role. Item widgets require a CollectionLoop ancestor.

### Banner Slider + Animated Counter

- Compose **Section → BannerSlider → SlideItem → nested widgets**. `BannerSlider.slides` may contain only `SlideItem`. `SlideItem` is not a Library Basic.
- Banner Slider behavior props include `autoplay`, `intervalMs`, `loop`, `showArrows`, `showPagination`, `paginationMode`, and `slidesPerView` (integer 1–6; omit or default **1**; legacy documents without the field remain valid).
- Style ownership: Section outer chrome; `controlsStyle.arrows` / `controlsStyle.pagination` on the slider; Banner Item visual style on each `SlideItem.style` (margin forbidden). Editor “Banner Item” / active-slide controls select a real SlideItem id — do not invent editor-state fields on proposals.
- `AnimatedCounter` is **count-up** only. Place it in `Section.content`, Columns slots, or `SlideItem.content`. Never place it directly in `BannerSlider.slides`. Countdown Timer is a separate missing capability (`ui.countdown-timer`).
- Save proposals must still satisfy the application Save contract (for Single Post / role templates that require `document.content`). Widget Library draft insertion that auto-wraps missing PostContent is editor behavior — MCP proposals must emit a valid Puck tree.

Style overrides go in `props.style`. Use the selected theme’s color token names and typography presets. Responsive overrides live at `props.style.responsive.tablet` and `props.style.responsive.mobile`. Their supported keys are listed by style discovery. The server reports unsupported properties, invalid values, unavailable domains and mismatched contexts. Existing bundled documents can contain legacy fields outside the supported proposal subset.

Use source URLs for media. Media IDs are checked for shape only. Links are checked for syntax and protocol. Existing routes and media cannot be verified against a live CMS. Use token discovery and the widget schemas to plan the contents of each section, then submit each route and candidate Puck document to the plan validator. The validator never reserves URLs. Theme parts can be validated individually.
