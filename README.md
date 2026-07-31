# Creative Archive

A **local-first** workspace for writers and creative professionals. It organizes your creative
work — notes, manuscripts, story bibles, media logs, research — as one connected graph that you
fully own. Everything is plain Markdown in a folder on your machine. **AI retrieves; it never
authors.**

No accounts. No server. No cloud. No subscription.

## Why

The tools writers reach for are drifting away from the thing that made them worth trusting.
Popular note apps are moving their canonical data into databases and charging for cloud sync.
Creative Archive goes the other way: your **files on disk are the source of truth**, the index is
disposable, and nothing ever leaves your machine.

## What it does

- **Plain files, always** — Markdown + frontmatter on disk. Delete the index and it rebuilds from
  your folder. Open the files in any editor; they're yours.
- **Spaces** — a workspace per project or class, with a shared Library and research across them.
- **Linking, the good parts** — `[[wikilinks]]` with backlinks, inline `#tags`, `^id` block and
  heading references, `![[embeds]]` (inline transclusion), and a live **graph view** — with `[[`
  and `#` autocomplete as you type.
- **Inline queries** — a ` ```query ` block lists matching notes, read-only and declarative.
- **Search that reaches inside uploads** — full-text across your notes _and_ the text of `.docx`
  and `.pdf` files you drop in.
- **Library** — log books/films/anything with dates, ratings, and creative-extraction facets.
- **Query tracker** — track submissions to agents/publishers/markets.
- **Optional local AI** — summaries and consistency checks via a local model (Ollama). It only
  ever reads what you've written, and writes suggestions to a scratch workspace — never your
  manuscript. If it's not running, only the AI features disappear.

There's a **Help** page inside the app with the full syntax cheatsheet.

## Download

**macOS (Apple Silicon):** grab the latest `.dmg` from the
[**Releases** page](https://github.com/ethanmaughan/creative-archive/releases/latest), open it, and
drag the app to Applications.

Creative Archive is free and isn't code-signed, so the first launch needs one extra click:
**right-click the app → Open → Open**. macOS remembers the choice after that. (On an Intel Mac or
another OS, run it from source — see below.)

## Run it locally

**Requirements:** [Node.js](https://nodejs.org) 24, and **Chrome or Edge** (the folder access uses
the File System Access API, which Firefox/Safari don't fully support — the desktop build below
works everywhere).

```sh
git clone https://github.com/ethanmaughan/creative-archive.git
cd creative-archive

corepack enable          # provides pnpm
pnpm install
pnpm dev                 # → http://localhost:5173
```

Open **http://localhost:5173** in Chrome or Edge, click **Open archive folder**, and pick a folder
(an existing archive, or a new empty one). It's remembered locally, so it reconnects next time.

> Using [mise](https://mise.jdx.dev)? `mise install` pins Node, then prefix the commands with
> `mise x -- corepack pnpm …`.

## Desktop app (macOS / Tauri)

A native app that opens a real folder — no browser, no picker friction. Needs the
[Rust toolchain](https://rustup.rs).

```sh
pnpm tauri dev                    # run the native app (first build compiles Rust, ~1 min)
pnpm build && pnpm tauri build    # produce a .app + .dmg in src-tauri/target/release/bundle/
```

The bundle is **unsigned** — it runs on your own machine, but sharing it to another Mac needs a
right-click → Open (or an Apple Developer ID to sign + notarize).

## Optional local AI

Run Ollama so this origin can reach it, then pull a model (default `llama3.2`):

```sh
OLLAMA_ORIGINS='*' ollama serve
```

## Architecture

- **Source of truth:** plain files on disk. **SQLite** (compiled to WASM, in the browser's OPFS) is
  a rebuildable index/ledger — a reconciler keeps it in sync with the folder and can rebuild it
  from scratch. See `docs/architecture.md`.
- **Filesystem behind a `FileStore` interface:** a File System Access adapter for the web, a native
  Tauri adapter for desktop — the rest of the app doesn't know the difference.
- Stack: React 19, Vite, TypeScript (strict), a Comlink data worker, TipTap editor, Playwright.

## Development

```sh
pnpm verify              # typecheck · lint · unit tests
pnpm test:e2e            # Playwright (Chromium)
```

CI runs the full gates on every push/PR. To also block a broken push locally, enable the committed
hook once per clone (it applies to all worktrees):

```sh
git config core.hooksPath .githooks
```
