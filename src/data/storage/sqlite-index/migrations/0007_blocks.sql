-- Referenceable anchors within documents: trailing `^id` block markers and headings.
-- Derived from bodies, rebuilt by the reconciler (ADR-0001).
CREATE TABLE blocks (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL,
  anchor TEXT NOT NULL,        -- the ^id (caret stripped) or the heading slug
  type TEXT NOT NULL,          -- 'block' | 'heading'
  text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_blocks_document ON blocks (document_id);
CREATE INDEX idx_blocks_anchor ON blocks (document_id, anchor);

-- A wikilink may target a specific block/heading via `[[Doc#^id]]` / `[[Doc#Heading]]`.
ALTER TABLE links ADD COLUMN target_block TEXT;
