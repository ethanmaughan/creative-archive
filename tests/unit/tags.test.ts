// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile, reindexOne } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { TagRepository } from '@/data/repositories/tag-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('tag graph', () => {
  it('collects inline #tags and frontmatter tags into taggings', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md':
        '---\nid: a\ntitle: Note A\ntags: [war]\n---\nAbout #fantasy and a #mentor figure.\n',
    })
    await reconcile(fs, db, { now })
    const repo = new TagRepository(db)
    expect(repo.forDocument('a')).toEqual(['fantasy', 'mentor', 'war'])
  })

  it('counts documents per tag and lists them', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: A\n---\n#fantasy\n',
      'notebook/b.md': '---\nid: b\ntitle: B\n---\n#fantasy #mystery\n',
    })
    await reconcile(fs, db, { now })
    const repo = new TagRepository(db)
    expect(repo.all()).toEqual([
      { name: 'fantasy', count: 2 },
      { name: 'mystery', count: 1 },
    ])
    expect(repo.documentsForTag('fantasy').map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('updates taggings when a document is edited', async () => {
    const fs = new MemoryFileStore({ 'notebook/a.md': '---\nid: a\ntitle: A\n---\n#draft\n' })
    await reconcile(fs, db, { now })
    expect(new TagRepository(db).forDocument('a')).toEqual(['draft'])

    await fs.writeTextFile('notebook/a.md', '---\nid: a\ntitle: A\n---\n#final\n')
    await reindexOne(fs, db, 'notebook/a.md', { now })
    expect(new TagRepository(db).forDocument('a')).toEqual(['final'])
    // the now-orphaned "draft" tag drops out of the counts
    expect(new TagRepository(db).all().map((t) => t.name)).toEqual(['final'])
  })

  it('clears taggings when a document is deleted', async () => {
    const fs = new MemoryFileStore({ 'notebook/a.md': '---\nid: a\ntitle: A\n---\n#fantasy\n' })
    await reconcile(fs, db, { now })
    await fs.deleteFile('notebook/a.md')
    await reindexOne(fs, db, 'notebook/a.md', { now })
    expect(new TagRepository(db).all()).toEqual([])
  })
})
