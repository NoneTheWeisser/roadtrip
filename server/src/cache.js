/**
 * Tiny TTL cache for geocode/directions to respect ORS free-tier limits.
 */

export function createTtlCache() {
  const store = new Map()

  return {
    get(key) {
      const hit = store.get(key)
      if (!hit) {
        return undefined
      }
      if (Date.now() > hit.expiresAt) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
  }
}
