/**
 * A small, dependency-free CSV reader/writer (RFC 4180-ish). Handles quoted fields with
 * embedded commas, newlines, and doubled `""` quotes — which matters here because agent
 * research notes are free prose that lands in a single cell. Pure, no IO.
 */

/** Parse CSV text into a matrix of cells. Tolerates `\n` and `\r\n`, and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0
  const n = text.length

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
    } else if (c === ',') {
      endField()
      i++
    } else if (c === '\n') {
      endRow()
      i++
    } else if (c === '\r') {
      endRow()
      i += text[i + 1] === '\n' ? 2 : 1
    } else {
      field += c
      i++
    }
  }
  // Flush trailing content (a file not ending in a newline).
  if (field !== '' || row.length > 0) endRow()
  return rows
}

function needsQuoting(cell: string): boolean {
  return /[",\r\n]/.test(cell) || /^\s|\s$/.test(cell)
}

/** Serialize a matrix of cells to CSV text (trailing newline, `""`-escaped quotes). */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return ''
  const body = rows
    .map((row) =>
      row.map((cell) => (needsQuoting(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','),
    )
    .join('\n')
  return `${body}\n`
}

/** Parse CSV with a header row into keyed records. Blank lines are skipped. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = (rows[0] ?? []).map((h) => h.trim())
  return rows
    .slice(1)
    .filter((cells) => !(cells.length === 1 && cells[0] === ''))
    .map((cells) => {
      const record: Record<string, string> = {}
      headers.forEach((h, idx) => {
        record[h] = cells[idx] ?? ''
      })
      return record
    })
}

/** Serialize keyed records to CSV under a fixed header/column order. */
export function recordsToCsv(
  headers: readonly string[],
  records: readonly Record<string, string>[],
): string {
  const rows: string[][] = [
    [...headers],
    ...records.map((record) => headers.map((h) => record[h] ?? '')),
  ]
  return serializeCsv(rows)
}
