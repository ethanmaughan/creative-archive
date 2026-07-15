/**
 * DEV/TEST-ONLY worker. Runs the SQLite index against real browser OPFS (SAHPool VFS,
 * which requires a Worker context for createSyncAccessHandle), applies all migrations,
 * does an insert + query round-trip, and posts the outcome back to the page.
 *
 * This also demonstrates the intended production shape: SQLite runs off the main thread.
 */
import { openOpfs } from '@/data/storage/sqlite-index/client'
import { applyMigrations } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'

export interface DbCheckResult {
  readonly state: 'ok' | 'fail'
  readonly message: string
}

function post(result: DbCheckResult): void {
  ;(self as unknown as { postMessage(message: unknown): void }).postMessage(result)
}

async function run(): Promise<void> {
  try {
    const db = await openOpfs('creative-archive-e2e.sqlite')
    const result = applyMigrations(db, MIGRATIONS)
    db.exec(
      `INSERT OR IGNORE INTO workspaces (id, name, rel_path, protection, created_at)
       VALUES ('w-canon', 'Canon', 'projects', 'canonical', '2026-01-01T00:00:00Z');`,
    )
    const rows = db.selectRows<{ n: number }>('SELECT count(*) AS n FROM workspaces;')
    db.close()
    post({
      state: 'ok',
      message: `applied [${result.applied.join(', ')}], workspaces=${rows[0]?.n ?? 0}`,
    })
  } catch (error) {
    post({ state: 'fail', message: (error as Error).message })
  }
}

void run()
