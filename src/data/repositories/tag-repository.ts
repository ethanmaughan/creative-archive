/** Read access to the tag graph (tags + taggings), derived from frontmatter + inline `#tags`. */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface TagCount {
  readonly name: string
  readonly count: number
}

export interface TaggedDocument {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly kind: string
}

export class TagRepository {
  constructor(private readonly db: Sqlite) {}

  /** All tags applied to documents, with document counts. */
  all(): TagCount[] {
    return this.db.selectRows<TagCount>(
      `SELECT t.name AS name, count(*) AS count
         FROM taggings tg
         JOIN tags t ON t.id = tg.tag_id
        WHERE tg.entity_type = 'document'
        GROUP BY t.id
        ORDER BY t.name;`,
    )
  }

  /** Documents carrying a given tag. */
  documentsForTag(name: string): TaggedDocument[] {
    return this.db
      .selectRows<{ id: string; rel_path: string; title: string | null; kind: string }>(
        `SELECT d.id, d.rel_path, d.title, d.kind
           FROM taggings tg
           JOIN documents d ON d.id = tg.entity_id
          WHERE tg.tag_id = ? AND tg.entity_type = 'document'
          ORDER BY d.title;`,
        [name],
      )
      .map((r) => ({ id: r.id, relPath: r.rel_path, title: r.title, kind: r.kind }))
  }

  /** Tag names applied to a single document. */
  forDocument(documentId: string): string[] {
    return this.db
      .selectRows<{ tag_id: string }>(
        "SELECT tag_id FROM taggings WHERE entity_type = 'document' AND entity_id = ? ORDER BY tag_id;",
        [documentId],
      )
      .map((r) => r.tag_id)
  }
}
