import { describe, it, expect } from 'vitest'
import { classifyKind, workspaceForPath, isIndexablePath } from '@/domain/models/workspace'

describe('workspace classification', () => {
  it('classifies documents by path', () => {
    expect(classifyKind('library/dune.md')).toBe('library-item')
    expect(classifyKind('story-bible/characters/mara.md')).toBe('character')
    expect(classifyKind('story-bible/locations/arrakis.md')).toBe('location')
    expect(classifyKind('spaces/glass/manuscript/01.md')).toBe('manuscript')
    expect(classifyKind('spaces/glass/scenes/s1.md')).toBe('scene')
    expect(classifyKind('research/topic.md')).toBe('research')
  })

  it('maps paths to workspaces with protection', () => {
    expect(workspaceForPath('spaces/x/manuscript/01.md')?.protection).toBe('canonical')
    expect(workspaceForPath('workspaces/scratch/a.md')?.protection).toBe('writable')
    expect(workspaceForPath('unknown/a.md')).toBeUndefined()
  })

  it('only indexes markdown inside known workspaces', () => {
    expect(isIndexablePath('research/a.md')).toBe(true)
    expect(isIndexablePath('research/a.png')).toBe(false)
    expect(isIndexablePath('unknown/a.md')).toBe(false)
    expect(isIndexablePath('.creative-archive/index.md')).toBe(false)
  })
})
