# Theme Capability Assessment (Stage 0)

Stage 0 is Zyvavu MCP’s read-only Theme Factory gate. Clients interpret natural language, then submit structured requirements. The server classifies them against verified registries and applies explicit owner decisions. It does not call an LLM, write themes/templates, or implement widgets.

## Contract

- Schema: `assessmentSchemaVersion = 1`
- Tools: `zyvavu_get_capability_snapshot`, `zyvavu_assess_theme_requirements`, `zyvavu_validate_capability_assessment`, `zyvavu_resolve_capability_assessment`
- Resource: `zyvavu://catalog/capability-snapshot`
- Statuses: `SUPPORTED` | `COMPOSABLE` | `MISSING` | `UNSUPPORTED`
- Decisions: `REUSE` | `BUILD` | `DEFER` | `REJECT` (stored separately from detection; `decision` starts as `null`)
- Readiness: `READY` | `READY_WITH_DEFERRED` | `BLOCKED`

`BUILD` records approval for a later coding task. It does not implement code and does not alone clear `BLOCKED`. `DEFER` never becomes `BUILD` unless the owner submits an explicit decision.

## Report sections

Assessment markdown always includes:

A. Website requirements  
B. Existing capabilities (verified snapshot)  
C. Requirements satisfied by composition  
D. Missing widgets/capabilities  
E. Unsupported backend dependencies  
F. Proposed implementation priority  
G. Owner decision table  
H. Readiness for Theme Customize / Builder  

## Example (corporate brief)

```json
{
  "themeRequest": "Corporate site with Home, About, Services, Contact, Header/Footer, Blog, responsive layout, contact form",
  "requirements": [
    { "id": "home", "description": "Home", "intent": "site.home" },
    { "id": "about", "description": "About", "intent": "site.about" },
    { "id": "services", "description": "Services", "intent": "site.services" },
    { "id": "contact-page", "description": "Contact page", "intent": "site.contact" },
    { "id": "header", "description": "Header", "intent": "chrome.header" },
    { "id": "footer", "description": "Footer", "intent": "chrome.footer" },
    { "id": "blog", "description": "Blog", "intent": "content.blog" },
    { "id": "responsive", "description": "Responsive", "intent": "layout.responsive" },
    { "id": "contact-form", "description": "Contact form", "intent": "form.contact" }
  ]
}
```

Verified outcome on current source: most intents are `SUPPORTED`/`COMPOSABLE`; `form.contact` is `MISSING` (`widget:ContactForm` absent). Overall readiness stays `BLOCKED` until the owner `DEFER`s or otherwise resolves that required gap. `data.products` remains `UNSUPPORTED` while `isProductSchemaSupported()` is false.

List-widget intents: `ui.banner-slider` and `ui.animated-counter` are `SUPPORTED` when `BannerSlider`/`SlideItem`/`AnimatedCounter` are registered. `ui.countdown-timer` stays `MISSING` and must **not** inherit support from Animated Counter (count-up only). Snapshot `knownGaps.countdownTimerWidget` mirrors that gap.

## Stage boundaries

- Stage 0: capability facts + assessment + decisions + readiness gate
- Stage 1 Theme Customize: only after `READY` or `READY_WITH_DEFERRED`
- Stage 2 Theme Builder: same gate; document generation is out of Stage 0

Future Model API clients can reuse the same JSON schemas, stable requirement IDs, error codes, and readiness enum without conversational state or a provider-specific contract.
