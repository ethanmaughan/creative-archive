/** Read access to spaces — projected from the `space` documents plus a doc count per space. */
import type { Sqlite } from '../storage/sqlite-index/migrator'
import { isSpaceType, spaceSlugFromPath, type SpaceType } from '@/domain/models/space'

export interface SpaceRecord {
  readonly id: string
  readonly slug: string
  readonly relPath: string
  readonly title: string | null
  readonly spaceType: SpaceType
  readonly docCount: number
}

interface SpaceDocRow {
  id: string
  rel_path: string
  title: string | null
  frontmatter: string | null
}

function spaceTypeOf(frontmatter: string | null): SpaceType {
  if (!frontmatter) return 'general'
  try {
    const parsed: unknown = JSON.parse(frontmatter)
    const value =
      parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)['spaceType']
        : undefined
    return isSpaceType(value) ? value : 'general'
  } catch {
    return 'general'
  }
}

export class SpaceRepository {
  constructor(private readonly db: Sqlite) {}

  all(): SpaceRecord[] {
    const rows = this.db.selectRows<SpaceDocRow>(
      `SELECT id, rel_path, title, frontmatter FROM documents WHERE kind = 'space' ORDER BY title;`,
    )
    return rows.flatMap((row) => {
      const slug = spaceSlugFromPath(row.rel_path)
      if (!slug) return []
      const docCount =
        this.db.selectRows<{ n: number }>(
          `SELECT count(*) AS n FROM documents WHERE rel_path LIKE ? AND kind != 'space';`,
          [`spaces/${slug}/%`],
        )[0]?.n ?? 0
      return [
        {
          id: row.id,
          slug,
          relPath: row.rel_path,
          title: row.title,
          spaceType: spaceTypeOf(row.frontmatter),
          docCount,
        },
      ]
    })
  }
}
