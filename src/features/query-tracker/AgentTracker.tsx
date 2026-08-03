import { useEffect, useMemo, useState, type JSX } from 'react'
import {
  useAgentManuscripts,
  useAgents,
  useCreateAgentManuscript,
  useSaveAgents,
} from '@/data/worker/hooks'
import { AGENT_STATUSES, isStale, type Agent, type AgentStatus } from '@/domain/models/agent'
import { detectFormat, mergeNewAgents, parseImportedAgents } from '@/domain/services/agent-import'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { slugify } from '@/shared/slug'

const STATUS_LABEL: Record<AgentStatus, string> = {
  unresearched: 'Unresearched',
  open: 'Open',
  closed: 'Closed',
  unknown: 'Unknown',
}

interface Draft {
  name: string
  agency: string
  location: string
  genres: string
  notableClients: string
  wishlistNotes: string
  guidelinesUrl: string
  guidelinesNotes: string
  status: AgentStatus
  statusLastChecked: string
  source: string
  personalFitNotes: string
  tags: string
}

const splitList = (value: string): string[] =>
  value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part !== '')

const emptyDraft = (): Draft => ({
  name: '',
  agency: '',
  location: '',
  genres: '',
  notableClients: '',
  wishlistNotes: '',
  guidelinesUrl: '',
  guidelinesNotes: '',
  status: 'unresearched',
  statusLastChecked: '',
  source: '',
  personalFitNotes: '',
  tags: '',
})

const agentToDraft = (agent: Agent): Draft => ({
  name: agent.name,
  agency: agent.agency,
  location: agent.location,
  genres: agent.genres.join('; '),
  notableClients: agent.notableClients.join('; '),
  wishlistNotes: agent.wishlistNotes,
  guidelinesUrl: agent.guidelinesUrl,
  guidelinesNotes: agent.guidelinesNotes,
  status: agent.status,
  statusLastChecked: agent.statusLastChecked,
  source: agent.source,
  personalFitNotes: agent.personalFitNotes,
  tags: agent.tags.join('; '),
})

const draftToAgent = (draft: Draft): Agent => ({
  name: draft.name.trim(),
  agency: draft.agency.trim(),
  location: draft.location.trim(),
  genres: splitList(draft.genres),
  notableClients: splitList(draft.notableClients),
  wishlistNotes: draft.wishlistNotes,
  guidelinesUrl: draft.guidelinesUrl.trim(),
  guidelinesNotes: draft.guidelinesNotes,
  status: draft.status,
  statusLastChecked: draft.statusLastChecked.trim(),
  source: draft.source,
  personalFitNotes: draft.personalFitNotes,
  tags: splitList(draft.tags),
})

function AgentForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial: Draft
  onSave: (agent: Agent) => void
  onCancel: () => void
  busy: boolean
}): JSX.Element {
  const [draft, setDraft] = useState<Draft>(initial)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="agent-form">
      <div className="agent-form__grid">
        <label className="agent-field">
          <span>Name</span>
          <input
            className="newdoc__input"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Agency</span>
          <input
            className="newdoc__input"
            value={draft.agency}
            onChange={(e) => set('agency', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Location</span>
          <input
            className="newdoc__input"
            value={draft.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Status</span>
          <select
            className="newdoc__select"
            value={draft.status}
            onChange={(e) => set('status', e.target.value as AgentStatus)}
          >
            {AGENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-field">
          <span>Status last checked</span>
          <input
            className="newdoc__input"
            type="date"
            value={draft.statusLastChecked}
            onChange={(e) => set('statusLastChecked', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Genres (; separated)</span>
          <input
            className="newdoc__input"
            value={draft.genres}
            onChange={(e) => set('genres', e.target.value)}
            placeholder="horror; horror-comedy"
          />
        </label>
        <label className="agent-field">
          <span>Tags (; separated)</span>
          <input
            className="newdoc__input"
            value={draft.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="top choice; boutique"
          />
        </label>
        <label className="agent-field">
          <span>Notable clients (; separated)</span>
          <input
            className="newdoc__input"
            value={draft.notableClients}
            onChange={(e) => set('notableClients', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Guidelines URL</span>
          <input
            className="newdoc__input"
            value={draft.guidelinesUrl}
            onChange={(e) => set('guidelinesUrl', e.target.value)}
          />
        </label>
        <label className="agent-field">
          <span>Source</span>
          <input
            className="newdoc__input"
            value={draft.source}
            onChange={(e) => set('source', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Wishlist / MSWL notes</span>
          <textarea
            className="agent-textarea"
            value={draft.wishlistNotes}
            onChange={(e) => set('wishlistNotes', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Guidelines notes</span>
          <textarea
            className="agent-textarea"
            value={draft.guidelinesNotes}
            onChange={(e) => set('guidelinesNotes', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Personal fit notes</span>
          <textarea
            className="agent-textarea"
            value={draft.personalFitNotes}
            onChange={(e) => set('personalFitNotes', e.target.value)}
          />
        </label>
      </div>
      <div className="agent-form__actions">
        <Button onClick={() => onSave(draftToAgent(draft))} disabled={busy || draft.name.trim() === ''}>
          Save agent
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** The CSV "interpreter": reads a manuscript's agents CSV and shows it as a filterable list. */
export function AgentTracker(): JSX.Element {
  const { data: manuscripts, isLoading: loadingManuscripts } = useAgentManuscripts()
  const createManuscript = useCreateAgentManuscript()
  const saveAgents = useSaveAgents()

  const [slug, setSlug] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [staleMonths, setStaleMonths] = useState(3)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  // A stable "now" for the session so staleness doesn't recompute on every render.
  const [now] = useState(() => new Date())

  // Default to the first manuscript once the list loads.
  useEffect(() => {
    if (slug === null && manuscripts && manuscripts.length > 0) setSlug(manuscripts[0] ?? null)
  }, [manuscripts, slug])

  const { data: agentsData } = useAgents(slug)
  const agents = useMemo(() => agentsData ?? [], [agentsData])

  const persist = (next: Agent[]): void => {
    if (slug === null) return
    saveAgents.mutate({ slug, agents: next })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return agents
      .map((agent, index) => ({ agent, index }))
      .filter(({ agent }) => {
        if (statusFilter !== 'all' && agent.status !== statusFilter) return false
        if (q === '') return true
        const hay = [
          agent.name,
          agent.agency,
          agent.location,
          agent.genres.join(' '),
          agent.tags.join(' '),
          agent.wishlistNotes,
          agent.personalFitNotes,
          agent.source,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
  }, [agents, search, statusFilter])

  const stale = useMemo(
    () =>
      agents
        .map((agent, index) => ({ agent, index }))
        .filter(({ agent }) => isStale(agent, staleMonths, now)),
    [agents, staleMonths, now],
  )

  const createNewManuscript = (): void => {
    const s = slugify(newName)
    if (s === '') return
    createManuscript.mutate(s, {
      onSuccess: () => {
        setNewName('')
        setSlug(s)
      },
    })
  }

  const runImport = (): void => {
    const text = importText.trim()
    if (text === '') return
    try {
      const incoming = parseImportedAgents(text, detectFormat(text))
      if (incoming.length === 0) {
        setImportMsg('No agents found in that data.')
        return
      }
      const today = now.toISOString().slice(0, 10)
      const { added, skipped } = mergeNewAgents(agents, incoming, today)
      if (added.length > 0) persist([...agents, ...added])
      const skipNote =
        skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''
      setImportMsg(`Imported ${added.length} new agent${added.length === 1 ? '' : 's'}${skipNote}.`)
      setImportText('')
    } catch (error) {
      setImportMsg(`Couldn't parse that: ${error instanceof Error ? error.message : 'invalid data'}`)
    }
  }

  const loadImportFile = (file: File | undefined): void => {
    if (!file) return
    void file.text().then((text) => setImportText(text))
  }

  return (
    <section className="qt-section">
      <h2 className="connections__title">Literary agents</h2>

      <div className="agent-bar">
        <select
          className="newdoc__select"
          value={slug ?? ''}
          onChange={(e) => {
            setSlug(e.target.value || null)
            setEditIndex(null)
            setAdding(false)
          }}
          aria-label="Manuscript"
          disabled={!manuscripts || manuscripts.length === 0}
        >
          {(!manuscripts || manuscripts.length === 0) && <option value="">No manuscripts yet</option>}
          {manuscripts?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="newdoc__input newdoc__input--sm"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New manuscript name…"
          aria-label="New manuscript name"
        />
        <Button
          variant="ghost"
          onClick={createNewManuscript}
          disabled={createManuscript.isPending || newName.trim() === ''}
        >
          + Manuscript
        </Button>
      </div>

      {loadingManuscripts ? (
        <div className="row">
          <Spinner /> Loading…
        </div>
      ) : slug === null ? (
        <p className="page-sub">
          Create a manuscript above to start tracking agents. Each one is a{' '}
          <code>query-tracker/&lt;name&gt;.agents.csv</code> file in your archive folder — open it in
          a spreadsheet anytime.
        </p>
      ) : (
        <>
          <div className="agent-filter">
            <input
              className="tag-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, agency, notes, tags…"
              aria-label="Search agents"
            />
            <select
              className="newdoc__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AgentStatus | 'all')}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {AGENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <span className="agent-count">
              {visible.length} / {agents.length}
            </span>
            <Button
              onClick={() => {
                setAdding(true)
                setEditIndex(null)
              }}
              disabled={adding}
            >
              + Agent
            </Button>
            <Button variant="ghost" onClick={() => setImportOpen((o) => !o)}>
              Import…
            </Button>
          </div>

          {importOpen ? (
            <div className="agent-form">
              <p className="agent-import__hint">
                Paste a JSON array (or a CSV export) of agents. New rows import as{' '}
                <strong>unresearched</strong>; duplicates (same name + agency) are skipped. Nothing
                is fetched from the web — this only reads what you paste or pick.
              </p>
              <textarea
                className="agent-textarea agent-import__box"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='[{"name": "Chris Lotts", "agency": "The Lotts Agency", "genres": ["horror"]}]'
                aria-label="Import data"
              />
              <div className="agent-form__actions">
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={(e) => loadImportFile(e.target.files?.[0])}
                  aria-label="Import file"
                />
                <Button
                  onClick={runImport}
                  disabled={saveAgents.isPending || importText.trim() === ''}
                >
                  Import
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setImportOpen(false)
                    setImportMsg(null)
                  }}
                >
                  Close
                </Button>
              </div>
              {importMsg ? <p className="agent-import__msg">{importMsg}</p> : null}
            </div>
          ) : null}

          {stale.length > 0 ? (
            <div className="agent-refresh">
              <div className="agent-refresh__head">
                <strong>Needs refresh · {stale.length}</strong>
                <label className="agent-refresh__threshold">
                  older than
                  <select
                    className="newdoc__select"
                    value={staleMonths}
                    onChange={(e) => setStaleMonths(Number(e.target.value))}
                    aria-label="Staleness threshold in months"
                  >
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </select>
                </label>
              </div>
              <ul className="agent-refresh__list">
                {stale.map(({ agent, index }) => (
                  <li key={`stale-${index}-${agent.name}`}>
                    <button
                      type="button"
                      className="agent__btn"
                      onClick={() => {
                        setEditIndex(index)
                        setAdding(false)
                      }}
                    >
                      {agent.name}
                    </button>
                    <span className="agent-refresh__date">
                      checked {agent.statusLastChecked || 'never'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="page-sub" style={{ marginBottom: 0 }}>
                Re-check each agent&apos;s page yourself, then update their status and date. The app
                never fetches this for you.
              </p>
            </div>
          ) : null}

          {adding ? (
            <AgentForm
              initial={emptyDraft()}
              busy={saveAgents.isPending}
              onCancel={() => setAdding(false)}
              onSave={(agent) => {
                persist([...agents, agent])
                setAdding(false)
              }}
            />
          ) : null}

          {agents.length === 0 && !adding ? (
            <p className="page-sub">No agents yet. Add one, or use Import to paste your research list.</p>
          ) : (
            <ul className="agent-list">
              {visible.map(({ agent, index }) => (
                <li className="agent" key={`${index}-${agent.name}`}>
                  {editIndex === index ? (
                    <AgentForm
                      initial={agentToDraft(agent)}
                      busy={saveAgents.isPending}
                      onCancel={() => setEditIndex(null)}
                      onSave={(next) => {
                        const updated = agents.slice()
                        updated[index] = next
                        persist(updated)
                        setEditIndex(null)
                      }}
                    />
                  ) : (
                    <>
                      <div className="agent__main">
                        <div className="agent__title">
                          {agent.name}
                          <span className={`chip chip--sm status--${agent.status}`}>
                            {STATUS_LABEL[agent.status]}
                          </span>
                        </div>
                        <div className="agent__meta">
                          {[agent.agency, agent.location].filter(Boolean).join(' · ')}
                        </div>
                        {agent.genres.length > 0 || agent.tags.length > 0 ? (
                          <div className="agent__chips">
                            {agent.genres.map((g) => (
                              <span key={`g-${g}`} className="tag-chip">
                                {g}
                              </span>
                            ))}
                            {agent.tags.map((t) => (
                              <span key={`t-${t}`} className="tag-chip tag-chip--tag">
                                #{t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {agent.personalFitNotes.trim() !== '' ? (
                          <div className="agent__notes">{agent.personalFitNotes}</div>
                        ) : null}
                      </div>
                      <div className="agent__actions">
                        <button
                          type="button"
                          className="agent__btn"
                          onClick={() => {
                            setEditIndex(index)
                            setAdding(false)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="agent__btn agent__btn--danger"
                          onClick={() => persist(agents.filter((_, i) => i !== index))}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
