/** Read access to the derived document index (including full-text search). */
import type { Sqlite, SqlValue } from '../storage/sqlite-index/migrator'

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

  /** Declarative query used by inline ` ```query ` blocks. All filters AND together; values are
   *  parameterized (never interpolated). Sorts by title. */
  query(opts: {
    kind?: string | null
    tag?: string | null
    pathPrefix?: string | null
    sortDir?: 'asc' | 'desc'
    limit?: number
  }): DocumentRecord[] {
    const cols = COLUMNS.split(', ')
      .map((c) => `d.${c}`)
      .join(', ')
    const join = opts.tag
      ? "JOIN taggings tg ON tg.entity_type = 'document' AND tg.entity_id = d.id"
      : ''
    const clauses: string[] = []
    const params: SqlValue[] = []
    if (opts.tag) {
      clauses.push('tg.tag_id = ?')
      params.push(opts.tag)
    }
    if (opts.kind) {
      clauses.push('d.kind = ?')
      params.push(opts.kind)
    }
    if (opts.pathPrefix) {
      clauses.push('d.rel_path LIKE ?')
      params.push(`${opts.pathPrefix}%`)
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const dir = opts.sortDir === 'desc' ? 'DESC' : 'ASC'
    params.push(opts.limit ?? 25)
    return this.db
      .selectRows<DocumentRow>(
        `SELECT DISTINCT ${cols} FROM documents d ${join} ${where}
          ORDER BY d.title ${dir} LIMIT ?;`,
        params,
      )
      .map(toRecord)
  }

  /** Full-text search over the FTS index, best matches first. Optionally filtered by kind and
   *  narrowed to a path prefix (used to scope search to one space). */
  search(
    query: string,
    options: { limit?: number; kind?: string; pathPrefix?: string } = {},
  ): DocumentRecord[] {
    const limit = options.limit ?? 20
    const cols = COLUMNS.split(', ')
      .map((c) => `d.${c}`)
      .join(', ')
    const clauses: string[] = []
    const params: SqlValue[] = [query]
    if (options.kind !== undefined) {
      clauses.push('AND d.kind = ?')
      params.push(options.kind)
    }
    if (options.pathPrefix !== undefined) {
      clauses.push('AND d.rel_path LIKE ?')
      params.push(`${options.pathPrefix}%`)
    }
    params.push(limit)
    return this.db
      .selectRows<DocumentRow>(
        `SELECT ${cols}
           FROM documents_fts f
           JOIN documents d ON d.rowid = f.rowid
          WHERE documents_fts MATCH ? ${clauses.join(' ')}
          ORDER BY rank
          LIMIT ?;`,
        params,
      )
      .map(toRecord)
  }
}
