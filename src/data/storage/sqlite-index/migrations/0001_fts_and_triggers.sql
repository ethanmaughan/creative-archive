-- FTS5 + guard triggers. These cannot be expressed in Drizzle's table DSL.

-- Contentless full-text index over documents. The reconciler (Phase 3) populates
-- rows keyed by the document's rowid; original text is NOT stored here (content='')
-- so the index stays lean and is re-derived from the canonical files.
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  body,
  tags,
  content='',
  tokenize='unicode61'
);

-- Runtime backstop (layer 3 of the protected-workspace guarantee, ADR-0001 §1):
-- AI output may only ever be recorded against a WRITABLE workspace. This is defence
-- in depth behind the filesystem handle scoping and the readonly repo types.
CREATE TRIGGER ai_runs_writable_only_insert
BEFORE INSERT ON ai_runs
WHEN NEW.workspace_id IS NOT NULL
 AND (SELECT protection FROM workspaces WHERE id = NEW.workspace_id) <> 'writable'
BEGIN
  SELECT RAISE(ABORT, 'AI output must target a writable workspace');
END;

CREATE TRIGGER ai_runs_writable_only_update
BEFORE UPDATE OF workspace_id ON ai_runs
WHEN NEW.workspace_id IS NOT NULL
 AND (SELECT protection FROM workspaces WHERE id = NEW.workspace_id) <> 'writable'
BEGIN
  SELECT RAISE(ABORT, 'AI output must target a writable workspace');
END;
