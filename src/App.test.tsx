import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('GenomeOps Atlas app shell', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '#view=evidence')
  })

  it('opens on the seeded evidence map and navigates to the workforce router', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'L. lactis oxygen metabolism' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'nox, predicted' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))

    expect(screen.getByRole('heading', { name: /A control plane for.*scientific engineering/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Task → Agent Router' })).toBeInTheDocument()
    expect(screen.getByText('GPT-5.3-Codex-Spark', { selector: '.route-step-copy strong' })).toBeInTheDocument()
  })

  it('changes projects and exposes the selected project evidence', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Open project LAB restriction–modification systems/i }))

    expect(screen.getByRole('heading', { name: 'LAB restriction–modification systems' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RM candidate, predicted' })).toBeInTheDocument()
  })

  it('honors an explicit genome-analysis route over stale dashboard text', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))
    fireEvent.click(screen.getByRole('radio', { name: /Analyze genome/i }))

    const routeOutput = screen.getByText('Recommended agent stack').closest('.route-output')
    expect(routeOutput).not.toBeNull()
    expect(within(routeOutput as HTMLElement).getByRole('heading', { name: 'Analyze genome evidence' })).toBeInTheDocument()
    expect(within(routeOutput as HTMLElement).queryByText('GPT-5.3-Codex-Spark')).not.toBeInTheDocument()
  })
})
