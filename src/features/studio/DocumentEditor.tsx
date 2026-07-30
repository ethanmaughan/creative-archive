import { useEffect, useState, type JSX } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { Wikilink } from './wikilink-extension'
import { Hashtag } from './hashtag-extension'
import { AnchorHighlight, anchorHighlightKey } from './anchor-highlight-extension'
import { Embed, type EmbedOptions } from './embed-extension'
import { Query, type QueryOptions } from './query-extension'
import { Autocomplete, type AutocompleteOptions } from './autocomplete-extension'
import { kindLabel } from '@/shared/ui/kind-label'

interface DocumentEditorProps {
  value: string
  onChange: (markdown: string) => void
  /** Called when a `[[wikilink]]` is clicked in the editor. */
  onWikilinkClick?: (target: string) => void
  /** Called when a `#tag` is clicked in the editor. */
  onTagClick?: (tag: string) => void
  /** This document's resolvable name, for building `[[Title#^id]]` block references. */
  docTitle?: string
  /** A `^id`/heading anchor to scroll to and flash (from a `[[Doc#^id]]` click). */
  anchor?: string | null
  /** Resolve an `![[embed]]` target to its content, for inline rendering. */
  onResolveEmbed?: EmbedOptions['resolve']
  /** Run an inline ` ```query ` block's query. */
  onRunQuery?: QueryOptions['run']
  /** Navigate to a document path (from a query result). */
  onNavigateDoc?: (relPath: string) => void
  /** Autocomplete sources for `[[` (documents) and `#` (tags). */
  onQueryDocs?: AutocompleteOptions['queryDocs']
  onQueryTags?: AutocompleteOptions['queryTags']
}

/** tiptap-markdown escapes `[`/`]` (and `!` before `[`) on serialize; restore the wikilink /
 *  embed syntax so `[[Target]]` and `![[Target]]` round-trip as literal Markdown. */
function unescapeWikilinks(markdown: string): string {
  return markdown
    .replace(/\\\[\\\[/g, '[[')
    .replace(/\\\]\\\]/g, ']]')
    .replace(/\\!\[\[/g, '![[')
}

function genBlockId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => (b % 36).toString(36)).join(
    '',
  )
}

/** Stamp the current block with an `^id` (reusing one if present) and copy `[[Title#^id]]`. */
function copyBlockRef(editor: Editor, docTitle: string): void {
  const { $from } = editor.state.selection
  const existing = /\^([a-z0-9][a-z0-9-]*)\s*$/i.exec($from.parent.textContent)
  let id = existing?.[1]?.toLowerCase()
  if (id === undefined) {
    id = genBlockId()
    editor.chain().focus().insertContentAt($from.end(), ` ^${id}`).run()
  }
  void navigator.clipboard?.writeText(`[[${docTitle}#^${id}]]`).catch(() => undefined)
}

function Toolbar({
  editor,
  docTitle,
}: {
  editor: Editor | null
  docTitle: string
}): JSX.Element | null {
  // Re-render on editor transactions so active states stay in sync.
  const [, force] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = (): void => force((n) => n + 1)
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) return null

  const button = (
    label: string,
    active: boolean,
    onClick: () => void,
    title: string,
  ): JSX.Element => (
    <button
      type="button"
      className={`tb__btn${active ? ' is-active' : ''}`}
      // Keep the editor selection while clicking a toolbar button.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {label}
    </button>
  )

  const chain = (): ReturnType<Editor['chain']> => editor.chain().focus()

  return (
    <div className="tb" role="toolbar" aria-label="Formatting">
      {button('B', editor.isActive('bold'), () => chain().toggleBold().run(), 'Bold')}
      {button('I', editor.isActive('italic'), () => chain().toggleItalic().run(), 'Italic')}
      {button(
        'H1',
        editor.isActive('heading', { level: 1 }),
        () => chain().toggleHeading({ level: 1 }).run(),
        'Heading 1',
      )}
      {button(
        'H2',
        editor.isActive('heading', { level: 2 }),
        () => chain().toggleHeading({ level: 2 }).run(),
        'Heading 2',
      )}
      {button(
        '•',
        editor.isActive('bulletList'),
        () => chain().toggleBulletList().run(),
        'Bullet list',
      )}
      {button(
        '1.',
        editor.isActive('orderedList'),
        () => chain().toggleOrderedList().run(),
        'Numbered list',
      )}
      {button('❝', editor.isActive('blockquote'), () => chain().toggleBlockquote().run(), 'Quote')}
      {button(
        '</>',
        editor.isActive('codeBlock'),
        () => chain().toggleCodeBlock().run(),
        'Code block',
      )}
      {button('⚓', false, () => copyBlockRef(editor, docTitle), 'Copy block reference')}
    </div>
  )
}

/** Rich-text editor over a Markdown body, with a formatting toolbar. */
export function DocumentEditor({
  value,
  onChange,
  onWikilinkClick,
  onTagClick,
  docTitle = '',
  anchor = null,
  onResolveEmbed,
  onRunQuery,
  onNavigateDoc,
  onQueryDocs,
  onQueryTags,
}: DocumentEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Wikilink.configure({ onNavigate: (target: string) => onWikilinkClick?.(target) }),
      Hashtag.configure({ onNavigate: (tag: string) => onTagClick?.(tag) }),
      AnchorHighlight,
      Embed.configure({ resolve: onResolveEmbed ?? (async () => null) }),
      Query.configure({
        run: onRunQuery ?? (async () => []),
        onNavigate: (relPath: string) => onNavigateDoc?.(relPath),
        kindLabel,
      }),
      Autocomplete.configure({
        queryDocs: onQueryDocs ?? (() => []),
        queryTags: onQueryTags ?? (() => []),
      }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => {
      onChange(unescapeWikilinks(instance.storage.markdown.getMarkdown() as string))
    },
  })

  // Flash + scroll to the referenced block, then clear the highlight after a beat.
  useEffect(() => {
    if (!editor || anchor === null || anchor === '') return
    editor.view.dispatch(editor.state.tr.setMeta(anchorHighlightKey, anchor))
    const scroll = window.setTimeout(() => {
      document
        .querySelector('.is-anchor-flash')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 60)
    const clear = window.setTimeout(() => {
      if (!editor.isDestroyed)
        editor.view.dispatch(editor.state.tr.setMeta(anchorHighlightKey, null))
    }, 2600)
    return () => {
      clearTimeout(scroll)
      clearTimeout(clear)
    }
  }, [editor, anchor])

  return (
    <div className="editor">
      <Toolbar editor={editor} docTitle={docTitle} />
      <EditorContent editor={editor} className="prose-editor" />
    </div>
  )
}
