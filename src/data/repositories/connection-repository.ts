/** Read/write access to the polymorphic connection graph (document↔document edges). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface ConnectionEdge {
  readonly id: string
  readonly relationship: string | null
  readonly sourceId: string
  readonly sourceTitle: string | null
  readonly sourceRelPath: string | null
  readonly targetId: string
  readonly targetTitle: string | null
  readonly targetRelPath: string | null
}

interface EdgeRow {
  id: string
  relationship: string | null
  source_id: string
  source_title: string | null
  source_rel_path: string | null
  target_id: string
  target_title: string | null
  target_rel_path: string | null
}

const SELECT = `SELECT c.id, c.relationship,
    c.source_id, sd.title AS source_title, sd.rel_path AS source_rel_path,
    c.target_id, td.title AS target_title, td.rel_path AS target_rel_path
  FROM connections c
  LEFT JOIN documents sd ON sd.id = c.source_id
  LEFT JOIN documents td ON td.id = c.target_id
  WHERE c.source_type = 'document' AND c.target_type = 'document'`

function toEdge(r: EdgeRow): ConnectionEdge {
  return {
    id: r.id,
    relationship: r.relationship,
    sourceId: r.source_id,
    sourceTitle: r.source_title,
    sourceRelPath: r.source_rel_path,
    targetId: r.target_id,
    targetTitle: r.target_title,
    targetRelPath: r.target_rel_path,
  }
}

export interface NewEdge {
  id: string
  sourceId: string
  targetId: string
  relationship: string | null
  createdAt: string
}

export class ConnectionRepository {
  constructor(private readonly db: Sqlite) {}

  all(): ConnectionEdge[] {
    return this.db.selectRows<EdgeRow>(`${SELECT} ORDER BY c.created_at DESC;`).map(toEdge)
  }

  forDocument(documentId: string): ConnectionEdge[] {
    return this.db
      .selectRows<EdgeRow>(
        `${SELECT} AND (c.source_id = ? OR c.target_id = ?) ORDER BY c.created_at DESC;`,
        [documentId, documentId],
      )
      .map(toEdge)
  }

  insert(edge: NewEdge): void {
    this.db.run(
      `INSERT OR IGNORE INTO connections
         (id, source_type, source_id, target_type, target_id, relationship, created_at)
       VALUES (?, 'document', ?, 'document', ?, ?, ?);`,
      [edge.id, edge.sourceId, edge.targetId, edge.relationship, edge.createdAt],
    )
  }

  remove(id: string): void {
    this.db.run('DELETE FROM connections WHERE id = ?;', [id])
  }
}
