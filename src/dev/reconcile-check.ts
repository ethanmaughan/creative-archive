/**
 * DEV/TEST-ONLY harness. Spawns the reconcile worker and mirrors its result into the DOM
 * for tests/e2e/reconcile-fsa.spec.ts. Not part of the app.
 */
import type { ReconcileCheckResult } from './reconcile-check.worker'

const worker = new Worker(new URL('./reconcile-check.worker.ts', import.meta.url), {
  type: 'module',
})

worker.addEventListener('message', (event: MessageEvent<ReconcileCheckResult>) => {
  const el = document.getElementById('status')
  if (!el) return
  el.dataset.state = event.data.state
  el.textContent =
    event.data.state === 'ok'
      ? `RECONCILE OK — ${event.data.message}`
      : `RECONCILE FAIL — ${event.data.message}`
})
