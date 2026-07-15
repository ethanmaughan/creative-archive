/**
 * WASM SQLite driver (ADR-0002, decision A: official `@sqlite.org/sqlite-wasm`).
 *
 * Two open modes behind one `Sqlite` port:
 *   - `openOpfs`   — persistent, backed by the OPFS **SAHPool** VFS. Chosen because it
 *                    does NOT require COOP/COEP cross-origin isolation and runs on the
 *                    main thread. This is the app's real store.
 *   - `openInMemory` — transient; used by tests and ephemeral work.
 *
 * WAL is intentionally NOT enabled (design override): the SAHPool VFS is single-connection
 * synchronous, so WAL buys nothing on this target. `foreign_keys` is enabled per connection.
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import type { Sqlite } from './migrator'

/** The subset of the sqlite-wasm oo1 DB surface we rely on. */
interface Oo1Db {
  exec(sql: string): void
  selectObjects(sql: string): Array<Record<string, unknown>>
  close(): void
}

interface OpfsPoolUtil {
  OpfsSAHPoolDb: new (filename: string) => Oo1Db
}

interface Sqlite3Static {
  oo1: { DB: new (filename: string, flags?: string) => Oo1Db }
  installOpfsSAHPoolVfs(options: { name: string }): Promise<OpfsPoolUtil>
}

class WasmSqlite implements Sqlite {
  constructor(private readonly db: Oo1Db) {}

  exec(sql: string): void {
    this.db.exec(sql)
  }

  selectRows<T = Record<string, unknown>>(sql: string): T[] {
    return this.db.selectObjects(sql) as T[]
  }

  close(): void {
    this.db.close()
  }
}

let modulePromise: Promise<Sqlite3Static> | null = null

async function loadModule(): Promise<Sqlite3Static> {
  modulePromise ??= sqlite3InitModule() as unknown as Promise<Sqlite3Static>
  return modulePromise
}

/** Transient in-memory database (tests, scratch). */
export async function openInMemory(): Promise<Sqlite> {
  const sqlite3 = await loadModule()
  const db = new sqlite3.oo1.DB(':memory:', 'c')
  db.exec('PRAGMA foreign_keys = ON;')
  return new WasmSqlite(db)
}

/** Persistent database in the browser's OPFS via the SAHPool VFS. Browser-only. */
export async function openOpfs(filename = 'creative-archive.sqlite'): Promise<Sqlite> {
  const sqlite3 = await loadModule()
  const poolUtil = await sqlite3.installOpfsSAHPoolVfs({ name: 'creative-archive' })
  const db = new poolUtil.OpfsSAHPoolDb(`/${filename}`)
  db.exec('PRAGMA foreign_keys = ON;')
  return new WasmSqlite(db)
}
