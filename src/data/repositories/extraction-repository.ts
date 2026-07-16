/** Read access to the queryable creative-extraction projection. */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface FacetEntry {
  readonly id: string
  readonly relPath: string
  readonly docTitle: string | null
  readonly facet: string
  readonly content: string
}

interface FacetRow {
  id: string
  rel_path: string
  title: string | null
  facet: string
  content: string
}

const SELECT = `SELECT f.id, f.facet, f.content, d.rel_path, d.title
                  FROM extraction_facets f
                  JOIN documents d ON d.id = f.document_id`

export class ExtractionRepository {
  constructor(private readonly db: Sqlite) {}

  all(facet?: string): FacetEntry[] {
    const rows =
      facet !== undefined
        ? this.db.selectRows<FacetRow>(`${SELECT} WHERE f.facet = ? ORDER BY d.title;`, [facet])
        : this.db.selectRows<FacetRow>(`${SELECT} ORDER BY f.facet, d.title;`)
    return rows.map((r) => ({
      id: r.id,
      relPath: r.rel_path,
      docTitle: r.title,
      facet: r.facet,
      content: r.content,
    }))
  }
}
