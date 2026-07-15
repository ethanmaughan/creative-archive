# ADR-0001 — Partitioned source of truth (files + SQLite)

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** Ethan (product), lead engineer

## Context

Creative Archive must "operate like a repo" — plain files on disk an AI can read — while also
providing a connections graph, full-text search, and a submission state machine. Files-as-truth and
SQLite-as-truth pull in opposite directions. Two authorities over the same data is a conflict trap.

## Decision

Partition by data shape. Each fact has exactly one home:

- **Files are canonical** for document-shaped authored content (manuscripts, scenes, notes,
  story-bible canon, research, library items + extraction). Markdown + YAML frontmatter / JSON.
- **SQLite is canonical** for relational/operational/derived data (connections, tags, Query Tracker,
  FTS index, future vectors). Exported to JSON/CSV for portability.

Binding: every file carries a stable `id` (UUID) in frontmatter; DB rows reference documents by
UUID. A file-watcher re-indexes on change — **files win**; the DB re-derives. Deleting the index
loses nothing.

## Consequences

- **+** True repo semantics; git-diffable; AI reads files directly; "you can always leave" is literal.
- **+** No story-bible duplication — the index _is_ the AI's context.
- **+** "Protected directories" becomes a real filesystem boundary (see ADR-0002 / §1 guarantee).
- **−** We own a file↔index reconciler (watcher + rebuild) — the keystone risk, front-loaded to Phase 3.
- **−** Relational integrity for polymorphic `connections` is enforced in the domain layer, not by FKs.
