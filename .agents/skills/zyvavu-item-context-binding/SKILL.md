---
name: zyvavu-item-context-binding
description: Architecture and implementation rules for Zyvavu Loop Item Templates, CollectionLoop, normalized item data, and dynamic bindings on shared Atoms.
---

# Zyvavu Item Context Binding

Canonical contract for Loop Item Templates, CollectionLoop, normalized item adapters, and dynamic bindings on **shared Atoms**. Source implementation is authoritative for exact prop names and types; this skill defines the product architecture agents must preserve.

Apply together with `zyvavu-execution-guard`, `zyvavu-token-discipline`, and `compact-coding`. Do not invent a second widget system, Style Engine, or Puck document model.

## Canonical terminology

### Collection Loop

- Repeats normalized records from a data source (posts, categories; products only when schema exists).
- Owns data source, Grid/List, columns, gap, filters/sort/limit.
- References a Loop Item Template by **stable ID** (`loopItemTemplateId`).
- Must **not** copy the template’s Puck JSON into each Collection Loop instance.

### Loop Item Template

- One reusable Puck document type: `loopItem`.
- Shared across supported content sources (posts, categories, future products) — **no** `PostLoopItem` / `ProductLoopItem` / `CategoryLoopItem`.
- Allows shared Atoms **directly at root**.
- Allows optional **user-created Containers** (e.g. Section used as Info group).
- Does **not** require a root Section Container.
- Nested `CollectionLoop` (and sibling archive repeaters) remain **disallowed**.

### Item Context Binding

- Supplies dynamic record data to existing Atoms (`textBinding`, `srcBinding`, `hrefBinding`).
- Is **not** a new widget type.
- Is **not** a visual DOM wrapper.
- Is **not** a new Style Engine.
- Is **not** a new state-management system (no Redux, no parallel store).

Key modules (authority):

- `src/lib/theme-engine/normalized-item.ts`
- `src/lib/theme-engine/item-binding.ts`
- `src/lib/theme-engine/item-context.tsx`
- `src/lib/theme-engine/loop-item-document.ts` / `loop-item-templates.ts`
- `src/widgets/CollectionLoop/*`
- `src/widgets/atoms/*`

### Technical item wrapper

- Exists only for runtime repetition/layout (e.g. card shell / item context provider).
- Has **no** independent user-facing Style controls.
- Must not silently introduce padding, background, border, radius, or other design overrides beyond what Collection Loop layout already owns.

### User-created Container

- Explicitly inserted by the user (e.g. Section / Columns).
- May group Image separately from Info content.
- Uses the **existing** Container / Style Engine.
- Is **never** mandatory for a valid Loop Item document.

## Shared Atom contract

Reuse existing Atoms only:

- Heading / Text
- Image
- Button
- Media (Image / Video in this codebase)

Do **not** create new authoring widgets such as:

- ItemTitle, ItemImage, ItemExcerpt, ItemLink, ItemDate
- Other Item-specific duplicate Atoms

Binding properties (exact names from source):

| Prop | Typical use |
|---|---|
| `textBinding` | Title, excerpt, slug, taxonomy, date |
| `srcBinding` | Thumbnail / media |
| `hrefBinding` | Item URL |

Conceptual normalized fields (`NormalizedItem`):

`id`, `type`, `title`, `excerpt`, `thumbnail`, `url`, `slug`, `taxonomy`, `date`

Missing or unsupported data:

- Resolve to **null**.
- Render **no** frontend element for that bound Atom.
- Do not invent fake URLs (`#`), empty placeholders, or reserved blank spacing.
- Parent Container / siblings remain intact.

Taxonomy is optional. Do not split Loop Item into post/product/category-specific template families.

Product adapters stay disabled until a real Products schema exists (`isProductSchemaSupported()`).

## Editor contract

Dynamic binding controls **CONTENT**, not **STYLE**.

When an Atom is dynamically bound:

- Show resolved **fixture** data on the Canvas (editor preview only).
- Disable direct editing of the **bound** field (Settings + inline edit).
- Preserve normal Atom Style controls.
- Preserve HTML Tag and responsive / media presentation controls.
- Preserve unrelated **static** properties.

Example: Button with `hrefBinding=url` must still allow editing the static label (e.g. `Xem chi tiết`).

Static → Dynamic → Static:

- Preserve the original static draft value in props.
- Never clear static content merely because a binding was selected.
- Never persist fixture preview content as real Atom props.

Puck remains source of truth for document, selection, history, Undo/Redo.

Reuse existing Style Engine and Cancel/Reset / transactional preview — do not fork a Loop-Item-only style path.

Atom Settings must use Puck `resolveFields` (or equivalent) to hide superseded static editors while bindings are active (`applyBindingFieldVisibility`).

## Default Loop Item structure (new templates only)

Recommended **default for newly created** Loop Item documents (`createEmptyLoopItemDocument`):

```text
Loop Item
├── Image Atom
│   └── srcBinding: thumbnail
│
└── Container: Info (optional Section; verticalPadding none)
    ├── Heading Atom → textBinding: title
    ├── Text Atom → textBinding: excerpt
    └── Button Atom → static label "Xem chi tiết" + hrefBinding: url
```

This is a default example only. Users may remove, reorder, or redesign freely.

Do **not** enforce this structure through validation.

Updating the factory affects **new** creates only — never silently rewrite persisted documents.

## Collection Loop integration

- New instances: select `loopItemTemplateId` (shared reference).
- Query once per Collection Loop render; load the Loop Item Template once; repeat with per-item context.
- Legacy inline `itemTemplate` slot may still exist for older documents; do not invent a long-term second authoring mode.
- Do not auto-rewrite stored Home/Category documents.

## Legacy compatibility

Legacy Item* widgets must **not** appear in new Widget Library authoring.

However:

- Preserve frontend rendering when existing documents still reference Item*.
- Do not automatically rewrite persisted Puck JSON.
- Do not delete legacy records by display name.
- Do not bulk-convert templates.

Before changing **any** stored document, verify:

1. Exact `themeId`
2. Template type (`loopItem` or page context)
3. Document / Loop Item ID (storage key identity)
4. Current Puck JSON structure
5. CollectionLoop references (`loopItemTemplateId`)

Never identify a document by display name alone (`post-item`, `Article Card`, etc.).

**Source cleanup** and **database / persisted-document cleanup** are separate tasks. Require explicit owner approval for persisted mutations.

## Persistence keys (reference)

- Index: `theme_loop_items_${themeId}`
- Document: `theme_template_${themeId}_loopItem_${id}`
- Editor URL: `/admin/theme-builder?theme=…&template=loopItem&loopItem=<id>`

Create flow opens the new template in a **new tab** by ID; the original Theme Builder tab keeps its state.

## Agent stop conditions (architecture)

STOP_AND_ASK before:

- Adding Item*-style duplicate Atoms or a second binding/style system
- Requiring root Section for `loopItem`
- Copying Loop Item Puck JSON into Collection Loop instances
- Auto-migrating or deleting templates by name
- Enabling Product bindings without a real Products schema
- Nested CollectionLoop inside Loop Item Templates

## Related skills

- `.agents/skills/zyvavu-execution-guard/SKILL.md`
- `.agents/skills/zyvavu-token-discipline/SKILL.md`
- `.agents/skills/compact-coding/SKILL.md`
- `cms-knowledge-pack/skills/cms-admin-design/SKILL.md` (Admin UI only)
