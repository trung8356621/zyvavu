import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callTool } from './tools'
import {
  assessThemeRequirements,
  getCapabilitySnapshot,
  resolveCapabilityAssessment,
  validateCapabilityAssessment,
} from './stage0'

const themeRequest = `Create a corporate website with:
- Home
- About
- Services
- Contact
- Header/Footer
- Blog
- Responsive layout
- Contact form`

function corporateRequirements() {
  return [
    { id: 'home', description: 'Home page', intent: 'site.home', priority: 'required' as const },
    { id: 'about', description: 'About page', intent: 'site.about', priority: 'required' as const },
    { id: 'services', description: 'Services page', intent: 'site.services', priority: 'required' as const },
    { id: 'contact-page', description: 'Contact page', intent: 'site.contact', priority: 'required' as const },
    { id: 'header', description: 'Header', intent: 'chrome.header', priority: 'required' as const },
    { id: 'footer', description: 'Footer', intent: 'chrome.footer', priority: 'required' as const },
    { id: 'blog', description: 'Blog', intent: 'content.blog', priority: 'required' as const },
    { id: 'responsive', description: 'Responsive layout', intent: 'layout.responsive', priority: 'required' as const },
    { id: 'contact-form', description: 'Contact form', intent: 'form.contact', priority: 'required' as const },
  ]
}

test('A. supported widget/context detection', () => {
  const snapshot = getCapabilitySnapshot()
  assert(snapshot.widgets.some((widget: { type: string }) => widget.type === 'Section'))
  assert(snapshot.contexts.some((entry: { context: string }) => entry.context === 'home'))
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Home only',
    requirements: [{ id: 'home', description: 'Home', intent: 'site.home' }],
  })
  assert.equal(assessment.requirements[0].status, 'SUPPORTED')
  assert.equal(assessment.requirements[0].evidence, 'verified')
})

test('B. reusable Atom composition', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Product card UI',
    requirements: [{ id: 'product-card', description: 'Product card', intent: 'ui.product-card' }],
  })
  assert.equal(assessment.requirements[0].status, 'COMPOSABLE')
  assert(assessment.requirements[0].existingCapabilities.some((value) => value.startsWith('atom:')))
})

test('C. missing widget classification', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Contact form',
    requirements: [{ id: 'contact-form', description: 'Contact form', intent: 'form.contact' }],
  })
  assert.equal(assessment.requirements[0].status, 'MISSING')
  assert(assessment.requirements[0].missingDependencies.includes('widget:ContactForm'))
})

test('D/E. unsupported backend / product source absent', () => {
  const snapshot = getCapabilitySnapshot()
  assert.equal(snapshot.dataSources.products.status, 'UNSUPPORTED')
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Products catalog',
    requirements: [{ id: 'products', description: 'Live products', intent: 'data.products' }],
  })
  assert.equal(assessment.requirements[0].status, 'UNSUPPORTED')
  assert(assessment.requirements[0].missingDependencies.includes('collection:products'))
})

test('F. dynamic binding capability', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Bindings',
    requirements: [{ id: 'bindings', description: 'Item bindings', intent: 'binding.item' }],
  })
  assert.equal(assessment.requirements[0].status, 'SUPPORTED')
  assert(assessment.requirements[0].existingCapabilities.includes('binding:textBinding'))
})

test('G. loop item policy', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Loop item',
    requirements: [{ id: 'loop-item', description: 'Loop Item Template', intent: 'template.loop-item' }],
  })
  assert.equal(assessment.requirements[0].status, 'SUPPORTED')
  assert(assessment.requirements[0].existingCapabilities.includes('context:loopItem'))
})

