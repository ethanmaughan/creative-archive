/**
 * AI orchestration: read canon, ask the local model, write the result ONLY into a writable
 * workspace (via the createAiFileStore facade — layer 1 of the protected-workspace guarantee),
 * log an ai_run (layer 3 trigger enforces writable-only), and re-index the output.
 *
 * Dependency-injected (store/db/ai) so it's fully testable with a fake AiClient.
 */
import { createAiFileStore } from '../repositories/capabilities'
import { type FileStore } from '../storage/file-store/file-store'
import { parseFrontmatter, serializeFrontmatter } from '../storage/file-store/frontmatter'
import { reindexOne } from '../storage/sqlite-index/reconciler'
import type { Sqlite } from '../storage/sqlite-index/migrator'
import { buildConsistencyPrompt, buildSummaryPrompt } from '@/domain/services/ai-prompts'
import { slugify } from '@/shared/slug'
import type { AiClient } from './ai-client'

export interface AiDeps {
  store: FileStore
  db: Sqlite
  ai: AiClient
  now?: () => string
  generateId?: () => string
}

export interface AiRunOutput {
  workspacePath: string
  content: string
}

function logRun(db: Sqlite, id: string, task: string, now: () => string): void {
  // workspace_id is a writable workspace; the ai_runs trigger would reject a canonical one.
  db.run(
    `INSERT INTO ai_runs (id, task, workspace_id, status, created_at)
     VALUES (?, ?, 'ws-workspaces', 'done', ?);`,
    [id, task, now()],
  )
}

async function writeToWorkspace(
  deps: AiDeps,
  relPath: string,
  title: string,
  content: string,
  now: () => string,
  generateId: () => string,
): Promise<void> {
  const aiStore = createAiFileStore(deps.store) // confined to workspaces/
  await aiStore.writeTextFile(relPath, serializeFrontmatter({ id: generateId(), title }, content))
  await reindexOne(deps.store, deps.db, relPath, { now, generateId })
}

export async function summarizeDocument(
  deps: AiDeps,
  relPath: string,
  model: string,
): Promise<AiRunOutput> {
  const now = deps.now ?? (() => new Date().toISOString())
  const generateId = deps.generateId ?? (() => crypto.randomUUID())

  const parsed = parseFrontmatter(await deps.store.readTextFile(relPath))
  const title = typeof parsed.data['title'] === 'string' ? parsed.data['title'] : relPath
  const summary = await deps.ai.generate(buildSummaryPrompt(title, parsed.body), model)

  const workspacePath = `workspaces/ai/summaries/${slugify(title)}.md`
  await writeToWorkspace(deps, workspacePath, `Summary — ${title}`, summary, now, generateId)
  logRun(deps.db, generateId(), 'summarize', now)
  return { workspacePath, content: summary }
}

export async function checkConsistency(deps: AiDeps, model: string): Promise<AiRunOutput> {
  const now = deps.now ?? (() => new Date().toISOString())
  const generateId = deps.generateId ?? (() => crypto.randomUUID())

  const rows = deps.db.selectRows<{ rel_path: string; title: string | null }>(
    `SELECT rel_path, title FROM documents
      WHERE kind IN ('character', 'location', 'world-rule')
      ORDER BY rel_path;`,
  )
  const docs: { title: string; body: string }[] = []
  for (const row of rows) {
    try {
      const parsed = parseFrontmatter(await deps.store.readTextFile(row.rel_path))
      docs.push({ title: row.title ?? row.rel_path, body: parsed.body })
    } catch {
      // File vanished between index and read; skip it.
    }
  }

  const findings = await deps.ai.generate(buildConsistencyPrompt(docs), model)
  const workspacePath = 'workspaces/ai/consistency.md'
  await writeToWorkspace(
    deps,
    workspacePath,
    'Story-bible consistency check',
    findings,
    now,
    generateId,
  )
  logRun(deps.db, generateId(), 'consistency', now)
  return { workspacePath, content: findings }
}
