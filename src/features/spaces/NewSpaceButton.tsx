import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSpace } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import { SPACE_TYPES, SPACE_TYPE_LABELS, type SpaceType } from '@/domain/models/space'

export function NewSpaceButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [spaceType, setSpaceType] = useState<SpaceType>('writing')
  const create = useCreateSpace()
  const navigate = useNavigate()

  const submit = (): void => {
    const trimmed = title.trim()
    if (trimmed === '') return
    create.mutate(
      { title: trimmed, spaceType },
      {
        onSuccess: (space) => {
          setOpen(false)
          setTitle('')
          void navigate(`/space/${space.slug}`)
        },
      },
    )
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ New space</Button>
  }

  return (
    <div className="newdoc">
      <input
        className="newdoc__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
        placeholder="Space name… (a novel, a class, anything)"
        aria-label="Space name"
        autoFocus
      />
      <select
        className="newdoc__select"
        value={spaceType}
        onChange={(event) => setSpaceType(event.target.value as SpaceType)}
        aria-label="Space type"
      >
        {SPACE_TYPES.map((t) => (
          <option key={t} value={t}>
            {SPACE_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <Button onClick={submit} disabled={create.isPending || title.trim() === ''}>
        Create
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  )
}
