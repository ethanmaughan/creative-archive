/**
 * YAML frontmatter parsing/serialization + the stable-`id` linchpin (ADR-0001).
 *
 * We use the pure-ESM `yaml` package (browser-safe) rather than gray-matter, which
 * depends on Node's Buffer and breaks in the browser. The frontmatter delimiter handling
 * is a small local concern; YAML parsing itself is delegated to the library.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export type Frontmatter = Record<string, unknown>

export interface ParsedDocument {
  readonly data: Frontmatter
  readonly body: string
  readonly hadFrontmatter: boolean
}

export interface EnsureIdResult {
  readonly data: Frontmatter
  readonly id: string
  readonly added: boolean
}

// Opening `---` line, YAML block, closing `---` line.
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseFrontmatter(raw: string): ParsedDocument {
  const match = FRONTMATTER_RE.exec(raw)
  if (!match) {
    return { data: {}, body: raw, hadFrontmatter: false }
  }
  const yamlText = (match[1] ?? '').trim()
  const parsed: unknown = yamlText === '' ? {} : parseYaml(yamlText)
  return {
    data: isRecord(parsed) ? parsed : {},
    body: raw.slice(match[0].length),
    hadFrontmatter: true,
  }
}

export function serializeFrontmatter(data: Frontmatter, body: string): string {
  // stringifyYaml already terminates with a newline.
  return `---\n${stringifyYaml(data)}---\n${body}`
}

/** Returns the document's `id`, generating and injecting one if absent. */
export function ensureId(
  data: Frontmatter,
  generateId: () => string = () => crypto.randomUUID(),
): EnsureIdResult {
  const existing = data['id']
  if (typeof existing === 'string' && existing.length > 0) {
    return { data, id: existing, added: false }
  }
  const id = generateId()
  // Put `id` first so injected frontmatter reads naturally.
  return { data: { id, ...data }, id, added: true }
}
