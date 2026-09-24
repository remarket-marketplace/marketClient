const AUTH_WELCOME_TOAST_STORAGE_KEY = 'auth_welcome_toast'

export type AuthWelcomeToastPayload = {
  title: string
}

export function queueAuthWelcomeToast(payload: AuthWelcomeToastPayload): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(AUTH_WELCOME_TOAST_STORAGE_KEY, JSON.stringify(payload))
}

export function consumeAuthWelcomeToast(): AuthWelcomeToastPayload | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(AUTH_WELCOME_TOAST_STORAGE_KEY)
  if (!raw) return null
  window.sessionStorage.removeItem(AUTH_WELCOME_TOAST_STORAGE_KEY)

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.title !== 'string') return null
    return {
      title: parsed.title,
    }
  } catch {
    return null
  }
}
