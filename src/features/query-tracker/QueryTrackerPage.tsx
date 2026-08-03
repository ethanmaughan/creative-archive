import { useState, type JSX } from 'react'
import { useCreateSubmission, useDocuments, useMarkets } from '@/data/worker/hooks'
import { getDataClient } from '@/data/worker/data-client'
import { downloadText } from '@/shared/download'
import { Button } from '@/shared/ui/Button'
import { AgentTracker } from './AgentTracker'
import { MarketManager } from './MarketManager'
import { SubmissionList } from './SubmissionList'

export function QueryTrackerPage(): JSX.Element {
  const { data: markets } = useMarkets()
  const { data: docs } = useDocuments()
  const createSubmission = useCreateSubmission()

  const [title, setTitle] = useState('')
  const [marketId, setMarketId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [rev, setRev] = useState('')

  const marketList = markets ?? []
  const docList = docs ?? []

  const add = (): void => {
    const trimmed = title.trim()
    if (trimmed === '' || marketId === '') return
    createSubmission.mutate(
      {
        title: trimmed,
        marketId,
        ...(documentId !== '' ? { documentId } : {}),
        ...(rev.trim() !== '' ? { manuscriptRev: rev.trim() } : {}),
      },
      {
        onSuccess: () => {
          setTitle('')
          setRev('')
        },
      },
    )
  }

  const exportCsv = (): void => {
    void getDataClient()
      .exportSubmissionsCsv()
      .then((csv) => downloadText('submissions.csv', 'text/csv', csv))
  }
  const exportJson = (): void => {
    void getDataClient()
      .exportSubmissionsJson()
      .then((json) => downloadText('submissions.json', 'application/json', json))
  }

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Query Tracker</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Agents, publishers, magazines, contests — and where your work stands.
          </p>
        </div>
        <div className="conn-add">
          <Button variant="ghost" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={exportJson}>
            Export JSON
          </Button>
        </div>
      </div>

      <AgentTracker />

      <MarketManager />

      <section className="qt-section">
        <h2 className="connections__title">Submissions</h2>
        <div className="qt-form">
          <input
            className="newdoc__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Submission title…"
            aria-label="Submission title"
          />
          <select
            className="newdoc__select"
            value={marketId}
            onChange={(event) => setMarketId(event.target.value)}
            aria-label="Market"
          >
            <option value="">Market…</option>
            {marketList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            className="newdoc__select"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            aria-label="Manuscript"
          >
            <option value="">Manuscript (optional)…</option>
            {docList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title ?? d.relPath}
              </option>
            ))}
          </select>
          <input
            className="newdoc__input newdoc__input--sm"
            value={rev}
            onChange={(event) => setRev(event.target.value)}
            placeholder="Version (e.g. draft 3)"
            aria-label="Manuscript version"
          />
          <Button
            onClick={add}
            disabled={createSubmission.isPending || title.trim() === '' || marketId === ''}
          >
            Add submission
          </Button>
        </div>
        {marketList.length === 0 ? (
          <p className="page-sub">Add a market first, then submissions can target it.</p>
        ) : null}
        <SubmissionList />
      </section>
    </div>
  )
}
