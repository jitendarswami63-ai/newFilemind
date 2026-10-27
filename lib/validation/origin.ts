/**
 * Same-origin check for mutative API requests.
 * Validates that Origin or Referer header matches the Request Host.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  if (!host) return false

  if (origin) {
    try {
      const url = new URL(origin)
      if (url.host === host) return true
    } catch {
      return false
    }
  }

  if (referer) {
    try {
      const url = new URL(referer)
      if (url.host === host) return true
    } catch {
      return false
    }
  }

  return false
}
