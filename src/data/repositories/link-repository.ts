/** Read access to the derived wikilink graph (backlinks / "linked references"). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

/** A document that links to a target (by resolved id or by written text). */
export interface ReferenceSource {
  readonly sourceId: string
  readonly title: string | null
  readonly relPath: string
  readonly kind: string
}

interface SourceRow {
  id: string
  title: string | null
  rel_path: string
  kind: string
}

export class LinkRepository {
  constructor(private readonly db: Sqlite) {}

  /** Documents that link TO a resolved document via a `[[wikilink]]`, alphabetical by title. */
  referencesTo(targetId: string): ReferenceSource[] {
    return this.db
      .selectRows<SourceRow>(
        `SELECT DISTINCT d.id, d.title, d.rel_path, d.kind
           FROM links l
           JOIN documents d ON d.id = l.source_id
          WHERE l.target_id = ?
          ORDER BY lower(COALESCE(d.title, d.rel_path));`,
        [targetId],
      )
      .map(toSource)
  }

  /** Documents that link to a bare topic by its written text (for un-filed `[[topics]]`).
   *  `keys` must be lowercased/trimmed (via `wikilinkKey`). */
  referencesToText(keys: readonly string[]): ReferenceSource[] {
    if (keys.length === 0) return []
    const placeholders = keys.map(() => '?').join(', ')
    return this.db
      .selectRows<SourceRow>(
        `SELECT DISTINCT d.id, d.title, d.rel_path, d.kind
           FROM links l
           JOIN documents d ON d.id = l.source_id
          WHERE lower(trim(l.target_text)) IN (${placeholders})
          ORDER BY lower(COALESCE(d.title, d.rel_path));`,
        [...keys],
      )
      .map(toSource)
  }
}

function toSource(r: SourceRow): ReferenceSource {
  return { sourceId: r.id, title: r.title, relPath: r.rel_path, kind: r.kind }
}
