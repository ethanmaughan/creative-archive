import type { JSX } from 'react'
import { EmptyState } from './EmptyState'

export function ComingSoon({ title, phase }: { title: string; phase: string }): JSX.Element {
  return (
    <div className="content__inner">
      <EmptyState mark="✦" title={title}>
        <p className="empty__body">
          Arrives in {phase}. The shell, storage, and reconciler beneath it are already in place.
        </p>
      </EmptyState>
    </div>
  )
}
