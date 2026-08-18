import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('GenomeOps Atlas routine guide', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('genomeops-atlas:locale:v1', 'en')
    window.history.replaceState(null, '', '/')
  })

  it('opens on the simple routine guide and switches the full workflow to Russian', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'What are you trying to move forward?' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'nox, predicted' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'RU' }))

    expect(screen.getByRole('heading', { name: 'Что вы хотите сдвинуть с места?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Подскажите путь' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Что отдать AI' })).toBeInTheDocument()
  })

  it('turns an ordinary choice into an A/B test and saves the completed aim', () => {
    render(<App />)

    const input = screen.getByRole('textbox', { name: 'What are you trying to move forward?' })
    fireEvent.change(input, { target: { value: 'I am choosing between two vendors for the same job.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guide me' }))

    const response = screen.getByRole('region', { name: 'You said' })
    expect(within(response).getByText('I am choosing between two vendors for the same job.')).toBeInTheDocument()
    expect(within(response).getByText('Run one scenario through both')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start the 10-minute test' }))
    expect(screen.getByRole('heading', { name: 'Your 10-minute test' })).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark test done' }))
    expect(screen.getByText(/Test complete/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'My aims' }))
    const drawer = screen.getByRole('dialog', { name: 'Your aims' })
    expect(within(drawer).getByText('I am choosing between two vendors for the same job.')).toBeInTheDocument()
    expect(within(drawer).getByText(/test completed/)).toBeInTheDocument()
  })

  it('keeps the expert workspace behind an explicit advanced boundary', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Open advanced Atlas tools' }))
    expect(screen.getByRole('heading', { name: 'L. lactis oxygen metabolism' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to the guide' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to the guide' }))
    expect(screen.getByRole('heading', { name: 'What are you trying to move forward?' })).toBeInTheDocument()
  })
})
