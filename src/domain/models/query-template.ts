/**
 * Reusable query-letter boilerplate — stored in a shared `query-tracker/templates.csv` so the
 * same logline/bio/comps can be reused across manuscripts. Pure, no IO.
 */
import { QUERY_TRACKER_DIR } from './agent'

export interface QueryTemplate {
  readonly name: string
  readonly logline: string
  readonly synopsisShort: string
  readonly bio: string
  readonly compTitles: string[]
}

export const TEMPLATE_COLUMNS = [
  'template_name',
  'logline',
  'synopsis_short',
  'bio',
  'comp_titles',
] as const

export const TEMPLATES_CSV_PATH = `${QUERY_TRACKER_DIR}/templates.csv`

const MULTI_SEP = ';'

function splitMulti(value: string): string[] {
  return value
    .split(MULTI_SEP)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

export function recordToTemplate(record: Record<string, string>): QueryTemplate {
  return {
    name: (record['template_name'] ?? '').trim(),
    logline: record['logline'] ?? '',
    synopsisShort: record['synopsis_short'] ?? '',
    bio: record['bio'] ?? '',
    compTitles: splitMulti(record['comp_titles'] ?? ''),
  }
}

export function templateToRecord(template: QueryTemplate): Record<string, string> {
  return {
    template_name: template.name,
    logline: template.logline,
    synopsis_short: template.synopsisShort,
    bio: template.bio,
    comp_titles: template.compTitles.join(MULTI_SEP),
  }
}
