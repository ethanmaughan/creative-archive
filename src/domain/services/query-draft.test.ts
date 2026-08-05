import { describe, expect, it } from 'vitest'
import { buildQueryDraft } from './query-draft'
import { recordToTemplate, templateToRecord, type QueryTemplate } from '../models/query-template'
import type { Agent } from '../models/agent'

const template: QueryTemplate = {
  name: 'Standard horror v2',
  logline: 'A grief-stricken taxidermist discovers her dead husband is talking back.',
  synopsisShort: 'THE MOUNTING is an 80,000-word literary horror novel.',
  bio: 'I am a mortician by trade; this is my first novel.',
  compTitles: ['Mexican Gothic', 'The Only Good Indians'],
}

const agent: Agent = {
  name: 'Chris Lotts',
  agency: 'The Lotts Agency',
  location: '',
  genres: ['horror'],
  notableClients: [],
  wishlistNotes: '',
  guidelinesUrl: '',
  guidelinesNotes: '',
  status: 'open',
  statusLastChecked: '',
  source: '',
  personalFitNotes: 'you represent voice-driven literary horror',
  tags: [],
}

describe('query-template CSV mapping', () => {
  it('round-trips a template, joining comps on semicolons', () => {
    expect(recordToTemplate(templateToRecord(template))).toEqual(template)
    expect(templateToRecord(template)['comp_titles']).toBe('Mexican Gothic;The Only Good Indians')
  })
})

describe('buildQueryDraft', () => {
  it('greets the agent and weaves in the personal-fit note', () => {
    const draft = buildQueryDraft(template, agent)
    expect(draft.startsWith('Dear Chris Lotts,')).toBe(true)
    expect(draft).toContain(
      "I'm reaching out to you because you represent voice-driven literary horror",
    )
  })

  it('includes the logline, synopsis, comps, and bio', () => {
    const draft = buildQueryDraft(template, agent)
    expect(draft).toContain('grief-stricken taxidermist')
    expect(draft).toContain('80,000-word literary horror')
    expect(draft).toContain('Comparable titles: Mexican Gothic, The Only Good Indians.')
    expect(draft).toContain('mortician by trade')
  })

  it('falls back to the wishlist note, then to no personalization', () => {
    const wishlistAgent: Agent = {
      ...agent,
      personalFitNotes: '',
      wishlistNotes: 'quiet folk horror',
    }
    expect(buildQueryDraft(template, wishlistAgent)).toContain(
      "I saw that you're looking for quiet folk horror",
    )
    const bareAgent: Agent = { ...agent, personalFitNotes: '', wishlistNotes: '' }
    const draft = buildQueryDraft(template, bareAgent)
    expect(draft).not.toContain('reaching out to you because')
    expect(draft).not.toContain('looking for')
  })

  it('omits empty template sections', () => {
    const sparse: QueryTemplate = {
      name: 'x',
      logline: 'Just a hook.',
      synopsisShort: '',
      bio: '',
      compTitles: [],
    }
    const draft = buildQueryDraft(sparse, agent)
    expect(draft).toContain('Just a hook.')
    expect(draft).not.toContain('Comparable titles')
  })
})