test('H. stable assessment schema', () => {
  const first = assessThemeRequirements({ themeRequest, requirements: corporateRequirements() })
  const second = assessThemeRequirements({ themeRequest, requirements: corporateRequirements() })
  assert.equal(first.assessment.schemaVersion, 1)
  assert.equal(first.assessment.assessmentId, second.assessment.assessmentId)
  assert.equal(first.assessment.capabilitySnapshotId, second.assessment.capabilitySnapshotId)
  assert.match(first.reportMarkdown, /# Theme Capability Assessment/)
})

test('I. invalid assessment rejection', () => {
  assert.throws(
    () => validateCapabilityAssessment({ assessment: { schemaVersion: 1 } }),
    /INVALID_ARGUMENTS|Assessment document is invalid/,
  )
})

test('J. owner decision validation', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Unknown feature',
    requirements: [{ id: 'mystery', description: 'Something unspecified' }],
  })
  assert.equal(assessment.requirements[0].status, 'MISSING')
  assert.equal(assessment.requirements[0].existingCapabilities.length, 0)
  assert.throws(
    () => resolveCapabilityAssessment({
      assessment,
      decisions: [{ requirementId: 'mystery', decision: 'REUSE' }],
    }),
    (error: Error) => /REUSE is invalid/.test(error.message),
  )
  const reusedForm = resolveCapabilityAssessment({
    assessment: assessThemeRequirements({
      themeRequest: 'Form',
      requirements: [{ id: 'contact-form', description: 'Contact form', intent: 'form.contact' }],
    }).assessment,
    decisions: [{ requirementId: 'contact-form', decision: 'REUSE', note: 'Use ContactInformation only' }],
  })
  assert.equal(reusedForm.assessment.requirements[0].decision, 'REUSE')
})

test('K. DEFER cannot become BUILD implicitly', () => {
  const { assessment } = assessThemeRequirements({
    themeRequest: 'Form',
    requirements: [{ id: 'contact-form', description: 'Contact form', intent: 'form.contact' }],
  })
  const deferred = resolveCapabilityAssessment({
    assessment,
    decisions: [{ requirementId: 'contact-form', decision: 'DEFER', note: 'Ship without form' }],
  })
  assert.equal(deferred.assessment.requirements[0].decision, 'DEFER')
  const untouched = resolveCapabilityAssessment({
    assessment: deferred.assessment,
    decisions: [],
  })
  assert.equal(untouched.assessment.requirements[0].decision, 'DEFER')
  const explicit = resolveCapabilityAssessment({
    assessment: deferred.assessment,
    decisions: [{ requirementId: 'contact-form', decision: 'BUILD', note: 'Approve form later' }],
  })
  assert.equal(explicit.assessment.requirements[0].decision, 'BUILD')
})

test('L. BLOCKED cannot advance', () => {
  const { assessment, stageGate } = assessThemeRequirements({
    themeRequest,
    requirements: corporateRequirements(),
  })
  assert.equal(assessment.overallReadiness, 'BLOCKED')
  assert.equal(stageGate.canAdvanceToThemeCustomize, false)
  assert.equal(stageGate.canAdvanceToThemeBuilder, false)
  assert(assessment.unresolvedRequirements.includes('contact-form'))

  const deferred = resolveCapabilityAssessment({
    assessment,
    decisions: [{ requirementId: 'contact-form', decision: 'DEFER' }],
  })
  assert.equal(deferred.assessment.overallReadiness, 'READY_WITH_DEFERRED')
  assert.equal(deferred.stageGate.canAdvanceToThemeCustomize, true)

  const buildOnly = resolveCapabilityAssessment({
    assessment,
    decisions: [{ requirementId: 'contact-form', decision: 'BUILD' }],
  })
  assert.equal(buildOnly.assessment.overallReadiness, 'BLOCKED')
  assert.equal(buildOnly.stageGate.buildDecisionDoesNotImplement, true)
})

test('M. Phase 1 schema version remains compatible', () => {
  const snapshot = getCapabilitySnapshot()
  assert.equal(snapshot.schemaVersion, 1)
  assert(Array.isArray(snapshot.knownIntents))
  const validated = validateCapabilityAssessment({
    assessment: assessThemeRequirements({
      themeRequest: 'Home',
      requirements: [{ id: 'home', description: 'Home', intent: 'site.home' }],
    }).assessment,
  })
  assert.equal(validated.valid, true)
})

