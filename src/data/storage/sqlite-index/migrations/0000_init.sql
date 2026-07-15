-- Creative Archive — initial schema (design §5). Hand-authored to mirror schema.ts.
-- Applied by the in-house migrator (../migrator.ts). drizzle-kit generate is deferred
-- (pnpm 11 / drizzle-kit dep-status-check incompatibility); this file is authoritative.

CREATE TABLE workspaces (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  rel_path text NOT NULL,
  protection text NOT NULL DEFAULT 'canonical',
  created_at text NOT NULL,
  CONSTRAINT ck_workspace_protection CHECK (protection IN ('canonical', 'writable'))
);
CREATE UNIQUE INDEX workspaces_rel_path_unique ON workspaces (rel_path);

CREATE TABLE documents (
  id text PRIMARY KEY NOT NULL,
  kind text NOT NULL,
  rel_path text NOT NULL,
  title text,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  content_hash text NOT NULL,
  frontmatter text,
  file_mtime text NOT NULL,
  indexed_at text NOT NULL
);
CREATE UNIQUE INDEX documents_rel_path_unique ON documents (rel_path);
CREATE INDEX idx_documents_kind ON documents (kind);
CREATE INDEX idx_documents_workspace ON documents (workspace_id);

CREATE TABLE library_items (
  document_id text PRIMARY KEY NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  creator text,
  year integer,
  consumed_on text,
  rating integer
);

CREATE TABLE extraction_facets (
  id text PRIMARY KEY NOT NULL,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  facet text NOT NULL,
  content text NOT NULL
);
CREATE INDEX idx_facets_document ON extraction_facets (document_id);
CREATE INDEX idx_facets_facet ON extraction_facets (facet);

CREATE TABLE connections (
  id text PRIMARY KEY NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  relationship text,
  note text,
  created_at text NOT NULL
);
CREATE UNIQUE INDEX uq_connection ON connections (source_type, source_id, target_type, target_id, relationship);
CREATE INDEX idx_connection_source ON connections (source_type, source_id);
CREATE INDEX idx_connection_target ON connections (target_type, target_id);

CREATE TABLE tags (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  color text
);
CREATE UNIQUE INDEX tags_name_unique ON tags (name);

CREATE TABLE taggings (
  tag_id text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE TABLE markets (
  id text PRIMARY KEY NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  org text,
  email text,
  url text,
  guidelines text,
  notes text,
  CONSTRAINT ck_market_kind CHECK (kind IN ('agent', 'publisher', 'magazine', 'contest'))
);

CREATE TABLE submissions (
  id text PRIMARY KEY NOT NULL,
  market_id text NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
  document_id text REFERENCES documents(id) ON DELETE SET NULL,
  manuscript_rev text,
  title text NOT NULL,
  status text NOT NULL,
  submitted_on text,
  deadline_on text,
  fee_cents integer,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CONSTRAINT ck_submission_status CHECK (status IN ('draft', 'queued', 'submitted', 'received', 'rejected', 'accepted', 'withdrawn', 'no_response'))
);
CREATE INDEX idx_submission_market ON submissions (market_id);
CREATE INDEX idx_submission_status ON submissions (status);

CREATE TABLE submission_materials (
  id text PRIMARY KEY NOT NULL,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  document_id text REFERENCES documents(id) ON DELETE SET NULL,
  label text NOT NULL
);

CREATE TABLE submission_events (
  id text PRIMARY KEY NOT NULL,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text,
  body text,
  occurred_on text NOT NULL
);
CREATE INDEX idx_events_submission ON submission_events (submission_id);

CREATE TABLE ai_runs (
  id text PRIMARY KEY NOT NULL,
  task text NOT NULL,
  model text,
  input_ref text,
  workspace_id text REFERENCES workspaces(id),
  status text NOT NULL,
  created_at text NOT NULL
);
