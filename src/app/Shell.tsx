import { useEffect, type JSX } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { OpenArchiveGate } from './OpenArchiveGate'
import { useOpenArchive } from './use-open-archive'
import { useSession } from './store/session'

const NAV: readonly { to: string; label: string; end: boolean }[] = [
  { to: '/', label: 'Studio', end: true },
  { to: '/spaces', label: 'Spaces', end: false },
  { to: '/files', label: 'Files', end: false },
  { to: '/library', label: 'Library', end: false },
  { to: '/connections', label: 'Connections', end: false },
  { to: '/query-tracker', label: 'Query Tracker', end: false },
  { to: '/search', label: 'Search', end: false },
]

function statusLabel(status: string, docCount: number): string {
  if (status === 'ready') return `${docCount} docs`
  if (status === 'opening') return 'opening…'
  if (status === 'error') return 'error'
  return 'idle'
}

export function Shell(): JSX.Element {
  const status = useSession((s) => s.status)
  const archiveName = useSession((s) => s.archiveName)
  const docCount = useSession((s) => s.docCount)
  const { restore } = useOpenArchive()

  // On first load, reconnect to the remembered folder if permission is still granted.
  useEffect(() => {
    void restore()
  }, [restore])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          Creative Archive
          <small>{archiveName ?? 'No archive open'}</small>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
            >
              <span className="nav__dot" aria-hidden="true" />
              <span className="nav__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <span
            className={`status-dot${status === 'ready' ? ' is-ready' : status === 'error' ? ' is-error' : ''}`}
          />
          {statusLabel(status, docCount)}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar__title">{archiveName ?? 'Creative Archive'}</span>
          <span className="topbar__spacer" />
          <ThemeToggle />
        </header>
        <div className="content">{status === 'ready' ? <Outlet /> : <OpenArchiveGate />}</div>
      </div>
    </div>
  )
}
