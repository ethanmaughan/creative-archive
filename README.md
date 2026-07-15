# Creative Archive

A **local-first** workspace for writers and creative professionals. It organizes creative
work — projects, story bibles, media logging, research, and query tracking — as one
connected graph the writer fully owns. **AI retrieves; it never authors.**

## Architecture at a glance
- **Shell:** web-first (Chromium, File System Access API); a Tauri desktop adapter is deferred behind the same `FileStore` interface.
- **Source of truth:** plain files on disk (Markdown + frontmatter, JSON, CSV). SQLite is a **rebuildable index/ledger**, never the canonical store.
- **AI:** optional. Local (Ollama). If unavailable, only AI features disappear.
- **Privacy:** manuscripts never leave the machine.

Full design package: `docs/architecture.md`.

## Status
Built in 12 phases. Currently: **Phase 1 — project initialization.**

## Toolchain
Node is pinned via `mise` (24.18.0); pnpm runs through corepack.
```sh
mise install
mise x -- corepack pnpm install
```
