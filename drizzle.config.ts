import { defineConfig } from 'drizzle-kit'

// Used only by `drizzle-kit generate` to emit versioned SQL from schema.ts.
// The app applies those migrations at runtime via the in-house migrator
// (src/data/storage/sqlite-index/migrator.ts) — drizzle-kit does not talk to
// the browser/OPFS database directly.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/data/storage/sqlite-index/schema.ts',
  out: './src/data/storage/sqlite-index/migrations',
  strict: true,
  verbose: true,
})
