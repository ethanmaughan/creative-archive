/**
 * TipTap extension that styles `[[wikilinks]]` in the editor and makes them clickable, without
 * touching the Markdown round-trip — the text stays literally `[[Target]]`; we only decorate it.
 * Navigation resolution lives in the caller (it needs the document list + router).
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

const WIKILINK = /\[\[([^[\]|]+)(?:\|[^[\]]+)?\]\]/g

interface Hit {
  from: number
  to: number
  target: string
}

function findWikilinks(doc: PMNode): Hit[] {
  const hits: Hit[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    WIKILINK.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = WIKILINK.exec(text)) !== null) {
      hits.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        target: (match[1] ?? '').trim(),
      })
    }
  })
  return hits
}

export interface WikilinkOptions {
  onNavigate: (target: string) => void
}

export const Wikilink = Extension.create<WikilinkOptions>({
  name: 'wikilink',

  addOptions() {
    return { onNavigate: () => undefined }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey('wikilink'),
        props: {
          decorations(state) {
            const decorations = findWikilinks(state.doc).map((hit) =>
              Decoration.inline(hit.from, hit.to, { class: 'wikilink' }),
            )
            return DecorationSet.create(state.doc, decorations)
          },
          handleClickOn(view, pos) {
            const hit = findWikilinks(view.state.doc).find((h) => pos >= h.from && pos < h.to)
            if (hit && hit.target !== '') {
              options.onNavigate(hit.target)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})
