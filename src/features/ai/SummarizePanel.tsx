import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useAiStatus, useSummarize } from '@/data/worker/hooks'
import { useSession } from '@/app/store/session'
import { Button } from '@/shared/ui/Button'
import { AiModelField } from './AiModelField'
import { AiUnavailableNote } from './AiUnavailableNote'

/** AI actions for a single document (summarize). Reads canon, writes only to workspaces/. */
export function SummarizePanel({ relPath }: { relPath: string }): JSX.Element {
  const status = useAiStatus()
  const model = useSession((s) => s.aiModel)
  const summarize = useSummarize()

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
          </div>
          {summarize.isError ? <p className="note">{summarize.error.message}</p> : null}
          {summarize.data ? (
            <div className="ai-result">
              <div className="ai-result__meta">
                Saved to{' '}
                <Link to={`/doc/${summarize.data.workspacePath}`}>
                  {summarize.data.workspacePath}
                </Link>
              </div>
              <p className="ai-result__text">{summarize.data.content}</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
