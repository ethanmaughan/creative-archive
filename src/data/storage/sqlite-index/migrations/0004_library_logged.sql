-- Library items gain a `logged` timestamp (when the entry was created in the app), alongside
-- the existing `consumed_on` (the user-entered date they read/watched the media). Both are
-- derived from file frontmatter and sortable.
ALTER TABLE library_items ADD COLUMN logged TEXT;
