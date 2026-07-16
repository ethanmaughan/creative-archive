import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { App } from '@/app/App'

afterEach(cleanup)

describe('App shell', () => {
  it('renders the brand and the open-archive gate', () => {
    render(<App />)
    expect(screen.getAllByText('Creative Archive').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Open your archive' })).toBeInTheDocument()
  })

  it('shows the sidebar navigation', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /studio/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument()
  })
})
