/** Identity of the signed-in practice. Empty when nobody is signed in. */
export function practiceScope(user) {
  return user?.userId ? `${user.userId}:${user.organizationId || ''}` : ''
}

const resets = new Set()
let activeScope = ''

/** Drop module-level data when the signed-in practice changes. Returns an unsubscribe. */
export function registerPracticeReset(fn) {
  resets.add(fn)
  return () => resets.delete(fn)
}

/**
 * Call before React stores a new session. Clears every registered cache when the
 * person or practice is different, so the next render cannot reuse the previous one.
 */
export function commitPracticeScope(user) {
  const next = practiceScope(user)
  if (next === activeScope) return
  activeScope = next
  for (const fn of resets) fn()
}
