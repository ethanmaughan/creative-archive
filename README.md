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

**MVP complete** — all 12 phases built (see `docs/architecture.md`):

1. Project init · 2. Database schema · 3. Repository + storage (the file↔index reconciler)
   · 4. Domain models · 5. UI framework · 6. Studio (edit/create) · 7. Library · 8. Creative
   extraction · 9. Connections · 10. Search · 11. Local AI (optional) · 12. Query tracker.

Community features are intentionally excluded from the MVP.

## Toolchain

Node is pinned via `mise` (24.18.0); pnpm runs through corepack. **Chrome or Edge** is
required (File System Access API).

```sh
mise install
mise x -- corepack pnpm install
mise x -- corepack pnpm dev        # run the app
mise x -- corepack pnpm verify     # typecheck + lint + unit tests
mise x -- corepack pnpm test:e2e   # Playwright (Chromium)
```

Optional local AI: run Ollama with `OLLAMA_ORIGINS='*' ollama serve` and pull a model
(default `llama3.2`).

### Pre-push checks

CI runs the full gates on every push/PR. To also block a broken push locally, enable the
committed pre-push hook (once per clone; it applies to all worktrees):

```sh
git config core.hooksPath .githooks
```

It runs `pnpm verify` (typecheck · lint · unit) before each push; e2e stays in CI. Bypass
with `git push --no-verify`.
