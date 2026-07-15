/**
 * DEV/TEST-ONLY harness. Spawns the OPFS DB worker and mirrors its result into the DOM
 * for the Playwright OPFS test (tests/e2e/opfs-db.spec.ts). Not part of the app; proper
 * DB initialization lands with the UI framework in Phase 5.
 */
import type { DbCheckResult } from './db-check.worker'

const worker = new Worker(new URL('./db-check.worker.ts', import.meta.url), { type: 'module' })

worker.addEventListener('message', (event: MessageEvent<DbCheckResult>) => {
  const el = document.getElementById('status')
  if (!el) return
  el.dataset.state = event.data.state
  el.textContent =
    event.data.state === 'ok'
      ? `OPFS OK — ${event.data.message}`
      : `OPFS FAIL — ${event.data.message}`
})
