// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildTree, type TreeDirNode } from '@/features/files/build-tree'
import type { TreeEntryDTO } from '@/data/worker/types'

const doc = (relPath: string): TreeEntryDTO => ({
  relPath,
  name: relPath.split('/').pop() ?? relPath,
  nodeKind: 'document',
  docKind: 'note',
})

const source = (relPath: string): TreeEntryDTO => ({
  relPath,
  name: relPath.split('/').pop() ?? relPath,
  nodeKind: 'source',
  category: 'text',
  ext: 'txt',
  hasText: true,
})

describe('buildTree', () => {
  it('nests files under their folders', () => {
    const tree = buildTree([doc('research/a.md'), doc('research/deep/b.md'), source('top.txt')])
    // roots: folder "research" (dir first), then file "top.txt"
    expect(tree.map((n) => (n.type === 'dir' ? `dir:${n.name}` : `file:${n.name}`))).toEqual([
      'dir:research',
      'file:top.txt',
    ])
    const research = tree[0] as TreeDirNode
    expect(research.path).toBe('research')
    const names = research.children.map((c) =>
      c.type === 'dir' ? `dir:${c.name}` : `file:${c.name}`,
    )
    // folder "deep" sorts before file "a.md"
    expect(names).toEqual(['dir:deep', 'file:a.md'])
  })

  it('sorts folders before files and alphabetically', () => {
    const tree = buildTree([source('z.txt'), source('a.txt'), doc('m/x.md')])
    expect(tree.map((n) => n.name)).toEqual(['m', 'a.txt', 'z.txt'])
  })

  it('returns an empty tree for no entries', () => {
    expect(buildTree([])).toEqual([])
  })
})
