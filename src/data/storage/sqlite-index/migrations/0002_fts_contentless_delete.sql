-- Recreate the FTS index with contentless_delete=1 (SQLite 3.43+), so the reconciler
-- can DELETE/UPDATE FTS rows by rowid when a document changes or is removed — without
-- storing the original text. Safe to drop/recreate: the reconciler that populates it
-- ships in this same phase, so there is no data to lose.
DROP TABLE IF EXISTS documents_fts;

CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  body,
  tags,
  content='',
  contentless_delete=1,
  tokenize='unicode61'
);
