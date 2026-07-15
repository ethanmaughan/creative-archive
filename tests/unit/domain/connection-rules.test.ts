import { describe, it, expect } from 'vitest'
import {
  isSelfReference,
  validateConnection,
  connectionKey,
} from '@/domain/services/connection-rules'

const ref = (type: string, id: string): { type: string; id: string } => ({ type, id })

describe('connection rules', () => {
  it('detects a self reference', () => {
    expect(isSelfReference({ source: ref('document', 'd1'), target: ref('document', 'd1') })).toBe(
      true,
    )
    expect(isSelfReference({ source: ref('document', 'd1'), target: ref('document', 'd2') })).toBe(
      false,
    )
  })

  it('rejects a self-referential connection', () => {
    const result = validateConnection({
      source: ref('document', 'd1'),
      target: ref('document', 'd1'),
    })
    expect(result.valid).toBe(false)
  })

  it('accepts a valid cross-entity connection', () => {
    const result = validateConnection({
      source: ref('document', 'd1'),
      target: ref('character', 'c1'),
      relationship: 'appears-in',
    })
    expect(result.valid).toBe(true)
  })

  it('builds a stable dedupe key', () => {
    expect(
      connectionKey({
        source: ref('document', 'd1'),
        target: ref('character', 'c1'),
        relationship: 'appears-in',
      }),
    ).toBe('document:d1->character:c1#appears-in')
  })
})
