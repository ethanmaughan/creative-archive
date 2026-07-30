/** Read access to the derived wikilink graph (backlinks / "linked references"). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface BacklinkRecord {
  readonly sourceId: string
  readonly title: string | null
  readonly relPath: string
}

interface BacklinkRow {
  source_id: string
  title: string | null
  rel_path: string
}

export class LinkRepository {
  constructor(private readonly db: Sqlite) {}

  /** Documents that link TO the given document via a resolved `[[wikilink]]`. */
  backlinks(targetId: string): BacklinkRecord[] {
    return this.db
      .selectRows<BacklinkRow>(
        `SELECT DISTINCT l.source_id, d.title, d.rel_path
           FROM links l
           JOIN documents d ON d.id = l.source_id
          WHERE l.target_id = ?
          ORDER BY d.title;`,
        [targetId],
      )
      .map((r) => ({ sourceId: r.source_id, title: r.title, relPath: r.rel_path }))
  }
}
