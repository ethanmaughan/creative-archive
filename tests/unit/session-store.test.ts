import { describe, it, expect, beforeEach } from 'vitest'
import { useSession } from '@/app/store/session'

beforeEach(() => {
  useSession.setState({ status: 'idle', archiveName: null, docCount: 0, error: null })
})

describe('session store', () => {
  it('transitions opening -> ready', () => {
    useSession.getState().setOpening()
    expect(useSession.getState().status).toBe('opening')
    useSession.getState().setReady('My Archive', 5)
    expect(useSession.getState()).toMatchObject({
      status: 'ready',
      archiveName: 'My Archive',
      docCount: 5,
    })
  })

  it('captures an error', () => {
    useSession.getState().setError('boom')
    expect(useSession.getState()).toMatchObject({ status: 'error', error: 'boom' })
  })

  it('resets to idle', () => {
    useSession.getState().setReady('x', 1)
    useSession.getState().reset()
    expect(useSession.getState().status).toBe('idle')
  })
})
