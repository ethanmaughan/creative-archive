/**
 * `![[Doc]]` / `![[Doc#^id]]` / `![[Doc#Heading]]` embeds. The `![[…]]` stays literal Markdown
 * (so it round-trips safely); this renders the target's content **inline, read-only** as a block
 * **widget decoration** right after the source line.
 *
 * Content is fetched once per keyed widget (ProseMirror reuses the DOM across redraws while the
 * key is stable) and rendered as plain text — so an embed inside embedded content is NOT expanded
 * (the recursion guard is structural: we never re-process the fetched text for further embeds).
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const EMBED = /!\[\[([^[\]|]+)\]\]/g

export interface EmbedContent {
  title: string
  text: string
}

export interface EmbedOptions {
  resolve: (target: string, fragment: string | null) => Promise<EmbedContent | null>
}

function splitTarget(raw: string): { target: string; fragment: string | null } {
  const hash = raw.indexOf('#')
  if (hash < 0) return { target: raw.trim(), fragment: null }
  return { target: raw.slice(0, hash).trim(), fragment: raw.slice(hash + 1).trim() || null }
}

function buildCard(
  target: string,
  fragment: string | null,
  resolve: EmbedOptions['resolve'],
): HTMLElement {
  const card = document.createElement('div')
  card.className = 'embed-card'
  card.contentEditable = 'false'

  const head = document.createElement('div')
  head.className = 'embed-card__head'
  head.textContent = `⧉ ${target === '' ? 'this note' : target}${fragment ? ` › ${fragment}` : ''}`

  const bodyEl = document.createElement('div')
  bodyEl.className = 'embed-card__body'
  bodyEl.textContent = 'Loading…'

  card.append(head, bodyEl)

  void resolve(target, fragment).then((content) => {
    if (!content) {
      card.classList.add('embed-card--broken')
      bodyEl.textContent = `Can’t resolve this embed.`
      return
    }
    bodyEl.textContent = content.text === '' ? '(empty)' : content.text
  })

  return card
}

export const Embed = Extension.create<EmbedOptions>({
  name: 'embed',

  addOptions() {
    return { resolve: async () => null }
  },

  addProseMirrorPlugins() {
    const resolve = this.options.resolve
    return [
      new Plugin({
        key: new PluginKey('embed'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return
              EMBED.lastIndex = 0
              const match = EMBED.exec(node.textContent)
              if (!match) return
              const { target, fragment } = splitTarget((match[1] ?? '').trim())
              decorations.push(
                Decoration.widget(pos + node.nodeSize, () => buildCard(target, fragment, resolve), {
                  key: `embed:${target}#${fragment ?? ''}`,
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
