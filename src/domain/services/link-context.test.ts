import { describe, expect, it } from 'vitest'
import { extractLinkContexts } from './link-context'

describe('extractLinkContexts', () => {
  const keys = new Set(['determinism'])

  it('returns the line containing a matching wikilink', () => {
    const body = 'Intro paragraph.\nThis scene explores [[Determinism]] head-on.\nUnrelated.'
    expect(extractLinkContexts(body, keys)).toEqual([
      'This scene explores [[Determinism]] head-on.',
    ])
  })

  it('matches case-insensitively via the normalized key', () => {
    const body = 'A nod to [[determinism]] here.'
    expect(extractLinkContexts(body, new Set(['determinism']))).toEqual([
      'A nod to [[determinism]] here.',
    ])
  })

  it('matches the page part of a fragment link and honours aliases', () => {
    const body = 'See [[Determinism#Free will]] and also [[Determinism|fate]].'
    expect(extractLinkContexts(body, keys)).toEqual([
      'See [[Determinism#Free will]] and also [[Determinism|fate]].',
    ])
  })

  it('ignores lines linking to other targets', () => {
    const body = 'This is about [[Free Will]] instead.'
    expect(extractLinkContexts(body, keys)).toEqual([])
  })

  it('strips a leading list/quote/heading marker', () => {
    const body = '- a beat on [[Determinism]]\n> quoting [[Determinism]] twice'
    expect(extractLinkContexts(body, keys)).toEqual([
      'a beat on [[Determinism]]',
      'quoting [[Determinism]] twice',
    ])
  })

  it('collapses duplicate lines and caps the count', () => {
    const body = Array.from({ length: 10 }, (_, i) => `line ${i} [[Determinism]]`).join('\n')
    expect(extractLinkContexts(body, keys, 3)).toHaveLength(3)
    const dup = 'same [[Determinism]] line\nsame [[Determinism]] line'
    expect(extractLinkContexts(dup, keys)).toEqual(['same [[Determinism]] line'])
  })

  it('returns nothing when there are no keys', () => {
    expect(extractLinkContexts('has [[Determinism]]', new Set())).toEqual([])
  })
})
