/** Main-thread handle to the data worker (typed via Comlink). Lazily spawned singleton. */
import * as Comlink from 'comlink'
import type { DataApi } from './types'

let client: Comlink.Remote<DataApi> | null = null

export function getDataClient(): Comlink.Remote<DataApi> {
  if (!client) {
    const worker = new Worker(new URL('./data-worker.ts', import.meta.url), {
      type: 'module',
      name: 'creative-archive-data',
    })
    client = Comlink.wrap<DataApi>(worker)
  }
  return client
}
