# Style Engine — deferred stabilization issues

Recorded separately from the approved feature expansion. No fixes to these issues are claimed.

- **Color: surface synchronization**: owner-reported palette/style synchronization issue. Preserve for the UI audit; no hardcoded HEX workaround added.
- **Resolved in editor stabilization — default currentStyle reference**: a direct test that omitted currentStyle from WidgetStyleContextMenu repeatedly reset draft state when the component rerendered. Production PuckHost supplies a stable currentStyle snapshot; the nested-overlay test now uses that same contract. The stabilization batch now uses an immutable default and a keyed editing session. Drafts no longer reset on equivalent parent object allocations; see editor-stability-and-dropzone-plan.md.
- **Existing lint findings**: baseline/current comparison confirms the same seven error-level rules in PuckHost (refs, set-state-in-effect, preserve-manual-memoization), WidgetStyleContextMenu (two set-state-in-effect), and Section editor (two rules-of-hooks). New components and tests pass scoped lint. No broad lint cleanup performed.
- **Generated types worktree status**: src/payload-types.ts was already marked modified before this task. Preserved and excluded from feature work.
- **Manual visual acceptance pending**: 1366x768 at 75% zoom, floating panel placement, keyboard/focus, dropdown stacking, light ActionBar, media surfaces and real animation timing. No browser automation or screenshot claim.

Intentionally incomplete features (not regressions): Button Style is a clearly labeled, non-persisted shell; Scroll Fade is disabled; responsive hide/stack controls and the five unwired renderers listed in the component registry do not advertise active styling.

Editor stabilization supersedes the earlier lint snapshot for touched files: AnimationPresetPicker, SharedDraggableModal and the registry have no lint errors; PuckHost and WidgetStyleContextMenu each retain one pre-existing set-state-in-effect finding. Section editor is unchanged in stabilization. Real-browser media/network and layout acceptance remain pending.
