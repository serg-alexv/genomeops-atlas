import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AdvancedAtlas } from './AdvancedAtlas'

describe('advanced GenomeOps Atlas workspace', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '#mode=advanced&view=evidence')
  })

  it('preserves the seeded evidence map and workforce router', () => {
    render(<AdvancedAtlas />)

    expect(screen.getByRole('heading', { name: 'L. lactis oxygen metabolism' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'nox, predicted' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))
    expect(screen.getByRole('heading', { name: 'Task → Agent Router' })).toBeInTheDocument()
    expect(screen.getByText('GPT-5.3-Codex-Spark', { selector: '.route-step-copy strong' })).toBeInTheDocument()
  })

  it('keeps Spark out of an explicitly selected genome-analysis route', () => {
    render(<AdvancedAtlas />)
    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))
    fireEvent.click(screen.getByRole('radio', { name: /Analyze genome/i }))

    const routeOutput = screen.getByText('Recommended agent stack').closest('.route-output')
    expect(routeOutput).not.toBeNull()
    expect(within(routeOutput as HTMLElement).getByRole('heading', { name: 'Analyze genome evidence' })).toBeInTheDocument()
    expect(within(routeOutput as HTMLElement).queryByText('GPT-5.3-Codex-Spark')).not.toBeInTheDocument()
  })
})
