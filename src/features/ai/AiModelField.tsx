import type { JSX } from 'react'
import { useSession } from '@/app/store/session'

export function AiModelField(): JSX.Element {
  const model = useSession((s) => s.aiModel)
  const setAiModel = useSession((s) => s.setAiModel)
  return (
    <label className="ai-model">
      <span>Model</span>
      <input
        className="newdoc__input newdoc__input--sm"
        value={model}
        onChange={(event) => setAiModel(event.target.value)}
        aria-label="AI model"
      />
    </label>
  )
}
