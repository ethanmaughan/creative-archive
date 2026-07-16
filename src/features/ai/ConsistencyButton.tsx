import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useAiStatus, useCheckConsistency } from '@/data/worker/hooks'
import { useSession } from '@/app/store/session'
import { Button } from '@/shared/ui/Button'

/** Project-wide story-bible consistency check. Hidden entirely when AI is unavailable. */
export function ConsistencyButton(): JSX.Element | null {
  const status = useAiStatus()
  const model = useSession((s) => s.aiModel)
  const check = useCheckConsistency()

  if (status.data?.available !== true) return null

  return (
    <div className="ai-inline">
      <Button variant="ghost" onClick={() => check.mutate(model)} disabled={check.isPending}>
        {check.isPending ? 'Checking…' : 'Check consistency (AI)'}
      </Button>
      {check.isError ? <span className="ai-inline__error">{check.error.message}</span> : null}
      {check.data ? (
        <Link className="ai-inline__link" to={`/doc/${check.data.workspacePath}`}>
          View findings
        </Link>
      ) : null}
    </div>
  )
}
