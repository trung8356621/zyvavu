---
name: cms-theme-engine
description: Use to implement reusable B2B Traditional and Modern Profile themes, design tokens, motion or component patterns.
---
# Theme Engine
Source: https://docs.google.com/document/d/1SOW7UdS1ojrU5LJozS3K-k4xvtNHFE4P1nFc7YF9fEM/edit
CONFIRMED:
- Core + Traditional/Modern theme + optional Product module.
- theme.json presets only bounded visual tokens/variants, never executable UI language.
- Traditional B2B information-dense; Modern profile contemporary and quick to deploy, not generic dark SaaS.
- CSS-first animations; WAAPI if needed; Canvas/WebGL/WebGPU only for actual visual graphics; reduced-motion fallback.
- SVG custom Zalo icon mandatory. DOM semantic HTML for product card and links.
PROPOSED:
- shadcn/ui and Embla are candidates, not permanently selected. Shared versioned components may help centrally update themes.
DON'T:
- Build a universal page builder, animate complex layout on each frame, clone carousel nodes forever, turn all HTML into Canvas.
VERIFY:
- Theme data schema, perf budget, library versions/licenses, mobile behavior, design differentiation and real device tests.
Cross-check decisions document DEC-ANIM-001 and DEC-UI-001.
