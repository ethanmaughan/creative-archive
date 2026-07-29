import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSpaceDocument } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import { kindLabel } from '@/shared/ui/kind-label'
import { docKindsForSpaceType, type SpaceDocKind, type SpaceType } from '@/domain/models/space'

export function NewSpaceDocButton({
  spaceSlug,
  spaceType,
}: {
  spaceSlug: string
  spaceType: SpaceType
}): JSX.Element {
  const kinds = docKindsForSpaceType(spaceType)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<SpaceDocKind>(kinds[0] ?? 'note')
  const [title, setTitle] = useState('')
  const create = useCreateSpaceDocument()
  const navigate = useNavigate()

  const submit = (): void => {
    const trimmed = title.trim()
    if (trimmed === '') return
    create.mutate(
      { spaceSlug, kind, title: trimmed },
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
        onChange={(event) => setKind(event.target.value as SpaceDocKind)}
        aria-label="Document kind"
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {kindLabel(k)}
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
