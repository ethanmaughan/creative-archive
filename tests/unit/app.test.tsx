import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { App } from '@/app/App'

afterEach(cleanup)

describe('App shell', () => {
  it('renders the archive heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Creative Archive', level: 1 })).toBeInTheDocument()
  })

  it('states the core principle: AI retrieves, never authors', () => {
    render(<App />)
    expect(screen.getByText(/AI retrieves; it never authors/i)).toBeInTheDocument()
  })
})
