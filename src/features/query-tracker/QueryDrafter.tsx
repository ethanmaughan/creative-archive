import { useMemo, useState, type JSX } from 'react'
import { useSaveTemplates, useTemplates } from '@/data/worker/hooks'
import { buildQueryDraft } from '@/domain/services/query-draft'
import type { Agent } from '@/domain/models/agent'
import type { QueryTemplate } from '@/domain/models/query-template'
import { Button } from '@/shared/ui/Button'

interface TemplateDraft {
  name: string
  logline: string
  synopsisShort: string
  bio: string
  compTitles: string
}

const emptyTemplateDraft = (): TemplateDraft => ({
  name: '',
  logline: '',
  synopsisShort: '',
  bio: '',
  compTitles: '',
})

const toTemplateDraft = (template: QueryTemplate): TemplateDraft => ({
  name: template.name,
  logline: template.logline,
  synopsisShort: template.synopsisShort,
  bio: template.bio,
  compTitles: template.compTitles.join('; '),
})

const fromTemplateDraft = (draft: TemplateDraft): QueryTemplate => ({
  name: draft.name.trim(),
  logline: draft.logline,
  synopsisShort: draft.synopsisShort,
  bio: draft.bio,
  compTitles: draft.compTitles
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part !== ''),
})

function TemplateForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial: TemplateDraft
  onSave: (template: QueryTemplate) => void
  onCancel: () => void
  busy: boolean
}): JSX.Element {
  const [draft, setDraft] = useState<TemplateDraft>(initial)
  const set = (key: keyof TemplateDraft, value: string): void =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="agent-form">
      <div className="agent-form__grid">
        <label className="agent-field agent-field--wide">
          <span>Template name</span>
          <input
            className="newdoc__input"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Logline</span>
          <textarea
            className="agent-textarea"
            value={draft.logline}
            onChange={(e) => set('logline', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Short synopsis</span>
          <textarea
            className="agent-textarea"
            value={draft.synopsisShort}
            onChange={(e) => set('synopsisShort', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Bio</span>
          <textarea
            className="agent-textarea"
            value={draft.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </label>
        <label className="agent-field agent-field--wide">
          <span>Comp titles (; separated)</span>
          <input
            className="newdoc__input"
            value={draft.compTitles}
            onChange={(e) => set('compTitles', e.target.value)}
            placeholder="Mexican Gothic; The Only Good Indians"
          />
        </label>
      </div>
      <div className="agent-form__actions">
        <Button
          onClick={() => onSave(fromTemplateDraft(draft))}
          disabled={busy || draft.name.trim() === ''}
        >
          Save template
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** Merge a template + an agent into an editable draft query letter (plain string substitution). */
export function QueryDrafter({ agents }: { agents: Agent[] }): JSX.Element {
  const { data } = useTemplates()
  const templates = useMemo(() => data ?? [], [data])
  const saveTemplates = useSaveTemplates()

  const [templateName, setTemplateName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [draft, setDraft] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [copied, setCopied] = useState(false)

  const template = templates.find((t) => t.name === templateName) ?? null
  const agent = agents.find((a) => a.name === agentName) ?? null

  const persistTemplates = (next: QueryTemplate[]): void => saveTemplates.mutate(next)

  const generate = (): void => {
    if (!template || !agent) return
    setDraft(buildQueryDraft(template, agent))
    setCopied(false)
  }

  const copy = (): void => {
    void navigator.clipboard.writeText(draft).then(() => setCopied(true))
  }

  return (
    <div className="drafter">
      <div className="drafter__controls">
        <select
          className="newdoc__select"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          aria-label="Template"
        >
          <option value="">Template…</option>
          {templates.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="newdoc__select"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          aria-label="Agent"
        >
          <option value="">Agent…</option>
          {agents.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <Button onClick={generate} disabled={!template || !agent}>
          Generate draft
        </Button>
        <Button variant="ghost" onClick={() => setManageOpen((o) => !o)}>
          Manage templates
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="page-sub">
          No templates yet — open <strong>Manage templates</strong> to add your logline, comps, and
          bio once, then reuse them for every agent.
        </p>
      ) : null}

      {manageOpen ? (
        <div className="drafter__templates">
          <ul className="agent-list">
            {templates.map((t, i) => (
              <li className="agent" key={t.name}>
                {editing === i ? (
                  <TemplateForm
                    initial={toTemplateDraft(t)}
                    busy={saveTemplates.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(tpl) => {
                      const next = templates.slice()
                      next[i] = tpl
                      persistTemplates(next)
                      setEditing(null)
                    }}
                  />
                ) : (
                  <>
                    <div className="agent__main">
                      <div className="agent__title">{t.name}</div>
                      <div className="agent__meta">{t.logline || 'No logline yet'}</div>
                    </div>
                    <div className="agent__actions">
                      <button type="button" className="agent__btn" onClick={() => setEditing(i)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="agent__btn agent__btn--danger"
                        onClick={() => persistTemplates(templates.filter((_, idx) => idx !== i))}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editing === 'new' ? (
            <TemplateForm
              initial={emptyTemplateDraft()}
              busy={saveTemplates.isPending}
              onCancel={() => setEditing(null)}
              onSave={(tpl) => {
                persistTemplates([...templates, tpl])
                setEditing(null)
              }}
            />
          ) : (
            <Button onClick={() => setEditing('new')}>+ Template</Button>
          )}
        </div>
      ) : null}

      {draft !== '' ? (
        <div className="drafter__draft">
          <textarea
            className="agent-textarea drafter__box"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setCopied(false)
            }}
            aria-label="Query draft"
          />
          <div className="agent-form__actions">
            <Button onClick={copy}>{copied ? 'Copied!' : 'Copy to clipboard'}</Button>
            <Button variant="ghost" onClick={generate} disabled={!template || !agent}>
              Regenerate
            </Button>
          </div>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            A starting point — edit it freely. Nothing is sent; copy it into your email or the
            agent&apos;s form yourself, then log the status under Pipeline.
          </p>
        </div>
      ) : null}
    </div>
  )
}
