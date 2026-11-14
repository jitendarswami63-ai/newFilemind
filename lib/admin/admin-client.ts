let cachedEmail: string | null = null
let cachedIsAdmin = false
let inFlightAdminPromise: Promise<boolean> | null = null

export async function checkIsAdminClient(email?: string | null): Promise<boolean> {
  if (!email || typeof email !== 'string') return false
  const normalizedEmail = email.trim().toLowerCase()

  if (cachedEmail === normalizedEmail) {
    return cachedIsAdmin
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`filemind_admin_${normalizedEmail}`)
      if (stored !== null) {
        cachedEmail = normalizedEmail
        cachedIsAdmin = stored === 'true'
        return cachedIsAdmin
      }
    } catch {}
  }

  if (inFlightAdminPromise) {
    return inFlightAdminPromise
  }

  inFlightAdminPromise = (async () => {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        const data = await res.json()
        const isAdmin = Boolean(data?.isAdmin)
        cachedEmail = normalizedEmail
        cachedIsAdmin = isAdmin
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`filemind_admin_${normalizedEmail}`, String(isAdmin))
          } catch {}
        }
        return isAdmin
      }
      return false
    } catch {
      return false
    } finally {
      inFlightAdminPromise = null
    }
  })()

  return inFlightAdminPromise
}
