/** Read access to the typed library projection (media metadata joined to documents). */
import type { Sqlite } from '../storage/sqlite-index/migrator'
import type { LibrarySort } from '../worker/types'

export interface LibraryItemRecord {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly mediaType: string
  readonly creator: string | null
  readonly year: number | null
  readonly rating: number | null
  readonly consumedOn: string | null
  readonly logged: string | null
}

interface LibraryRow {
  id: string
  rel_path: string
  title: string | null
  media_type: string
  creator: string | null
  year: number | null
  rating: number | null
  consumed_on: string | null
  logged: string | null
}

/** Build a chronological ORDER BY: rows missing the chosen date sort last regardless of
 *  direction, then by the date, then by title as a stable tiebreak. */
function orderClause(sort: LibrarySort | undefined): string {
  if (!sort) return 'l.media_type, d.title'
  const column = sort.by === 'consumed' ? 'l.consumed_on' : 'l.logged'
  const direction = sort.dir === 'asc' ? 'ASC' : 'DESC'
  return `(${column} IS NULL) ASC, ${column} ${direction}, d.title ASC`
}

export class LibraryRepository {
  constructor(private readonly db: Sqlite) {}

  all(sort?: LibrarySort): LibraryItemRecord[] {
    return this.db
      .selectRows<LibraryRow>(
        `SELECT d.id, d.rel_path, d.title, l.media_type, l.creator, l.year, l.rating,
                l.consumed_on, l.logged
           FROM library_items l
           JOIN documents d ON d.id = l.document_id
          ORDER BY ${orderClause(sort)};`,
      )
      .map((r) => ({
        id: r.id,
        relPath: r.rel_path,
        title: r.title,
        mediaType: r.media_type,
        creator: r.creator,
        year: r.year,
        rating: r.rating,
        consumedOn: r.consumed_on,
        logged: r.logged,
      }))
  }
}
