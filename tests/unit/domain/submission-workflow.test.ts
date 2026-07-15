import { describe, it, expect } from 'vitest'
import {
  canTransition,
  allowedNextStatuses,
  isTerminalStatus,
} from '@/domain/services/submission-workflow'

describe('submission workflow', () => {
  it('allows draft -> submitted', () => {
    expect(canTransition('draft', 'submitted')).toBe(true)
  })

  it('forbids submitted -> draft (no going back)', () => {
    expect(canTransition('submitted', 'draft')).toBe(false)
  })

  it('treats accepted/rejected/withdrawn as terminal', () => {
    expect(isTerminalStatus('accepted')).toBe(true)
    expect(isTerminalStatus('rejected')).toBe(true)
    expect(isTerminalStatus('withdrawn')).toBe(true)
    expect(isTerminalStatus('submitted')).toBe(false)
  })

  it('lists allowed next statuses', () => {
    expect(allowedNextStatuses('submitted')).toContain('accepted')
    expect(allowedNextStatuses('accepted')).toEqual([])
  })
})
