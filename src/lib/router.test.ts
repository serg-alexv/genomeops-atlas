import { describe, expect, it } from 'vitest'
import { buildAgentRoute, inferTaskKind } from './router'

const defaultOptions = {
  privateData: false,
  speedFirst: true,
  existingRepository: true,
}

describe('task router', () => {
  it('positions Spark after architecture and before verification', () => {
    const route = buildAgentRoute('build_visualization', 'Create a genome dashboard', defaultOptions)
    const ids = route.steps.map((step) => step.id)

    expect(ids.indexOf('architecture')).toBeLessThan(ids.indexOf('spark'))
    expect(ids.indexOf('spark')).toBeLessThan(ids.indexOf('github-actions'))
    expect(ids.indexOf('github-actions')).toBeLessThan(ids.indexOf('vercel'))
    expect(route.caution).toContain('does not own the scientific model')
  })

  it('keeps Spark out of the genome evidence route', () => {
    const route = buildAgentRoute('analyze_genome', 'Create a genome dashboard', defaultOptions)
    expect(route.task).toBe('analyze_genome')
    expect(route.steps.map((step) => step.id)).not.toContain('spark')
    expect(route.steps.at(-1)?.kind).toBe('gate')
  })

  it('adds a local preprocessing lane only when private data is selected', () => {
    const route = buildAgentRoute('review_literature', '', { ...defaultOptions, privateData: true })
    expect(route.steps[0].id).toBe('local-model')
  })

  it('infers a literature task from free text', () => {
    expect(inferTaskKind('Review recent literature and papers', 'create_software')).toBe('review_literature')
  })
})
