/**
 * Inline queries: a ` ```query ` fenced code block renders its results below, read-only. The
 * query stays a literal Markdown code block (standard, round-trips safely); this is a block
 * **widget decoration** — same safe pattern as embeds. Keyed by the query text so editing the
 * query re-runs it, but an unchanged query reuses its DOM (runs once).
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface QueryResult {
  relPath: string
  title: string | null
  kind: string
}

export interface QueryOptions {
  run: (queryText: string) => Promise<QueryResult[]>
  onNavigate: (relPath: string) => void
  kindLabel: (kind: string) => string
}

function buildCard(queryText: string, options: QueryOptions): HTMLElement {
  const card = document.createElement('div')
  card.className = 'query-card'
  card.contentEditable = 'false'

  const head = document.createElement('div')
  head.className = 'query-card__head'
  head.textContent = '⌕ query'

  const bodyEl = document.createElement('div')
  bodyEl.className = 'query-card__body'
  bodyEl.textContent = 'Running…'

  card.append(head, bodyEl)

  void options.run(queryText).then((results) => {
    bodyEl.textContent = ''
    if (results.length === 0) {
      bodyEl.textContent = 'No matches.'
      return
    }
    for (const result of results) {
      const row = document.createElement('a')
      row.className = 'query-result'
      const title = document.createElement('span')
      title.className = 'query-result__title'
      title.textContent = result.title ?? result.relPath
      const kind = document.createElement('span')
      kind.className = 'chip'
      kind.textContent = options.kindLabel(result.kind)
      row.append(title, kind)
      row.addEventListener('mousedown', (event) => {
        event.preventDefault()
        options.onNavigate(result.relPath)
      })
      bodyEl.append(row)
    }
  })

  return card
}

export const Query = Extension.create<QueryOptions>({
  name: 'queryBlock',

  addOptions() {
    return {
      run: async () => [],
      onNavigate: () => undefined,
      kindLabel: (kind) => kind,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey('queryBlock'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'codeBlock' || node.attrs['language'] !== 'query') return
              const text = node.textContent
              decorations.push(
                Decoration.widget(pos + node.nodeSize, () => buildCard(text, options), {
                  key: `query:${text}`,
                  side: 1,
                }),
              )
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
