/** Read access to the typed library projection (media metadata joined to documents). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface LibraryItemRecord {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly mediaType: string
  readonly creator: string | null
  readonly year: number | null
  readonly rating: number | null
}

interface LibraryRow {
  id: string
  rel_path: string
  title: string | null
  media_type: string
  creator: string | null
  year: number | null
  rating: number | null
}

export class LibraryRepository {
  constructor(private readonly db: Sqlite) {}

  all(): LibraryItemRecord[] {
    return this.db
      .selectRows<LibraryRow>(
        `SELECT d.id, d.rel_path, d.title, l.media_type, l.creator, l.year, l.rating
           FROM library_items l
           JOIN documents d ON d.id = l.document_id
          ORDER BY l.media_type, d.title;`,
      )
      .map((r) => ({
        id: r.id,
        relPath: r.rel_path,
        title: r.title,
        mediaType: r.media_type,
        creator: r.creator,
        year: r.year,
        rating: r.rating,
      }))
  }
}
