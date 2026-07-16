import type { JSX } from 'react'
import { useSubmissions, useTransitionSubmission } from '@/data/worker/hooks'
import { allowedNextStatuses } from '@/domain/services/submission-workflow'
import type { SubmissionStatus } from '@/domain/models/submission'
import { marketKindLabel, statusLabel, statusTone } from './status'

export function SubmissionList(): JSX.Element {
  const { data } = useSubmissions()
  const transition = useTransitionSubmission()
  const submissions = data ?? []

  if (submissions.length === 0) {
    return <p className="page-sub">No submissions yet.</p>
  }

  return (
    <ul className="qt-list">
      {submissions.map((s) => {
        const next = allowedNextStatuses(s.status as SubmissionStatus)
        const marketLine = s.marketName
          ? `${s.marketName} · ${marketKindLabel(s.marketKind ?? '')}`
          : 'No market'
        const manuscript = s.documentTitle
          ? ` · ${s.documentTitle}${s.manuscriptRev ? ` (${s.manuscriptRev})` : ''}`
          : s.manuscriptRev
            ? ` · ${s.manuscriptRev}`
            : ''
        return (
          <li className="qt-sub" key={s.id}>
            <div className="qt-sub__main">
              <div className="qt-sub__title">{s.title}</div>
              <div className="qt-sub__meta">
                {marketLine}
                {manuscript}
              </div>
            </div>
            <span className={`pill pill--${statusTone(s.status)}`}>{statusLabel(s.status)}</span>
            {next.length > 0 ? (
              <select
                className="newdoc__select"
                aria-label={`Move ${s.title}`}
                value=""
                onChange={(event) => {
                  if (event.target.value !== '') {
                    transition.mutate({ id: s.id, to: event.target.value as SubmissionStatus })
                  }
                }}
              >
                <option value="">Move to…</option>
                {next.map((n) => (
                  <option key={n} value={n}>
                    {statusLabel(n)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="qt-final">final</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
