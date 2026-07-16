import { useState, type JSX } from 'react'
import { useCreateMarket, useMarkets } from '@/data/worker/hooks'
import { MARKET_KINDS, type MarketKind } from '@/domain/models/market'
import { Button } from '@/shared/ui/Button'
import { marketKindLabel } from './status'

export function MarketManager(): JSX.Element {
  const { data } = useMarkets()
  const create = useCreateMarket()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<MarketKind>('agent')
  const markets = data ?? []

  const add = (): void => {
    const trimmed = name.trim()
    if (trimmed === '') return
    create.mutate({ name: trimmed, kind }, { onSuccess: () => setName('') })
  }

  return (
    <section className="qt-section">
      <h2 className="connections__title">Markets</h2>
      <div className="conn-add">
        <select
          className="newdoc__select"
          value={kind}
          onChange={(event) => setKind(event.target.value as MarketKind)}
          aria-label="Market kind"
        >
          {MARKET_KINDS.map((k) => (
            <option key={k} value={k}>
              {marketKindLabel(k)}
            </option>
          ))}
        </select>
        <input
          className="newdoc__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add()
          }}
          placeholder="Market name…"
          aria-label="Market name"
        />
        <Button onClick={add} disabled={create.isPending || name.trim() === ''}>
          Add market
        </Button>
      </div>
      {markets.length > 0 ? (
        <ul className="qt-markets">
          {markets.map((m) => (
            <li key={m.id}>
              <span className="chip">{marketKindLabel(m.kind)}</span> {m.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