test('Single Template excludes explicitly tagged unrelated requirements and preserves scope through decisions', async () => {
  const scope = { mode: 'single', themeId: 'mcp-blog-test-2', template: 'home' } as const
  const requirements = [
    { id: 'home', description: 'Editorial home', intent: 'site.home', template: 'home' },
    { id: 'category-form', description: 'Category contact form', intent: 'form.contact', template: 'category' },
  ] as const
  const args = { themeRequest: 'Editorial template', requirements: [...requirements], scope }
  const single = await callTool('zyvavu_assess_theme_requirements', args) as ReturnType<typeof assessThemeRequirements>
  assert.deepEqual(single.assessment.scope, scope)
  assert.deepEqual(single.excludedRequirementIds, ['category-form'])
  assert.equal(single.stageGate.canAdvanceToThemeBuilder, true)
  const full = assessThemeRequirements({ ...args, scope: { mode: 'full', themeId: scope.themeId } })
  assert.equal(full.stageGate.canAdvanceToThemeBuilder, false)
  assert.notEqual(full.assessment.assessmentId, single.assessment.assessmentId)
  assert.throws(() => resolveCapabilityAssessment({ assessment: { ...full.assessment, scope } }), /fresh assessment/)
  assert.deepEqual(resolveCapabilityAssessment({ assessment: single.assessment }).assessment.scope, scope)
  assert.throws(() => assessThemeRequirements({
    ...args, requirements: [{ id: 'home', description: 'Untagged' }],
  }), /Tag each requirement/)
})

test('Single Template still blocks a missing capability in its own context', () => {
  const result = assessThemeRequirements({
    themeRequest: 'Homepage with a real form',
    scope: { mode: 'single', themeId: 'mcp-blog-test-2', template: 'home' },
    requirements: [{ id: 'home-form', description: 'Functional form', intent: 'form.contact', template: 'home' }],
  })
  assert.equal(result.assessment.overallReadiness, 'BLOCKED')
  assert.equal(result.stageGate.canAdvanceToThemeBuilder, false)
  assert.throws(() => assessThemeRequirements({
    themeRequest: 'Loop Item',
    scope: { mode: 'single', themeId: 'mcp-blog-test-2', template: 'loopItem' },
    requirements: [{ id: 'loop-item', description: 'Story card', intent: 'template.loop-item', template: 'loopItem' }],
  }), /stable Loop Item ID/)
})

test('Stage 0 supports Banner Slider + Count Up and does not fulfill Countdown via AnimatedCounter', () => {
  const snapshot = getCapabilitySnapshot()
  assert(snapshot.widgets.some((widget: { type: string }) => widget.type === 'BannerSlider'))
  assert(snapshot.widgets.some((widget: { type: string }) => widget.type === 'SlideItem'))
  assert(snapshot.widgets.some((widget: { type: string }) => widget.type === 'AnimatedCounter'))
  assert.equal(snapshot.knownGaps.countdownTimerWidget, true)
  assert(snapshot.knownIntents.some((entry: { intent: string }) => entry.intent === 'ui.countdown-timer'))

  const { assessment } = assessThemeRequirements({
    themeRequest: 'Hero slider, stats count-up, and event countdown',
    requirements: [
      { id: 'slider', description: 'Banner carousel', intent: 'ui.banner-slider' },
      { id: 'count-up', description: 'Animated count up', intent: 'ui.animated-counter' },
      { id: 'countdown', description: 'Countdown timer', intent: 'ui.countdown-timer' },
    ],
  })
  assert.equal(assessment.requirements[0].status, 'SUPPORTED')
  assert.equal(assessment.requirements[1].status, 'SUPPORTED')
  assert(assessment.requirements[1].existingCapabilities.includes('capability:count-up'))
  assert.equal(assessment.requirements[2].status, 'MISSING')
  assert(assessment.requirements[2].missingDependencies.includes('widget:CountdownTimer'))
  assert.equal(assessment.requirements[2].existingCapabilities.includes('widget:AnimatedCounter'), false)
  assert.equal(assessment.overallReadiness, 'BLOCKED')
})
