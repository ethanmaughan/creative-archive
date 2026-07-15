# src-tauri — dormant (deferred desktop adapter)

This directory is a deliberate placeholder, not a compiled Tauri project.

Per **[ADR-0002](../docs/adr/0002-web-first-shell-filestore-interface.md)** (decision C),
Creative Archive ships **web-first** on Chromium via the File System Access API. Desktop
packaging with **Tauri 2** is a _future adapter_ behind the `FileStore` interface
(`src/data/storage/file-store/tauri-adapter/`), not a v1 concern.

We intentionally do **not** commit a non-compiling Rust scaffold here. When the Tauri
phase begins, this becomes a real project via `pnpm dlx @tauri-apps/cli init`, and
`src-tauri/target/` is already git-ignored.

**Nothing above the `FileStore` interface changes when this is activated.**
