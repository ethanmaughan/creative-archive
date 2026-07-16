import type { JSX } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'

interface DocumentEditorProps {
  value: string
  onChange: (markdown: string) => void
}

/** Rich-text editor over a Markdown body. Loads Markdown in, serializes Markdown out. */
export function DocumentEditor({ value, onChange }: DocumentEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    onUpdate: ({ editor: instance }) => {
      const markdown = instance.storage.markdown.getMarkdown() as string
      onChange(markdown)
    },
  })

  return <EditorContent editor={editor} className="prose-editor" />
}
