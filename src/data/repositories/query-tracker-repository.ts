/** Read/write access to the Query Tracker: markets, submissions, and submission events. */
import type { Sqlite } from '../storage/sqlite-index/migrator'
import type { MarketKind } from '@/domain/models/market'
import type { SubmissionStatus } from '@/domain/models/submission'

export interface MarketRecord {
  readonly id: string
  readonly kind: string
  readonly name: string
}

export interface SubmissionRecord {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly marketId: string
  readonly marketName: string | null
  readonly marketKind: string | null
  readonly documentId: string | null
  readonly documentTitle: string | null
  readonly manuscriptRev: string | null
  readonly submittedOn: string | null
  readonly deadlineOn: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SubmissionEventRecord {
  readonly id: string
  readonly kind: string
  readonly status: string | null
  readonly body: string | null
  readonly occurredOn: string
}

export interface NewMarket {
  id: string
  kind: MarketKind
  name: string
}

export interface NewSubmission {
  id: string
  title: string
  marketId: string
  documentId: string | null
  manuscriptRev: string | null
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
}

export interface NewEvent {
  id: string
  submissionId: string
  kind: string
  status: string | null
  body: string | null
  occurredOn: string
}

interface SubmissionRow {
  id: string
  title: string
  status: string
  market_id: string
  market_name: string | null
  market_kind: string | null
  document_id: string | null
  document_title: string | null
  manuscript_rev: string | null
  submitted_on: string | null
  deadline_on: string | null
  created_at: string
  updated_at: string
}

export class QueryTrackerRepository {
  constructor(private readonly db: Sqlite) {}

  markets(): MarketRecord[] {
    return this.db.selectRows<MarketRecord>('SELECT id, kind, name FROM markets ORDER BY name;')
  }

  insertMarket(market: NewMarket): void {
    this.db.run('INSERT INTO markets (id, kind, name) VALUES (?, ?, ?);', [
      market.id,
      market.kind,
      market.name,
    ])
  }

  submissions(): SubmissionRecord[] {
    return this.db
      .selectRows<SubmissionRow>(
        `SELECT s.id, s.title, s.status, s.market_id,
                m.name AS market_name, m.kind AS market_kind,
                s.document_id, d.title AS document_title, s.manuscript_rev,
                s.submitted_on, s.deadline_on, s.created_at, s.updated_at
           FROM submissions s
           JOIN markets m ON m.id = s.market_id
           LEFT JOIN documents d ON d.id = s.document_id
          ORDER BY s.updated_at DESC;`,
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        marketId: r.market_id,
        marketName: r.market_name,
        marketKind: r.market_kind,
        documentId: r.document_id,
        documentTitle: r.document_title,
        manuscriptRev: r.manuscript_rev,
        submittedOn: r.submitted_on,
        deadlineOn: r.deadline_on,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
  }

  insertSubmission(s: NewSubmission): void {
    this.db.run(
      `INSERT INTO submissions
         (id, market_id, document_id, manuscript_rev, title, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        s.id,
        s.marketId,
        s.documentId,
        s.manuscriptRev,
        s.title,
        s.status,
        s.createdAt,
        s.updatedAt,
      ],
    )
  }

  statusOf(id: string): string | null {
    return (
      this.db.selectRows<{ status: string }>('SELECT status FROM submissions WHERE id = ?;', [
        id,
      ])[0]?.status ?? null
    )
  }

  updateStatus(id: string, status: SubmissionStatus, updatedAt: string): void {
    this.db.run('UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?;', [
      status,
      updatedAt,
      id,
    ])
  }

  addEvent(event: NewEvent): void {
    this.db.run(
      `INSERT INTO submission_events (id, submission_id, kind, status, body, occurred_on)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [event.id, event.submissionId, event.kind, event.status, event.body, event.occurredOn],
    )
  }

  eventsFor(submissionId: string): SubmissionEventRecord[] {
    return this.db.selectRows<SubmissionEventRecord>(
      `SELECT id, kind, status, body, occurred_on AS occurredOn
         FROM submission_events WHERE submission_id = ? ORDER BY occurred_on DESC;`,
      [submissionId],
    )
  }
}
