/**
 * Text extraction for source files. Plain text is read directly; `.docx` and `.pdf` are
 * parsed with mammoth / pdf.js, which are heavy, so they're **lazily imported** — the bundle
 * only pays for them the first time such a file is indexed. Images and unknown binaries yield
 * no text (they're still listed and previewed, just not searchable).
 *
 * Extraction is read-only — we never write back to the source file.
 */
import type { FileStore } from '../storage/file-store/file-store'
import type { SourceCategory } from '@/domain/models/source-file'

export interface ExtractedText {
  readonly text: string
  readonly hasText: boolean
}

const EMPTY: ExtractedText = { text: '', hasText: false }

function done(text: string): ExtractedText {
  const trimmed = text.trim()
  return { text: trimmed, hasText: trimmed.length > 0 }
}

/** Copy into a standalone ArrayBuffer — the parsers want a plain ArrayBuffer, and a
 *  Uint8Array over a shared/OPFS buffer can carry an offset. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractedText> {
  const mammoth = (await import('mammoth/mammoth.browser.js')).default
  const result = await mammoth.extractRawText({ arrayBuffer: toArrayBuffer(bytes) })
  return done(result.value)
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedText> {
  const pdfjs = await import('pdfjs-dist')
  // pdf.js runs its parser in a nested worker; point it at the bundled worker module.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href
  const loadingTask = pdfjs.getDocument({ data: toArrayBuffer(bytes) })
  const doc = await loadingTask.promise
  try {
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const line = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      pages.push(line)
    }
    return done(pages.join('\n'))
  } finally {
    await loadingTask.destroy()
  }
}

/** Extract searchable text for a source file, dispatching by category. */
export async function extractText(
  store: FileStore,
  relPath: string,
  category: SourceCategory,
): Promise<ExtractedText> {
  try {
    if (category === 'text') return done(await store.readTextFile(relPath))
    if (category === 'docx') return await extractDocx(await store.readBinaryFile(relPath))
    if (category === 'pdf') return await extractPdf(await store.readBinaryFile(relPath))
    return EMPTY
  } catch {
    // A malformed or unreadable file shouldn't break the whole reconcile — index it with no text.
    return EMPTY
  }
}
