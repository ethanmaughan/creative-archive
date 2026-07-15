/** Read access to the workspace registry (protection levels). */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export type Protection = 'canonical' | 'writable'

export interface WorkspaceRecord {
  readonly id: string
  readonly name: string
  readonly relPath: string
  readonly protection: Protection
}

interface WorkspaceRow {
  id: string
  name: string
  rel_path: string
  protection: Protection
}

export class WorkspaceRepository {
  constructor(private readonly db: Sqlite) {}

  all(): WorkspaceRecord[] {
    return this.db
      .selectRows<WorkspaceRow>(
        'SELECT id, name, rel_path, protection FROM workspaces ORDER BY rel_path;',
      )
      .map((r) => ({ id: r.id, name: r.name, relPath: r.rel_path, protection: r.protection }))
  }

  isWritable(id: string): boolean {
    const row = this.db.selectRows<{ protection: Protection }>(
      'SELECT protection FROM workspaces WHERE id = ?;',
      [id],
    )[0]
    return row?.protection === 'writable'
  }
}
