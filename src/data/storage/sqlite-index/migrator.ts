/**
 * Minimal forward-only migration runner. Applies ordered SQL migrations that have
 * not yet been recorded in the `__migrations` table, each inside a transaction.
 *
 * It is driver-agnostic: it talks to the `Sqlite` port below, which is implemented
 * for WASM SQLite (browser OPFS + in-memory) in `client.ts`. Migration SQL may
 * contain multiple statements — `exec` is expected to run them all.
 */

/** Values bindable to a parameterized statement. */
export type SqlValue = string | number | null

/** The narrow database port the index layer depends on. */
export interface Sqlite {
  /** Execute one or more SQL statements (no parameters) — used for migrations. */
  exec(sql: string): void
  /** Execute a single parameterized statement. */
  run(sql: string, params?: readonly SqlValue[]): void
  /** Run a (optionally parameterized) query and return rows as plain objects. */
  selectRows<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): T[]
  close(): void
}

export interface Migration {
  readonly name: string
  readonly sql: string
}

export interface MigrationResult {
  readonly applied: readonly string[]
  readonly alreadyApplied: readonly string[]
}

const MIGRATIONS_TABLE = '__migrations'

export function applyMigrations(
  db: Sqlite,
  migrations: readonly Migration[],
  now: () => string = () => new Date().toISOString(),
): MigrationResult {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);`,
  )

  const recorded = new Set(
    db.selectRows<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE};`).map((r) => r.name),
  )

  const applied: string[] = []
  const alreadyApplied: string[] = []

  for (const migration of migrations) {
    if (recorded.has(migration.name)) {
      alreadyApplied.push(migration.name)
      continue
    }

    db.exec('BEGIN;')
    try {
      db.exec(migration.sql)
      db.run(`INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at) VALUES (?, ?);`, [
        migration.name,
        now(),
      ])
      db.exec('COMMIT;')
    } catch (error) {
      db.exec('ROLLBACK;')
      throw new Error(`Migration "${migration.name}" failed: ${(error as Error).message}`, {
        cause: error,
      })
    }
    applied.push(migration.name)
  }

  return { applied, alreadyApplied }
}
