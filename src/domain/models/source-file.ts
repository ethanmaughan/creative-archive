/**
 * Source files — foreign files the writer dropped into the archive (uploads, exports,
 * reference material) as opposed to app-authored Markdown documents.
 *
 * The hard rule (design §2, protected-workspace ethos): source files are **read-only**.
 * We index their text for search and let the writer view them, but we NEVER rewrite them —
 * no frontmatter injection, no reformatting. They are identified by path, not by an embedded
 * UUID, precisely because we won't touch their bytes.
 *
 * Pure, path-based logic. No IO.
 */
import { isIndexablePath, isReservedDataPath } from './workspace'

export type SourceCategory = 'text' | 'docx' | 'pdf' | 'image' | 'other'

/** Extensions we can read as UTF-8 text directly. */
const TEXT_EXTS = new Set([
  'md',
  'markdown',
  'mdown',
  'txt',
  'text',
  'log',
  'csv',
  'tsv',
  'json',
  'jsonl',
  'yaml',
  'yml',
  'toml',
  'ini',
  'rst',
  'org',
  'tex',
  'html',
  'htm',
  'xml',
  'srt',
  'vtt',
])

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'])

/** Lowercased extension without the dot, or '' when there is none. */
export function extForPath(relPath: string): string {
  const name = relPath.split('/').pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function categoryForExt(ext: string): SourceCategory {
  if (ext === 'docx') return 'docx'
  if (ext === 'pdf') return 'pdf'
  if (TEXT_EXTS.has(ext)) return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  return 'other'
}

/** True if any path segment is hidden (starts with a dot) — skip .git, .DS_Store, our own
 *  `.creative-archive/` index dir, etc. */
function hasHiddenSegment(relPath: string): boolean {
  return relPath.split('/').some((seg) => seg.startsWith('.'))
}

/**
 * A path we index as a read-only source: a visible file that is NOT an app-authored,
 * frontmatter-bearing Markdown document (those flow through the `documents` index instead).
 * Loose Markdown outside the known workspaces counts as a source — we index it for search but
 * don't adopt or mutate it.
 */
export function isSourceFilePath(relPath: string): boolean {
  if (hasHiddenSegment(relPath)) return false
  if (isReservedDataPath(relPath)) return false // app-managed data (e.g. query-tracker CSVs)
  if (isIndexablePath(relPath)) return false
  return true
}

/** Categories whose text we can extract for full-text search. */
export function isTextExtractable(category: SourceCategory): boolean {
  return category === 'text' || category === 'docx' || category === 'pdf'
}

export function basenameOf(relPath: string): string {
  return relPath.split('/').pop() ?? relPath
}
