/**
 * Sanitize a user-controlled value before interpolating it into a PostgREST
 * filter string (.ilike(), .or(), etc).
 *
 * PostgREST's filter DSL uses `,` to separate `.or()` conditions, `.` to
 * separate column/operator/value within a condition, and `(`/`)` for
 * grouping. Left unescaped, a search value like `a,is_admin.eq.true` lets an
 * attacker inject additional filter clauses rather than just searching for
 * "a". PostgREST's own escape mechanism (quoting values containing these
 * characters) is easy to get subtly wrong, so instead of trying to re-derive
 * it we strip the structural characters outright — none of them are
 * meaningful in a legitimate name/email/title search term.
 */
export function sanitizePostgrestSearchTerm(value: string): string {
  return value.replace(/[,.()*]/g, "").trim();
}
