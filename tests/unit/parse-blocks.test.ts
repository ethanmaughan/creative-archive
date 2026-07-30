// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseBlocks, splitFragment, fragmentAnchor } from '@/domain/services/parse-blocks'

describe('parseBlocks', () => {
  it('extracts trailing ^id block markers and headings', () => {
    const body = '# Backstory\n\nThe dragon guards the pass. ^a1b2c3\n\n## The Duel\nNo id here.\n'
    expect(parseBlocks(body)).toEqual([
      { anchor: 'backstory', type: 'heading', text: 'Backstory' },
      { anchor: 'a1b2c3', type: 'block', text: 'The dragon guards the pass.' },
      { anchor: 'the duel', type: 'heading', text: 'The Duel' },
    ])
  })

  it('splits a target into page and fragment', () => {
    expect(splitFragment('Mara#^a1b2')).toEqual({ page: 'Mara', fragment: '^a1b2' })
    expect(splitFragment('Plain')).toEqual({ page: 'Plain', fragment: null })
    expect(splitFragment('#^self')).toEqual({ page: '', fragment: '^self' })
  })

  it('resolves a fragment to a block or heading anchor', () => {
    expect(fragmentAnchor('^A1B2')).toEqual({ anchor: 'a1b2', type: 'block' })
    expect(fragmentAnchor('Backstory')).toEqual({ anchor: 'backstory', type: 'heading' })
  })
})
