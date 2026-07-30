/**
 * Editor autocomplete: typing `[[` suggests documents, `#` suggests existing tags. Built on
 * TipTap's Suggestion utility + a small vanilla popup. Item lists come from the caller (which
 * has the current document/tag data); selecting one replaces the trigger+query with the insert
 * text (`[[Title]]` or `#tag `).
 */
import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion'
import { PluginKey, type EditorState } from '@tiptap/pm/state'
import { SuggestionPopup, type SuggestionItem } from './suggestion-popup'

export interface AutocompleteOptions {
  queryDocs: (query: string) => SuggestionItem[]
  queryTags: (query: string) => SuggestionItem[]
}

function makeRender(): NonNullable<SuggestionOptions<SuggestionItem>['render']> {
  return () => {
    let popup: SuggestionPopup | null = null
    const apply = (props: SuggestionProps<SuggestionItem>): void => {
      popup?.update(props.items, (item) => props.command(item), props.clientRect?.() ?? null)
    }
    return {
      onStart: (props) => {
        popup = new SuggestionPopup()
        apply(props)
      },
      onUpdate: (props) => apply(props),
      onKeyDown: (props) => popup?.onKeyDown(props.event) ?? false,
      onExit: () => {
        popup?.destroy()
        popup = null
      },
    }
  }
}

function config(
  char: string,
  name: string,
  getItems: (query: string) => SuggestionItem[],
  tagLike: boolean,
): Omit<SuggestionOptions<SuggestionItem>, 'editor'> {
  return {
    char,
    pluginKey: new PluginKey(name),
    allowSpaces: !tagLike, // titles have spaces; tags don't
    items: ({ query }) => getItems(query),
    command: ({ editor, range, props }) => {
      editor.chain().focus().insertContentAt(range, props.insertText).run()
    },
    render: makeRender(),
    // Tags only trigger at a word boundary, so `##` (headings) and mid-word `a#b` don't fire.
    ...(tagLike
      ? {
          allow: ({
            state,
            range,
          }: {
            state: EditorState
            range: { from: number; to: number }
          }) => {
            const before =
              range.from > 0 ? state.doc.textBetween(range.from - 1, range.from, '\n', '\n') : ''
            return before === '' || /\s/.test(before)
          },
        }
      : {}),
  }
}

export const Autocomplete = Extension.create<AutocompleteOptions>({
  name: 'autocomplete',

  addOptions() {
    return { queryDocs: () => [], queryTags: () => [] }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({ editor: this.editor, ...config('[[', 'acDocs', this.options.queryDocs, false) }),
      Suggestion({ editor: this.editor, ...config('#', 'acTags', this.options.queryTags, true) }),
    ]
  },
})
