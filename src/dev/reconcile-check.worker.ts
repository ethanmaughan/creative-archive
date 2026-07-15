/**
 * DEV/TEST-ONLY worker. Exercises the real FSA adapter against an OPFS directory handle
 * (same interface showDirectoryPicker returns), then runs the reconciler over it and
 * reports the outcome. Driven by tests/e2e/reconcile-fsa.spec.ts.
 */
import { FsaFileStore } from '@/data/storage/file-store/fsa-adapter/fsa-file-store'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'

export interface ReconcileCheckResult {
  readonly state: 'ok' | 'fail'
  readonly message: string
}

function post(result: ReconcileCheckResult): void {
  ;(self as unknown as { postMessage(message: unknown): void }).postMessage(result)
}

async function run(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory()
    // Start from a clean tree so counts are deterministic across runs.
    for (const dir of ['research', 'story-bible']) {
      await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
    }

    const store = new FsaFileStore(root)
    await store.writeTextFile('research/a.md', '# Note A\nSpice and sand.\n')
    await store.writeTextFile('story-bible/characters/mara.md', '---\ntitle: Mara\n---\nHero.\n')

    const db = await openInMemory()
    applyMigrations(db, MIGRATIONS)
    const result = await reconcile(store, db)

    const rewritten = await store.readTextFile('research/a.md')
    const idInjected = rewritten.includes('id:')
    const docs = db.selectRows<{ n: number }>('SELECT count(*) AS n FROM documents;')[0]?.n ?? 0
    const ftsHits =
      db.selectRows<{ n: number }>(
        "SELECT count(*) AS n FROM documents_fts WHERE documents_fts MATCH 'spice';",
      )[0]?.n ?? 0

    post({
      state: 'ok',
      message: `FSA+reconcile OK — inserted=${result.inserted}, docs=${docs}, idInjected=${idInjected}, ftsHits=${ftsHits}`,
    })
  } catch (error) {
    post({ state: 'fail', message: (error as Error).message })
  }
}

void run()
