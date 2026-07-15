/** Invariants + identity for polymorphic connections. Pure, no IO. */
import type { ConnectionInput } from '../models/connection'
import type { ValidationIssue, ValidationResult } from '@/shared/validation'

export function isSelfReference(input: ConnectionInput): boolean {
  return input.source.type === input.target.type && input.source.id === input.target.id
}

/** Stable identity used to dedupe connections (mirrors the DB unique constraint). */
export function connectionKey(input: ConnectionInput): string {
  const { source, target, relationship } = input
  return `${source.type}:${source.id}->${target.type}:${target.id}#${relationship ?? ''}`
}

export function validateConnection(input: ConnectionInput): ValidationResult<ConnectionInput> {
  const issues: ValidationIssue[] = []
  if (input.source.id === '' || input.target.id === '') {
    issues.push({ path: 'id', message: 'source and target must both reference an entity' })
  }
  if (isSelfReference(input)) {
    issues.push({ path: 'target', message: 'a connection cannot reference itself' })
  }
  return issues.length > 0 ? { valid: false, issues } : { valid: true, data: input }
}
