import { useState, type JSX } from 'react'
import { ExtractionBrowser } from './ExtractionBrowser'
import { LibraryItems } from './LibraryItems'
import { NewLibraryItemButton } from './NewLibraryItemButton'

type Tab = 'items' | 'extraction'

export function LibraryPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('items')

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Books, films, games — everything you draw from.
          </p>
        </div>
        {tab === 'items' ? <NewLibraryItemButton /> : null}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab${tab === 'items' ? ' is-active' : ''}`}
          onClick={() => setTab('items')}
        >
          Items
        </button>
        <button
          type="button"
          className={`tab${tab === 'extraction' ? ' is-active' : ''}`}
          onClick={() => setTab('extraction')}
        >
          Extraction
        </button>
      </div>

      {tab === 'items' ? <LibraryItems /> : <ExtractionBrowser />}
    </div>
  )
}
