# Atom and Theme architecture

Status: implementation pending owner browser acceptance. No database migration.

## Registry and rendering

Heading, Text, Button and Image are independent presentation widgets registered in the existing manifest, Puck and frontend registries. `src/widgets/atoms` shares presentation with DocumentTitle, DocumentDate, DocumentCategory, DocumentFeaturedMedia, CategoryTitle and CategoryDescription. System descriptors are defined in `widget-contracts.ts`; binding and role are fixed, validated at JSON import and template/pattern mutation boundaries, and resolved by renderer type rather than user-supplied content. Date preserves the existing updatedAt/createdAt preference. Categories display resolved relationship titles, not arbitrary objects.

All use the existing style serializer, surface, tokens, capability filtering and transactional preview store. Legacy widget IDs, props, renderers and behavior remain unchanged, including TextBlock composite, PostMeta, CategoryHeader, FeaturedMedia, PostContent and CollectionLoop. There is no new Style Engine. New system blocks coexist with legacy composite instances; no automatic split or replacement occurs.

Settings has four distinct functional shells; Link has one shared shell. Host React state owns identity/type/anchor; these shells never dispatch Puck document changes. Selection changes dismiss stale shells; close restores toolbar focus. Detailed settings, destinations, SEO and navigation are deferred. Button Atom renders an inert native button on Public; Mantine/Payload remain the Admin control libraries.

## Library and patterns

Blocks contains system-source presentation patterns and ordinary widgets. Theme is a Puck top-level plugin for single/page/category only, grouped by fixed data role. Each system block has canonical role-specific patterns, backed by the same engine. My Patterns is a standalone Mantine modal launched from Blocks. JSON is canonical, simple previews render actual DOM, complex previews retain individual WebP infrastructure. No capture automation was run.

Hover applies only a temporary compatible style through stylePreviewStore; mouse leave, selection change and unmount clear it. Click applies compatible presentation or inserts a new instance. Pattern compatibility rejects cross-binding system replacements and composite subtree replacements. Apply whitelists presentation fields and preserves IDs, content, bindings, roles and children. Preflight validation runs before setData; native role permissions disable insert/duplicate when occupied. No schema, API, credentials, URL or publish changes.

## Template contracts and legacy compatibility

A shared traversal visits inline Slots and legacy zones. Single/page title and content roles, and Category title/content roles, are enforced with an explicit `metadata.roleContract: 1`. `createRoleTemplate` produces complete new strict templates. The editor offers an explicit Enable required title/content roles action; it validates the current document before opting in and does not replace any widgets. Contract downgrade is rejected against the previous document.

Legacy documents without this marker retain existing missing-role/duplicate baselines, cannot lose existing required roles or add duplicates, and can continue style edits. CategoryHeader and RecentPosts supply compatibility roles; strict Category requires CollectionLoop. Legacy Category is never silently converted. Existing document-content requirements remain. Home has no required system blocks and its missing explicit H1 diagnostic is advisory. Header and Footer stay outside page role contracts. Stored validation failures are surfaced instead of silently selecting another theme template.

Both zone and inline representations remain readable; the approved root DropZone exception is preserved. No bundled JSON or stored records were rewritten. Stored development DB content was not inspected or mutated. Existing ID/lock behavior is preserved, with lock validation extended to inline descendants.

## Custom Meta technical debt — deferred

No Custom Meta widget, placeholder, picker, schema, API, fake source or type-mask engine is implemented.

Dependencies: CMS must first provide a verified official Custom Meta capability, typed data-source contract, access rules and media resolution. Schema/API decisions remain open until that exists.

Deferred design: an independent widget retains its own identity and configures `metaKey` plus `displayAs` (Heading/Text/Button/Image). `displayAs` is a presentation mask, never a database type. Only Custom Meta needs this mask. Reuse the four Atom renderers and existing Style Engine.

Future acceptance: resolve authorized typed values; handle missing/unsupported values without stringifying objects; verify each displayAs renderer, editor/SSR parity and pattern preservation; specify media and rich values explicitly; test access boundaries and migration compatibility. Reopen only after the data contract is verified and implementation is authorized.

## Owner acceptance checklist

- Four Atom Settings icons open distinct titled draggable shells; Link opens one shared shell.
- Selection, keyboard focus, Escape, modal surfaces and stacking work at desktop/mobile sizes; open/close leaves Undo unchanged.
- Dynamic content cannot be overridden through sidebar, pattern import or save; independent Date/Category styles persist.
- Theme appears only for single/page/category and groups patterns by data role. My Patterns opens in a modal from Blocks.
- Hover changes canvas temporarily and never marks the document dirty; click applies/inserts once. Unique blocks cannot duplicate.
- Legacy inline/zone templates, PostMeta, CategoryHeader/RecentPosts and published pages retain behavior. Explicit upgrade reports missing/incompatible roles without replacing content.
- Complex WebP thumbnails, media loading and browser console remain NOT VERIFIED until owner inspection.

Environment: audit workspace is D:/workspace-2026/zyvavu. The documented D:/zyvavu path was absent; no services were started or restarted.

## Verification record

Focused unit results across runs: canonical Pattern V1 16/16, CollectionLoop 4/4, theme engine 14/14, mandatory Section architecture 18/18, Atom architecture 14/14, host Settings/Link isolation 4/4, and library category/insertion/permission/role-hover tests 4 passing. The new standalone My Patterns assertion was changed to await Mantine portal mounting; its follow-up run could not collect because the concurrent build cleared the temporary Vite cache under .next. It is NOT VERIFIED, and no further environment retry was performed.

TypeScript found test-boundary typing issues (Puck root props and unsupported Testing Library exact options); these were corrected. Final TypeScript status is reported in the implementation handoff.

Scoped lint retains one existing PuckHost set-state-in-effect error at the document synchronization effect, confirmed present at HEAD; the new memoization finding was fixed. Existing warnings remain. git diff --check passed.

Production build was stopped after repeated unchanged output at Creating an optimized production build, under the execution guard. No successful build or browser acceptance is claimed. Initial Vitest sandbox temp EPERM was avoided using an ignored local temp directory; build/cache contention affected the last test attempt. No browser automation, migrations, database mutations, services, commits or pushes were performed.
