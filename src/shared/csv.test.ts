import { describe, expect, it } from 'vitest'
import { parseCsv, parseCsvRecords, recordsToCsv, serializeCsv } from './csv'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields with commas, newlines, and escaped quotes', () => {
    const text = 'name,note\n"Ross, Catherine","line one\nline ""two"""\n'
    expect(parseCsv(text)).toEqual([
      ['name', 'note'],
      ['Ross, Catherine', 'line one\nline "two"'],
    ])
  })

  it('tolerates CRLF and a trailing row without a newline', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('strips a leading BOM and returns [] for empty input', () => {
    expect(parseCsv('﻿a,b\n1,2\n')[0]).toEqual(['a', 'b'])
    expect(parseCsv('')).toEqual([])
  })
})

describe('serializeCsv', () => {
  it('quotes only cells that need it and round-trips', () => {
    const rows = [
      ['name', 'note'],
      ['Ross, Catherine', 'has "quotes"\nand a newline'],
      ['Plain', 'simple'],
    ]
    const text = serializeCsv(rows)
    expect(text).toContain('"Ross, Catherine"')
    expect(text).toContain('Plain,simple')
    expect(parseCsv(text)).toEqual(rows)
  })

  it('returns empty string for no rows', () => {
    expect(serializeCsv([])).toBe('')
  })
})

describe('records', () => {
  it('round-trips records through a fixed header order', () => {
    const headers = ['name', 'agency', 'tags']
    const records = [
      { name: 'A', agency: 'X', tags: 'horror;literary' },
      { name: 'B', agency: 'Y', tags: '' },
    ]
    const text = recordsToCsv(headers, records)
    expect(parseCsvRecords(text)).toEqual(records)
  })

  it('fills missing trailing columns with empty strings', () => {
    expect(parseCsvRecords('name,agency\nSolo')).toEqual([{ name: 'Solo', agency: '' }])
  })
})
