/**
 * TipTap extension that flashes a referenced block/heading when you arrive via `[[Doc#^id]]`.
 * The highlight is a ProseMirror **node decoration** (not a manual DOM class, which ProseMirror
 * would wipe on its next redraw). The active anchor is held in plugin state and set via meta.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

export const anchorHighlightKey = new PluginKey<string | null>('anchorHighlight')

/** Position range of the block/heading an anchor points at, or null. */
export function findAnchorRange(doc: PMNode, anchor: string): { from: number; to: number } | null {
  const isBlock = anchor.startsWith('^')
  const needle = isBlock ? `^${anchor.slice(1).toLowerCase()}` : anchor.trim().toLowerCase()
  let range: { from: number; to: number } | null = null
  doc.descendants((node, pos) => {
    if (range || !node.isTextblock) return
    const text = node.textContent.toLowerCase()
    const hit = isBlock
      ? text.includes(needle)
      : node.type.name === 'heading' && text.trim() === needle
    if (hit) range = { from: pos, to: pos + node.nodeSize }
  })
  return range
}

export const AnchorHighlight = Extension.create({
  name: 'anchorHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<string | null>({
        key: anchorHighlightKey,
        state: {
          init: () => null,
          apply(tr, value) {
            const meta = tr.getMeta(anchorHighlightKey)
            return meta === undefined ? value : (meta as string | null)
          },
        },
        props: {
          decorations(state) {
            const anchor = anchorHighlightKey.getState(state)
            if (!anchor) return null
            const range = findAnchorRange(state.doc, anchor)
            if (!range) return null
            return DecorationSet.create(state.doc, [
              Decoration.node(range.from, range.to, { class: 'is-anchor-flash' }),
            ])
          },
        },
      }),
    ]
  },
})
