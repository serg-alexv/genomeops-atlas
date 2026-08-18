import { describe, expect, it } from 'vitest'
import { buildAdvisoryPrompt } from './promptBuilder'

describe('buildAdvisoryPrompt', () => {
  it('preserves supplied context and evidence boundaries', () => {
    const prompt = buildAdvisoryPrompt({
      template: 'annotation-review',
      organism: 'Lactococcus lactis',
      goal: 'Review a candidate annotation',
      availableData: 'A source-linked annotation table',
      question: 'Which claims remain predictions?',
      confidenceThreshold: 'source-linked',
    })

    expect(prompt).toContain('Lactococcus lactis')
    expect(prompt).toContain('Which claims remain predictions?')
    expect(prompt).toContain('Model agreement is not validation')
    expect(prompt).toContain('source missing')
    expect(prompt).toContain('Do not conclude yet')
  })

  it('uses a focused engineering contract for implementation briefs', () => {
    const prompt = buildAdvisoryPrompt({
      template: 'implementation-brief',
      organism: 'Cross-project',
      goal: 'Add a project row',
      availableData: 'Existing React repository',
      question: 'How should the row expose evidence state?',
      confidenceThreshold: 'decision-ready',
    })

    expect(prompt).toMatch(/inspect the existing repository first/i)
    expect(prompt).toContain('minimum coherent diff')
    expect(prompt).toContain('human decision gate')
  })
})
