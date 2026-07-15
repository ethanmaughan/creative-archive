# ADR-0002 — Web-first shell behind a `FileStore` interface (decision C)

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** Ethan (product), lead engineer

## Context

The product should feel like a web app with data living on the user's machine, readable by AI. The
original brief named Tauri (desktop). Research confirmed the **File System Access API**
(`showDirectoryPicker` + persistent permission) lets a browser read/write a real local folder — but
it is **Chromium-only** (Chrome/Edge/Opera); Firefox and Safari expose only OPFS, and both vendors
have declined the local-disk pickers. Local Ollama from a browser requires an `OLLAMA_ORIGINS`
(CORS) opt-in.

## Decision

Ship **web-first on Chromium** using the File System Access API. Abstract all filesystem access
behind a **`FileStore` interface** with swappable adapters:

- `fsa-adapter` — File System Access API. Ships in v1.
- `tauri-adapter` — Tauri 2 desktop. Deferred; same interface, cross-platform + offline.

The derived SQLite index runs as WASM in **OPFS** for the web build.

## Consequences

- **+** Zero install now; the desktop/web question becomes a swappable adapter, not an architecture.
- **+** Honors the modularity principle (interfaces over implementations).
- **−** v1 practically requires Chrome/Edge; Firefox/Safari users are not served until a Tauri build.
- **−** Ollama needs a one-time CORS setup step (documented for users in the AI phase).
- **Guardrail:** nothing above the `FileStore` interface may import an adapter directly.
