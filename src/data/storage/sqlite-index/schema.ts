/**
 * SQLite index & ledger schema (design §5).
 *
 * Remember the source-of-truth partition (ADR-0001):
 *   - `documents`, `library_items`, `extraction_facets`, and `documents_fts`
 *     are DERIVED from canonical files and are fully rebuildable.
 *   - `connections`, `tags`/`taggings`, and the query-tracker tables
 *     (`markets`, `submissions`, `submission_materials`, `submission_events`)
 *     are CANONICAL here; they are exported to JSON/CSV for portability.
 *
 * The FTS5 virtual table and the `ai_runs` guard trigger cannot be expressed in
 * Drizzle's table DSL — they live in a hand-authored migration
 * (`migrations/0001_fts_and_triggers.sql`).
 */
import { sql } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
  primaryKey,
  check,
} from 'drizzle-orm/sqlite-core'

/** Directory registry — powers the protected/writable guarantee. */
export const workspaces = sqliteTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    relPath: text('rel_path').notNull().unique(),
    protection: text('protection', { enum: ['canonical', 'writable'] })
      .notNull()
      .default('canonical'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [check('ck_workspace_protection', sql`${t.protection} in ('canonical', 'writable')`)],
)

/** Derived index of file-canonical documents (id = frontmatter UUID). */
export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    relPath: text('rel_path').notNull().unique(),
    title: text('title'),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    contentHash: text('content_hash').notNull(),
    frontmatter: text('frontmatter'),
    fileMtime: text('file_mtime').notNull(),
    indexedAt: text('indexed_at').notNull(),
  },
  (t) => [
    index('idx_documents_kind').on(t.kind),
    index('idx_documents_workspace').on(t.workspaceId),
  ],
)

/** Derived index of read-only foreign "source" files (keyed by path; never mutated). The
 *  `source_files_fts` companion is hand-authored in migration 0003. */
export const sourceFiles = sqliteTable(
  'source_files',
  {
    id: integer('id').primaryKey(),
    relPath: text('rel_path').notNull().unique(),
    ext: text('ext').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    size: integer('size').notNull().default(0),
    fileMtime: integer('file_mtime').notNull().default(0),
    contentHash: text('content_hash').notNull(),
    hasText: integer('has_text').notNull().default(0),
    indexedAt: text('indexed_at').notNull(),
  },
  (t) => [index('idx_source_files_category').on(t.category)],
)

/** Derived wikilink graph parsed from document bodies (`[[Target]]`). Rebuilt by the reconciler;
 *  `target_id` is null for unresolved (broken) links. Distinct from the canonical `connections`. */
export const links = sqliteTable(
  'links',
  {
    id: integer('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    targetText: text('target_text').notNull(),
    targetId: text('target_id'),
    targetBlock: text('target_block'),
    alias: text('alias'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_links_source').on(t.sourceId),
    index('idx_links_target').on(t.targetId),
    index('idx_links_target_text').on(t.targetText),
  ],
)

/** Referenceable anchors within documents: trailing `^id` block markers and headings (0007). */
export const blocks = sqliteTable(
  'blocks',
  {
    id: integer('id').primaryKey(),
    documentId: text('document_id').notNull(),
    anchor: text('anchor').notNull(),
    type: text('type').notNull(),
    text: text('text').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    index('idx_blocks_document').on(t.documentId),
    index('idx_blocks_anchor').on(t.documentId, t.anchor),
  ],
)

/** Typed projection for library items (metadata; extraction lives in the file body). */
export const libraryItems = sqliteTable('library_items', {
  documentId: text('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(),
  creator: text('creator'),
  year: integer('year'),
  consumedOn: text('consumed_on'),
  rating: integer('rating'),
  /** ISO datetime the entry was logged in the app (migration 0004). */
  logged: text('logged'),
})

/** Queryable slices of creative extraction, derived from library-item file sections. */
export const extractionFacets = sqliteTable(
  'extraction_facets',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    facet: text('facet').notNull(),
    content: text('content').notNull(),
  },
  (t) => [index('idx_facets_document').on(t.documentId), index('idx_facets_facet').on(t.facet)],
)

/**
 * Polymorphic connection graph — the product's spine. No FK (references can point
 * at any entity kind); integrity is enforced in the domain layer and the reconciler
 * prunes dangling edges when a document disappears.
 */
export const connections = sqliteTable(
  'connections',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    relationship: text('relationship'),
    note: text('note'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    unique('uq_connection').on(t.sourceType, t.sourceId, t.targetType, t.targetId, t.relationship),
    index('idx_connection_source').on(t.sourceType, t.sourceId),
    index('idx_connection_target').on(t.targetType, t.targetId),
  ],
)

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
})

/** Polymorphic tagging join. */
export const taggings = sqliteTable(
  'taggings',
  {
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.entityType, t.entityId] })],
)

/** Query Tracker — submission targets. */
export const markets = sqliteTable(
  'markets',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['agent', 'publisher', 'magazine', 'contest'] }).notNull(),
    name: text('name').notNull(),
    org: text('org'),
    email: text('email'),
    url: text('url'),
    guidelines: text('guidelines'),
    notes: text('notes'),
  },
  (t) => [check('ck_market_kind', sql`${t.kind} in ('agent', 'publisher', 'magazine', 'contest')`)],
)

/** Query Tracker — a submission with a status state machine and manuscript-version link. */
export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    marketId: text('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'restrict' }),
    documentId: text('document_id').references(() => documents.id, { onDelete: 'set null' }),
    manuscriptRev: text('manuscript_rev'),
    title: text('title').notNull(),
    status: text('status', {
      enum: [
        'draft',
        'queued',
        'submitted',
        'received',
        'rejected',
        'accepted',
        'withdrawn',
        'no_response',
      ],
    }).notNull(),
    submittedOn: text('submitted_on'),
    deadlineOn: text('deadline_on'),
    feeCents: integer('fee_cents'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    check(
      'ck_submission_status',
      sql`${t.status} in ('draft', 'queued', 'submitted', 'received', 'rejected', 'accepted', 'withdrawn', 'no_response')`,
    ),
    index('idx_submission_market').on(t.marketId),
    index('idx_submission_status').on(t.status),
  ],
)

export const submissionMaterials = sqliteTable('submission_materials', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
})

export const submissionEvents = sqliteTable(
  'submission_events',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status'),
    body: text('body'),
    occurredOn: text('occurred_on').notNull(),
  },
  (t) => [index('idx_events_submission').on(t.submissionId)],
)

/** AI task ledger. The runtime writable-only guard is a trigger (see 0001 migration). */
export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey(),
  task: text('task').notNull(),
  model: text('model'),
  inputRef: text('input_ref'),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
})

export const schema = {
  workspaces,
  documents,
  sourceFiles,
  links,
  blocks,
  libraryItems,
  extractionFacets,
  connections,
  tags,
  taggings,
  markets,
  submissions,
  submissionMaterials,
  submissionEvents,
  aiRuns,
}
