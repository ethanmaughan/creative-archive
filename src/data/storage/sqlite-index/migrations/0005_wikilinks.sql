-- Derived wikilink graph: [[Target]] references parsed from document bodies. DERIVED and
-- rebuildable from files (ADR-0001), so it lives apart from the canonical, manual `connections`.
-- target_id is NULL when the link is unresolved (a "broken" link to a doc that doesn't exist yet).
CREATE TABLE links (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL,       -- document containing the [[link]]
  target_text TEXT NOT NULL,     -- the target as written (trimmed), for display + resolution
  target_id TEXT,                -- resolved document id, or NULL if unresolved
  alias TEXT,                    -- optional [[target|alias]] display text
  created_at TEXT NOT NULL
);

CREATE INDEX idx_links_source ON links (source_id);
CREATE INDEX idx_links_target ON links (target_id);
CREATE INDEX idx_links_target_text ON links (target_text);
