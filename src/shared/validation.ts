/** Non-throwing validation outcome — supports "quarantine, don't reject" (never let one
 *  malformed file block the whole archive). */

export interface ValidationIssue {
  readonly path: string
  readonly message: string
}

export type ValidationResult<T> =
  | { readonly valid: true; readonly data: T }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] }
