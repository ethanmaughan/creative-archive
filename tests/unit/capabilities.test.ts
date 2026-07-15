import { describe, it, expect } from 'vitest'
import { createAiFileStore } from '@/data/repositories/capabilities'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'

describe('AI FileStore facade (protected-workspace guarantee, layer 1)', () => {
  it('allows writes inside writable workspaces', async () => {
    const base = new MemoryFileStore()
    const ai = createAiFileStore(base)
    await ai.writeTextFile('workspaces/scratch/idea.md', 'brainstorm')
    expect(base.peek('workspaces/scratch/idea.md')).toBe('brainstorm')
  })

  it('blocks writes to canonical paths', async () => {
    const ai = createAiFileStore(new MemoryFileStore())
    await expect(ai.writeTextFile('projects/glass/manuscript/01.md', 'tampered')).rejects.toThrow(
      /confined/,
    )
  })

  it('blocks deletes outside writable workspaces', async () => {
    const ai = createAiFileStore(new MemoryFileStore({ 'story-bible/characters/mara.md': 'x' }))
    await expect(ai.deleteFile('story-bible/characters/mara.md')).rejects.toThrow(/confined/)
  })

  it('still allows reads anywhere', async () => {
    const ai = createAiFileStore(
      new MemoryFileStore({ 'projects/a/manuscript/01.md': 'canon text' }),
    )
    expect(await ai.readTextFile('projects/a/manuscript/01.md')).toBe('canon text')
  })
})
