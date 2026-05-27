const GUEST_SHOPPER_STORAGE_KEY = 'cosmetics-shop.guest-shopper-id'

const createGuestShopperId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-${crypto.randomUUID()}`
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const getGuestShopperId = () => {
  if (typeof window === 'undefined') {
    return 'guest-ssr'
  }

  const storedId = window.localStorage.getItem(GUEST_SHOPPER_STORAGE_KEY)
  if (storedId) {
    return storedId
  }

  const nextGuestId = createGuestShopperId()
  window.localStorage.setItem(GUEST_SHOPPER_STORAGE_KEY, nextGuestId)
  return nextGuestId
}

export const getActiveShopperId = (userId) => userId || getGuestShopperId()
