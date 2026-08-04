import { useMemo, useState, type JSX } from 'react'
import { useAppendSubmissionLog, useSubmissionLog } from '@/data/worker/hooks'
import {
  SUBMISSION_STAGES,
  STAGE_LABEL,
  historyFor,
  latestByAgent,
  type SubmissionStage,
} from '@/domain/models/submission-log'
import { Button } from '@/shared/ui/Button'

const nameKey = (name: string): string => name.trim().toLowerCase()

/** Kanban of agents grouped by their most-recent submission status, driven by submissions.csv.
 *  Logging a status change appends an event; each agent shows its full append-only history. */
export function SubmissionPipeline({
  slug,
  agentNames,
}: {
  slug: string
  agentNames: string[]
}): JSX.Element {
  const { data } = useSubmissionLog(slug)
  const events = useMemo(() => data ?? [], [data])
  const append = useAppendSubmissionLog()

  const [openAgent, setOpenAgent] = useState<string | null>(null)
  const [draftStage, setDraftStage] = useState<SubmissionStage>('queried')
  const [draftNote, setDraftNote] = useState('')

  const latest = useMemo(() => latestByAgent(events), [events])

  const columns = useMemo(() => {
    const cols: Record<SubmissionStage, string[]> = {
      not_queried: [],
      queried: [],
      responded_request: [],
      responded_pass: [],
      offer: [],
      withdrawn: [],
    }
    for (const name of agentNames) {
      const stage = latest.get(nameKey(name))?.status ?? 'not_queried'
      cols[stage].push(name)
    }
    return cols
  }, [agentNames, latest])

  if (agentNames.length === 0) {
    return (
      <p className="page-sub">
        Add or import agents first — they&apos;ll show up here to move through the pipeline.
      </p>
    )
  }

  const openEditor = (name: string): void => {
    if (openAgent === name) {
      setOpenAgent(null)
      return
    }
    setOpenAgent(name)
    setDraftStage(latest.get(nameKey(name))?.status ?? 'not_queried')
    setDraftNote('')
  }

  const logUpdate = (name: string): void => {
    append.mutate(
      {
        slug,
        event: {
          agentName: name,
          status: draftStage,
          timestamp: new Date().toISOString(),
          note: draftNote.trim(),
        },
      },
      { onSuccess: () => setDraftNote('') },
    )
  }

  return (
    <div className="pipeline">
      {SUBMISSION_STAGES.map((stage) => (
        <div className="pipeline__col" key={stage}>
          <div className="pipeline__colhead">
            {STAGE_LABEL[stage]}
            <span className="pipeline__count">{columns[stage].length}</span>
          </div>
          <div className="pipeline__cards">
            {columns[stage].map((name) => (
              <div className="pipeline__card" key={name}>
                <button type="button" className="pipeline__name" onClick={() => openEditor(name)}>
                  {name}
                </button>
                {openAgent === name ? (
                  <div className="pipeline__editor">
                    <select
                      className="newdoc__select"
                      value={draftStage}
                      onChange={(e) => setDraftStage(e.target.value as SubmissionStage)}
                      aria-label={`New status for ${name}`}
                    >
                      {SUBMISSION_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <input
                      className="newdoc__input"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Note (optional)"
                      aria-label={`Note for ${name}`}
                    />
                    <Button onClick={() => logUpdate(name)} disabled={append.isPending}>
                      Log update
                    </Button>
                    <div className="pipeline__history">
                      {historyFor(events, name).length === 0 ? (
                        <span className="pipeline__empty">No history yet.</span>
                      ) : (
                        historyFor(events, name).map((event, i) => (
                          <div className="pipeline__event" key={`${event.timestamp}-${i}`}>
                            <span className="pipeline__evstage">{STAGE_LABEL[event.status]}</span>
                            <span className="pipeline__evdate">{event.timestamp.slice(0, 10)}</span>
                            {event.note ? (
                              <span className="pipeline__evnote">{event.note}</span>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
