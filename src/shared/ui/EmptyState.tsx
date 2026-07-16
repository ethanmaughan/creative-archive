import type { JSX, ReactNode } from 'react'

export function EmptyState({
  mark,
  title,
  children,
}: {
  mark: string
  title: string
  children?: ReactNode
}): JSX.Element {
  return (
    <div className="empty">
      <div className="empty__mark" aria-hidden="true">
        {mark}
      </div>
      <h2 className="empty__title">{title}</h2>
      {children}
    </div>
  )
}
