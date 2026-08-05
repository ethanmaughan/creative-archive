/**
 * Merge a query template + a selected agent into a draft query letter — plain, deterministic
 * string substitution. No AI, no IO. The writer edits the result before doing anything with it;
 * the app never sends it anywhere.
 */
import type { Agent } from '../models/agent'
import type { QueryTemplate } from '../models/query-template'

export function buildQueryDraft(template: QueryTemplate, agent: Agent): string {
  const blocks: string[] = []

  blocks.push(`Dear ${agent.name.trim() || 'Agent'},`)

  const fit = agent.personalFitNotes.trim()
  const wishlist = agent.wishlistNotes.trim()
  if (fit !== '') {
    blocks.push(`I'm reaching out to you because ${fit}`)
  } else if (wishlist !== '') {
    blocks.push(
      `I saw that you're looking for ${wishlist}, and I believe my novel may be a strong fit.`,
    )
  }

  if (template.logline.trim() !== '') blocks.push(template.logline.trim())
  if (template.synopsisShort.trim() !== '') blocks.push(template.synopsisShort.trim())
  if (template.compTitles.length > 0) {
    blocks.push(`Comparable titles: ${template.compTitles.join(', ')}.`)
  }
  if (template.bio.trim() !== '') blocks.push(template.bio.trim())

  blocks.push('Thank you for your time and consideration.')
  blocks.push('Warmly,\n[Your name]')

  // One blank line between blocks, like a letter.
  return blocks.join('\n\n')
}
