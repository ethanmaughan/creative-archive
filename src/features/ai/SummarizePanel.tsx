import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useAiStatus, useSuggestEdits, useSummarize } from '@/data/worker/hooks'
import { useSession } from '@/app/store/session'
import { Button } from '@/shared/ui/Button'
import type { AiRunResultDTO } from '@/data/worker/types'
import { AiModelField } from './AiModelField'
import { AiUnavailableNote } from './AiUnavailableNote'

function AiResult({ result }: { result: AiRunResultDTO }): JSX.Element {
  return (
    <div className="ai-result">
      <div className="ai-result__meta">
        Saved to <Link to={`/doc/${result.workspacePath}`}>{result.workspacePath}</Link>
      </div>
      <p className="ai-result__text">{result.content}</p>
    </div>
  )
}

/** AI actions for a single document. Reads the doc, writes results only to workspaces/. */
export function SummarizePanel({ relPath }: { relPath: string }): JSX.Element {
  const status = useAiStatus()
  const model = useSession((s) => s.aiModel)
  const summarize = useSummarize()
  const suggest = useSuggestEdits()

  return (
    <section className="ai-panel">
      <h2 className="connections__title">AI</h2>
      {status.data?.available !== true ? (
        <AiUnavailableNote />
      ) : (
        <>
          <div className="ai-controls">
            <AiModelField />
            <Button
              onClick={() => summarize.mutate({ relPath, model })}
              disabled={summarize.isPending}
            >
              {summarize.isPending ? 'Summarizing…' : 'Summarize'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => suggest.mutate({ relPath, model })}
              disabled={suggest.isPending}
            >
              {suggest.isPending ? 'Thinking…' : 'Suggest edits'}
            </Button>
          </div>
          <p className="ai-hint">
            Output is saved to <code>workspaces/ai/</code> — your document is never modified.
          </p>
          {summarize.isError ? <p className="note">{summarize.error.message}</p> : null}
          {suggest.isError ? <p className="note">{suggest.error.message}</p> : null}
          {summarize.data ? <AiResult result={summarize.data} /> : null}
          {suggest.data ? <AiResult result={suggest.data} /> : null}
        </>
      )}
    </section>
  )
}
