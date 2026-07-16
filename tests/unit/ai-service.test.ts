// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { summarizeDocument, checkConsistency, type AiDeps } from '@/data/ai/ai-service'
import type { AiClient } from '@/data/ai/ai-client'

class FakeAi implements AiClient {
  public lastPrompt = ''
  constructor(private readonly reply: string) {}
  async isAvailable(): Promise<boolean> {
    return true
  }
  async generate(prompt: string): Promise<string> {
    this.lastPrompt = prompt
    return this.reply
  }
}

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'
let counter = 0
const generateId = (): string => `id-${++counter}`

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
  counter = 0
})

describe('AI service', () => {
  it('summarizes into a writable workspace and never mutates canon', async () => {
    const store = new MemoryFileStore({
      'projects/glass/manuscript/01.md':
        '---\nid: ch1\ntitle: Chapter One\n---\nMara arrives at the glass house.\n',
    })
    await reconcile(store, db, { now, generateId })
    const ai = new FakeAi('A concise summary.')
    const deps: AiDeps = { store, db, ai, now, generateId }

    const result = await summarizeDocument(deps, 'projects/glass/manuscript/01.md', 'test-model')

    expect(result.workspacePath.startsWith('workspaces/')).toBe(true)
    expect(result.content).toBe('A concise summary.')
    expect(store.peek(result.workspacePath)).toContain('A concise summary.')
    // canon body untouched
    expect(store.peek('projects/glass/manuscript/01.md')).toContain(
      'Mara arrives at the glass house.',
    )
    // ai_run logged (layer 3 trigger allowed it → writable workspace)
    expect(
      db.selectRows<{ n: number }>("SELECT count(*) AS n FROM ai_runs WHERE task = 'summarize';")[0]
        ?.n,
    ).toBe(1)
    // prompt fed the real body (retrieval, not invention)
    expect(ai.lastPrompt).toContain('Mara arrives at the glass house.')
  })

  it('checks consistency over story-bible docs only', async () => {
    const store = new MemoryFileStore({
      'story-bible/characters/mara.md': '---\nid: mara\ntitle: Mara\n---\nAge 30.\n',
      'story-bible/characters/mara-b.md': '---\nid: marab\ntitle: Mara (draft)\n---\nAge 42.\n',
      'notebook/note.md': '---\nid: n1\ntitle: Note\n---\nIgnore me.\n',
    })
    await reconcile(store, db, { now, generateId })
    const ai = new FakeAi('Possible age conflict.')

    const result = await checkConsistency({ store, db, ai, now, generateId }, 'test-model')

    expect(result.workspacePath).toBe('workspaces/ai/consistency.md')
    expect(store.peek('workspaces/ai/consistency.md')).toContain('Possible age conflict.')
    expect(ai.lastPrompt).toContain('Age 30.')
    expect(ai.lastPrompt).toContain('Age 42.')
    expect(ai.lastPrompt).not.toContain('Ignore me.')
  })

  it('indexes the AI output as a document in the writable workspace', async () => {
    const store = new MemoryFileStore({ 'notebook/n.md': '---\nid: n1\ntitle: N\n---\nBody.\n' })
    await reconcile(store, db, { now, generateId })
    await summarizeDocument(
      { store, db, ai: new FakeAi('S'), now, generateId },
      'notebook/n.md',
      'm',
    )
    const row = db.selectRows<{ workspace_id: string }>(
      "SELECT workspace_id FROM documents WHERE rel_path LIKE 'workspaces/ai/%';",
    )[0]
    expect(row?.workspace_id).toBe('ws-workspaces')
  })
})
