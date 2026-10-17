import type { ZodType } from 'zod'

/**
 * The app's only `localStorage` adapter.
 *
 * Centralised because `localStorage` fails in ways a bare
 * `getItem`/`setItem` does not surface: it throws in private-browsing modes,
 * throws on write when the quota is full, and its contents are readable and
 * writable by every other script on this origin. Callers should not have to
 * remember that at each call site.
 */

/** Read a string, or `null` if absent or unreadable. */
export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false // Storage disabled or quota exceeded.
  }
}

/**
 * Read JSON and validate it against `schema`.
 *
 * Anything unparsable or off-contract yields `fallback`. Validation is not
 * paranoia here: this origin's storage is shared, so a stale entry from an
 * older build — or anything else that has written to the key — is expected
 * input, not an impossible case.
 */
export function readJson<T>(key: string, schema: ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback

    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  }
}

/** Write JSON. Returns `false` if the write failed, so callers can decide. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
