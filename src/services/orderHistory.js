const ORDER_HISTORY_STORAGE_PREFIX = 'cosmetics-shop.order-history'

const getOrderHistoryStorageKey = (shopperId) => `${ORDER_HISTORY_STORAGE_PREFIX}.${shopperId}`

export const readOrderHistory = (shopperId) => {
  if (typeof window === 'undefined' || !shopperId) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(getOrderHistoryStorageKey(shopperId))
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

export const appendOrderHistoryEntry = (shopperId, entry) => {
  if (typeof window === 'undefined' || !shopperId || !entry?.orderId) {
    return
  }

  const currentEntries = readOrderHistory(shopperId)
  const nextEntries = [
    entry,
    ...currentEntries.filter((currentEntry) => currentEntry.orderId !== entry.orderId),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  window.localStorage.setItem(getOrderHistoryStorageKey(shopperId), JSON.stringify(nextEntries))
}
