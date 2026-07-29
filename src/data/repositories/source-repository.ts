/** Read access to the derived `source_files` index (read-only foreign files + their FTS). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface SourceRecord {
  readonly relPath: string
  readonly ext: string
  readonly category: string
  readonly title: string
  readonly size: number
  readonly hasText: boolean
}

interface SourceRow {
  rel_path: string
  ext: string
  category: string
  title: string
  size: number
  has_text: number
}

const COLUMNS = 'rel_path, ext, category, title, size, has_text'

function toRecord(row: SourceRow): SourceRecord {
  return {
    relPath: row.rel_path,
    ext: row.ext,
    category: row.category,
    title: row.title,
    size: row.size,
    hasText: row.has_text === 1,
  }
}

export class SourceRepository {
  constructor(private readonly db: Sqlite) {}

  all(): SourceRecord[] {
    return this.db
      .selectRows<SourceRow>(`SELECT ${COLUMNS} FROM source_files ORDER BY rel_path;`)
      .map(toRecord)
  }

  getByPath(relPath: string): SourceRecord | null {
    const row = this.db.selectRows<SourceRow>(
      `SELECT ${COLUMNS} FROM source_files WHERE rel_path = ?;`,
      [relPath],
    )[0]
    return row ? toRecord(row) : null
  }

  /** Full-text search over extracted source text, best matches first. */
  search(query: string, limit = 20): SourceRecord[] {
    const cols = COLUMNS.split(', ')
      .map((c) => `s.${c}`)
      .join(', ')
    return this.db
      .selectRows<SourceRow>(
        `SELECT ${cols}
           FROM source_files_fts f
           JOIN source_files s ON s.id = f.rowid
          WHERE source_files_fts MATCH ?
          ORDER BY rank
          LIMIT ?;`,
        [query, limit],
      )
      .map(toRecord)
  }
}
