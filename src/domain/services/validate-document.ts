import { type DocumentKind, frontmatterSchemas } from '../models/document'
import type { ValidationResult } from '@/shared/validation'

/**
 * Validate a document's frontmatter against its kind's schema. Non-throwing: a failure
 * returns issues so callers can quarantine the file (index it anyway, surface the problem)
 * rather than aborting a whole reconcile.
 */
export function validateFrontmatter(
  kind: DocumentKind,
  data: unknown,
): ValidationResult<Record<string, unknown>> {
  const result = frontmatterSchemas[kind].safeParse(data)
  if (result.success) {
    return { valid: true, data: result.data as Record<string, unknown> }
  }
  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
