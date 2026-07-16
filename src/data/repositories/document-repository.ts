/** Read access to the derived document index (including full-text search). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface DocumentRecord {
  readonly id: string
  readonly kind: string
  readonly relPath: string
  readonly title: string | null
  readonly workspaceId: string | null
  readonly contentHash: string
}

interface DocumentRow {
  id: string
  kind: string
  rel_path: string
  title: string | null
  workspace_id: string | null
  content_hash: string
}

function toRecord(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    kind: row.kind,
    relPath: row.rel_path,
    title: row.title,
    workspaceId: row.workspace_id,
    contentHash: row.content_hash,
  }
}

const COLUMNS = 'id, kind, rel_path, title, workspace_id, content_hash'

export class DocumentRepository {
  constructor(private readonly db: Sqlite) {}

  getById(id: string): DocumentRecord | null {
    const row = this.db.selectRows<DocumentRow>(`SELECT ${COLUMNS} FROM documents WHERE id = ?;`, [
      id,
    ])[0]
    return row ? toRecord(row) : null
  }

  getByPath(relPath: string): DocumentRecord | null {
    const row = this.db.selectRows<DocumentRow>(
      `SELECT ${COLUMNS} FROM documents WHERE rel_path = ?;`,
      [relPath],
    )[0]
    return row ? toRecord(row) : null
  }

  all(): DocumentRecord[] {
    return this.db
      .selectRows<DocumentRow>(`SELECT ${COLUMNS} FROM documents ORDER BY rel_path;`)
      .map(toRecord)
  }

  /** Full-text search over the FTS index, best matches first. Optionally filtered by kind. */
  search(query: string, options: { limit?: number; kind?: string } = {}): DocumentRecord[] {
    const limit = options.limit ?? 20
    const cols = COLUMNS.split(', ')
      .map((c) => `d.${c}`)
      .join(', ')
    const kindClause = options.kind !== undefined ? 'AND d.kind = ?' : ''
    const params = options.kind !== undefined ? [query, options.kind, limit] : [query, limit]
    return this.db
      .selectRows<DocumentRow>(
        `SELECT ${cols}
           FROM documents_fts f
           JOIN documents d ON d.rowid = f.rowid
          WHERE documents_fts MATCH ? ${kindClause}
          ORDER BY rank
          LIMIT ?;`,
        params,
      )
      .map(toRecord)
  }
}
