/** Turn the flat file list into a nested folder tree for display. Pure. */
import type { TreeEntryDTO } from '@/data/worker/types'

export interface TreeFileNode {
  readonly type: 'file'
  readonly name: string
  readonly entry: TreeEntryDTO
}

export interface TreeDirNode {
  readonly type: 'dir'
  readonly name: string
  readonly path: string
  readonly children: TreeNode[]
}

export type TreeNode = TreeDirNode | TreeFileNode

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1 // folders first
    return a.name.localeCompare(b.name)
  })
  for (const node of nodes) {
    if (node.type === 'dir') sortNodes(node.children)
  }
}

export function buildTree(entries: readonly TreeEntryDTO[]): TreeNode[] {
  const roots: TreeNode[] = []
  const dirs = new Map<string, TreeDirNode>()

  const ensureDir = (path: string): TreeDirNode => {
    const existing = dirs.get(path)
    if (existing) return existing
    const segments = path.split('/')
    const name = segments[segments.length - 1] ?? path
    const node: TreeDirNode = { type: 'dir', name, path, children: [] }
    dirs.set(path, node)
    const parentPath = segments.slice(0, -1).join('/')
    if (parentPath === '') roots.push(node)
    else ensureDir(parentPath).children.push(node)
    return node
  }

  for (const entry of entries) {
    const segments = entry.relPath.split('/')
    const name = segments[segments.length - 1] ?? entry.relPath
    const fileNode: TreeFileNode = { type: 'file', name, entry }
    const parentPath = segments.slice(0, -1).join('/')
    if (parentPath === '') roots.push(fileNode)
    else ensureDir(parentPath).children.push(fileNode)
  }

  sortNodes(roots)
  return roots
}
