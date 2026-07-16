import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateDocument } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import type { CreatableKind } from '@/data/worker/types'

const KINDS: readonly { value: CreatableKind; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'character', label: 'Character' },
  { value: 'location', label: 'Location' },
  { value: 'research', label: 'Research' },
]

export function NewDocumentButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CreatableKind>('note')
  const [title, setTitle] = useState('')
  const create = useCreateDocument()
  const navigate = useNavigate()

  const submit = (): void => {
    const trimmed = title.trim()
    if (trimmed === '') return
    create.mutate(
      { kind, title: trimmed },
      {
        onSuccess: (doc) => {
          setOpen(false)
          setTitle('')
          void navigate(`/doc/${doc.relPath}`)
        },
      },
    )
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        + New
      </Button>
    )
  }

  return (
    <div className="newdoc">
      <select
        className="newdoc__select"
        value={kind}
        onChange={(event) => setKind(event.target.value as CreatableKind)}
        aria-label="Document kind"
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <input
        className="newdoc__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
        placeholder="Title…"
        aria-label="New document title"
        autoFocus
      />
      <Button onClick={submit} disabled={create.isPending || title.trim() === ''}>
        Create
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  )
}
