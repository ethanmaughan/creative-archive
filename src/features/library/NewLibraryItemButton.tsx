import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateLibraryItem } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import { MEDIA_TYPES, type MediaType } from '@/domain/models/document'
import { MEDIA_LABELS } from './media'

export function NewLibraryItemButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [mediaType, setMediaType] = useState<MediaType>('book')
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [year, setYear] = useState('')
  const [rating, setRating] = useState('')
  const [consumedOn, setConsumedOn] = useState('')
  const create = useCreateLibraryItem()
  const navigate = useNavigate()

  const submit = (): void => {
    const trimmedTitle = title.trim()
    if (trimmedTitle === '') return
    const yearNum = year.trim() === '' ? undefined : Number(year)
    const ratingNum = rating === '' ? undefined : Number(rating)
    create.mutate(
      {
        mediaType,
        title: trimmedTitle,
        ...(creator.trim() !== '' ? { creator: creator.trim() } : {}),
        ...(yearNum !== undefined && !Number.isNaN(yearNum) ? { year: yearNum } : {}),
        ...(ratingNum !== undefined && !Number.isNaN(ratingNum) ? { rating: ratingNum } : {}),
        ...(consumedOn !== '' ? { consumedOn } : {}),
      },
      {
        onSuccess: (doc) => {
          setOpen(false)
          setTitle('')
          setCreator('')
          setYear('')
          setRating('')
          setConsumedOn('')
          void navigate(`/doc/${doc.relPath}`)
        },
      },
    )
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        + Log
      </Button>
    )
  }

  return (
    <div className="newdoc newdoc--lib">
      <select
        className="newdoc__select"
        value={mediaType}
        onChange={(event) => setMediaType(event.target.value as MediaType)}
        aria-label="Media type"
      >
        {MEDIA_TYPES.map((m) => (
          <option key={m} value={m}>
            {MEDIA_LABELS[m]}
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
        aria-label="Title"
        autoFocus
      />
      <input
        className="newdoc__input newdoc__input--sm"
        value={creator}
        onChange={(event) => setCreator(event.target.value)}
        placeholder="Creator"
        aria-label="Creator"
      />
      <input
        className="newdoc__input newdoc__input--xs"
        value={year}
        onChange={(event) => setYear(event.target.value)}
        placeholder="Year"
        aria-label="Year"
        inputMode="numeric"
      />
      <select
        className="newdoc__select"
        value={rating}
        onChange={(event) => setRating(event.target.value)}
        aria-label="Rating"
      >
        <option value="">Rating</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {'★'.repeat(n)}
          </option>
        ))}
      </select>
      <input
        className="newdoc__input newdoc__input--sm"
        type="date"
        value={consumedOn}
        onChange={(event) => setConsumedOn(event.target.value)}
        aria-label="Date consumed"
        title="Date consumed"
      />
      <Button onClick={submit} disabled={create.isPending || title.trim() === ''}>
        Log
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  )
}
