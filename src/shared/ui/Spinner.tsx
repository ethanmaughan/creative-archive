import type { JSX } from 'react'

export function Spinner(): JSX.Element {
  return <span className="spinner" role="status" aria-label="Loading" />
}
