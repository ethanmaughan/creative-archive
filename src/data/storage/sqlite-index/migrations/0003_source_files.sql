-- Read-only index of foreign "source" files (uploads / reference material) that are NOT
-- app-authored Markdown documents. Identified by path (never mutated, so no embedded UUID).
-- Fully derived and rebuildable, exactly like `documents`.
CREATE TABLE source_files (
  id INTEGER PRIMARY KEY,            -- rowid; joins to source_files_fts
  rel_path TEXT NOT NULL UNIQUE,
  ext TEXT NOT NULL,
  category TEXT NOT NULL,            -- text | docx | pdf | image | other
  title TEXT NOT NULL,              -- basename
  size INTEGER NOT NULL DEFAULT 0,
  file_mtime INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,
  has_text INTEGER NOT NULL DEFAULT 0,
  indexed_at TEXT NOT NULL
);

CREATE INDEX idx_source_files_category ON source_files (category);

-- Contentless FTS over extracted text (design §5: the file on disk is canonical, this is derived).
CREATE VIRTUAL TABLE source_files_fts USING fts5 (
  title,
  body,
  path,
  content = '',
  contentless_delete = 1
);
