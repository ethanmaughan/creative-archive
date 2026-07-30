import { useEffect, useState, type JSX } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { Wikilink } from './wikilink-extension'
import { Hashtag } from './hashtag-extension'

interface DocumentEditorProps {
  value: string
  onChange: (markdown: string) => void
  /** Called when a `[[wikilink]]` is clicked in the editor. */
  onWikilinkClick?: (target: string) => void
  /** Called when a `#tag` is clicked in the editor. */
  onTagClick?: (tag: string) => void
}

/** tiptap-markdown escapes `[` and `]` on serialize; restore the double-bracket wikilink syntax
 *  so `[[Target]]` round-trips as literal Markdown (leaving genuinely escaped brackets alone). */
function unescapeWikilinks(markdown: string): string {
  return markdown.replace(/\\\[\\\[/g, '[[').replace(/\\\]\\\]/g, ']]')
}

function Toolbar({ editor }: { editor: Editor | null }): JSX.Element | null {
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
    </div>
  )
}

/** Rich-text editor over a Markdown body, with a formatting toolbar. */
export function DocumentEditor({
  value,
  onChange,
  onWikilinkClick,
  onTagClick,
}: DocumentEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Wikilink.configure({ onNavigate: (target: string) => onWikilinkClick?.(target) }),
      Hashtag.configure({ onNavigate: (tag: string) => onTagClick?.(tag) }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => {
      onChange(unescapeWikilinks(instance.storage.markdown.getMarkdown() as string))
    },
  })

  return (
    <div className="editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="prose-editor" />
    </div>
  )
}
