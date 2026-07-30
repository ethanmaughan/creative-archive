/**
 * TipTap extension that styles inline `#tags` in the editor and makes them clickable, without
 * touching the Markdown round-trip — the text stays literally `#tag`; we only decorate it.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

const HASHTAG = /(?<![\w#])#([a-z0-9][\w\-/]*)/gi

interface Hit {
  from: number
  to: number
  tag: string
}

function findHashtags(doc: PMNode): Hit[] {
  const hits: Hit[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    HASHTAG.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = HASHTAG.exec(text)) !== null) {
      hits.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        tag: (match[1] ?? '').toLowerCase(),
      })
    }
  })
  return hits
}

export interface HashtagOptions {
  onNavigate: (tag: string) => void
}

export const Hashtag = Extension.create<HashtagOptions>({
  name: 'hashtag',

  addOptions() {
    return { onNavigate: () => undefined }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey('hashtag'),
        props: {
          decorations(state) {
            const decorations = findHashtags(state.doc).map((hit) =>
              Decoration.inline(hit.from, hit.to, { class: 'hashtag' }),
            )
            return DecorationSet.create(state.doc, decorations)
          },
          handleClickOn(view, pos) {
            const hit = findHashtags(view.state.doc).find((h) => pos >= h.from && pos < h.to)
            if (hit && hit.tag !== '') {
              options.onNavigate(hit.tag)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})
