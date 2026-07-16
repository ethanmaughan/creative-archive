/** Prompt construction for the (retrieval-only) AI features. Pure, no IO.
 *  The prompts deliberately forbid inventing content — AI organizes, never authors. */

export interface DocForPrompt {
  readonly title: string
  readonly body: string
}

export function buildSummaryPrompt(title: string, body: string): string {
  return [
    'You are a retrieval assistant helping a writer organize their own work.',
    'Summarize the document below in 3–5 sentences. Condense only what is present —',
    'do not invent details, characters, or events, and do not continue the story.',
    '',
    `Title: ${title}`,
    '---',
    body.trim(),
    '---',
    'Summary:',
  ].join('\n')
}

export function buildConsistencyPrompt(docs: readonly DocForPrompt[]): string {
  const sections = docs.map((d) => `## ${d.title}\n${d.body.trim()}`).join('\n\n')
  return [
    "You are a consistency checker for a writer's story bible.",
    'Review the entries below and list any internal inconsistencies or contradictions',
    '(names, traits, relationships, timeline, world rules). If you find none, say so plainly.',
    'Do not invent facts or propose new content — only flag conflicts between what is written.',
    '',
    sections,
    '',
    'Inconsistencies:',
  ].join('\n')
}
