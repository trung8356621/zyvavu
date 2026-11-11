# Effective Style defaults

Decision date: 2026-11-11. Scope: supported Theme Builder widgets and Style domains.

## Resolution order

1. A mobile control reads its explicit property first, then Tablet, then Desktop. Tablet reads its explicit property first, then Desktop. The responsive CSS follows the same media-query order and overrides inline Desktop declarations. Layout dimensions remain Desktop-only.
2. Desktop reads the widget's explicit semantic style. Legacy fields are read using the renderer's established precedence. A linked spacing shorthand provides every side at its own layer. A side override in a narrower layer only replaces that side.
3. Theme typography resolves from the selected typography preset, semantic tag and widget fallback. Button Normal resolves its selected Filled or Outline preset. Hover reads its own supported overrides and then the effective Normal appearance. A theme token remains a reference and its resolved value can change with the current theme.
4. Renderer-owned layout and media defaults supply the remaining known values. Native browser defaults and ancestor CSS can affect the final rendered value where the Style Engine emits no declaration.

The panel's effective values are read-only inputs to presentation. Widget props retain explicit overrides and existing semantic references. Changing a token updates consumers without rewriting their props. Existing catalog patterns copy authored props on insertion. The document does not track a continuing relationship to the catalog source.

## Property defaults

- **Spacing** — 0 px padding, margin and gap on an unset generic surface. Layouts with renderer-owned spacing use their documented exceptions below. Vertical margin offers top and bottom overrides. The editor displays per-side values when wider-breakpoint overrides differ. Named spacing presets retain semantic labels.
- **Dimensions** — width and height follow existing layout or Auto. Minimum Height is Auto. Container Width shows the active Section width constraint or Auto for a generic surface. The editor does not add width or height storage fields.
- **Border and radius** — None and 0 px when inactive. A visible border with unset width uses Thin. Missing unlinked side values read the applicable base border. Missing corner values use the base radius or zero. Linked mode keeps previously authored side and corner values for a later unlink. Border colors use the shared Solid-only Theme palette.
- **Background and pattern** — Transparent when unset. A configured theme color, gradient, mesh, image or video uses its existing renderer. Pattern is independently None when unset. Existing media overlay, pattern opacity and scale defaults apply when those subfeatures are enabled.
- **Effects and motion** — None for shadow, blur, animation and transform, and 100% opacity where supported. Button Hover inherits Normal when it has no separate declaration. The Animation picker keeps the existing disabled or shell-only categories.
- **Typography** — use Theme Font, Weight, Size, Line height, Letter spacing and Alignment where available. Font and size details display resolved theme values alongside semantic preset names. Letter spacing falls back to Normal. HTML tag remains independent of font overrides. CSS cascade and unsupported or unresolved browser values stay outside the stored override.
- **Media** — see widget defaults below. A missing position uses the renderer's center behavior. Media presentation remains in the existing widget fields.

## Widget defaults and exceptions

- **Heading / legacy Text / Document Title / Category Title / PostTitle** — existing tag and typography roles, with Theme Typography and independent overrides. Bound title content stays read-only.
- **Button** — the Filled preset uses Theme Primary and Background colors with a transparent border. Outline uses Theme Primary for text and its thin border, with a transparent background. A button without a Style preset follows its renderer and native element styling. Its supported Hover values can override Normal independently.
- **Image / Video** — new atom presets author 16:9 where specified. Older Image records without an aspect ratio display Auto, matching the renderer. Fit falls back to Cover and position to Center.
- **Featured Media / ItemImage / DocumentFeaturedMedia** — existing renderer and data binding. FeaturedMedia and ItemImage fall back to 16:9 and Cover. The bound image adapter retains the atom's media behavior.
- **Gallery** — existing Gallery grid props provide square, Cover, and its configured column/gap defaults. The item grid layout stays in Gallery Fields.
- **Section / Container** — Section owns its nested container. The renderer supplies vertical padding from the existing Section style or props, then the Medium fallback. An inherited container width follows Page Settings. Existing inserted presets can supply explicit surface, spacing and dimension values.
- **Columns** — grid with 24 px vertical margin and 24 px default gap. Existing gap props apply in both Canvas and frontend. Style spacing overrides can replace these values at supported breakpoints.
- **Other registered widgets** — existing style capabilities, renderer CSS and semantic props remain authoritative. Native or widget-owned CSS outside the Style Engine is not inferred from the widget label.

## Reset and verification

Property clear removes the scoped key. Spacing group reset clears the active breakpoint's spacing. Desktop group reset leaves sibling groups and other breakpoints intact. Section Dimensions reset preserves Section vertical padding, while Spacing reset leaves Section width and height intact. Existing Puck history owns edits and resets. Background and Pattern groups remain independent.

Browser confirmation and isolated fixture save/reopen are tracked in the [owner acceptance pack](visual-builder-owner-acceptance.md). Test results and current limits are recorded in the [implementation progress log](wix-implementation-progress.md).

Remaining renderer-specific coverage includes CategoryHeader, TextBlock, CollectionLoop and HeaderAction root spacing, legacy FeaturedMedia rounding and ItemImage radius. Those values can come from inline widget styles or legacy props outside the generic Style controls. The generic defaults should not be read as measured CSS for those widgets. A full per-widget Canvas and frontend comparison still requires browser QA.
