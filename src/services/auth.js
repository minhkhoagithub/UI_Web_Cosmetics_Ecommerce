const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl
  }

  const apiOrigin = import.meta.env.VITE_API_ORIGIN
  if (apiOrigin) {
    const normalizedOrigin = apiOrigin.endsWith('/') ? apiOrigin.slice(0, -1) : apiOrigin
    return `${normalizedOrigin}/api`
  }

  return '/api'
}

const API_BASE_URL = resolveApiBaseUrl()
const AUTH_STORAGE_KEY = 'cosmetics-shop.auth'

const isBrowser = typeof window !== 'undefined'

const decodeTokenPayload = (token) => {
  if (!token) {
    return null
  }

  try {
    const [, payload] = token.split('.')

    if (!payload) {
      return null
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')

    return JSON.parse(window.atob(paddedPayload))
  } catch {
    return null
  }
}

const isExpiredToken = (tokenPayload) => {
  if (!tokenPayload?.exp) {
    return false
  }

  return tokenPayload.exp * 1000 <= Date.now()
}

const normalizeSession = (session) => {
  if (!session?.accessToken) {
    return null
  }

  const tokenPayload = decodeTokenPayload(session.accessToken)

  if (isExpiredToken(tokenPayload)) {
    return null
  }

  return {
    accessToken: session.accessToken,
    tokenType: session.tokenType ?? 'Bearer',
    user: {
      email: tokenPayload?.sub ?? session.user?.email ?? '',
      userId: tokenPayload?.userId ?? session.user?.userId ?? '',
      role: tokenPayload?.role ?? session.user?.role ?? '',
    },
  }
}

const readSessionFromStorage = (storage) => {
  if (!storage) {
    return null
  }

  try {
    const storedValue = storage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const normalizedSession = normalizeSession(JSON.parse(storedValue))

    if (!normalizedSession) {
      storage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    return normalizedSession
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export const getStoredAuthSession = () => {
  if (!isBrowser) {
    return null
  }

  return readSessionFromStorage(window.localStorage) ?? readSessionFromStorage(window.sessionStorage)
}

export const clearStoredAuthSession = () => {
  if (!isBrowser) {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

export const storeAuthSession = (session, remember) => {
  if (!isBrowser) {
    return
  }

  const normalizedSession = normalizeSession(session)

  if (!normalizedSession) {
    clearStoredAuthSession()
    return
  }

  clearStoredAuthSession()

  const storage = remember ? window.localStorage : window.sessionStorage
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedSession))
}

const parseResponseBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const getDetailsMessage = (payload) => {
  if (!Array.isArray(payload?.details) || payload.details.length === 0) {
    return null
  }

  return payload.details
    .map((detail) => {
      if (!detail) {
        return null
      }

      if (detail.field && detail.message) {
        return `${detail.field}: ${detail.message}`
      }

      return detail.message ?? null
    })
    .filter(Boolean)
    .join('; ')
}

const getErrorMessage = (payload, fallbackMessage) => {
  const detailsMessage = getDetailsMessage(payload)

  if (detailsMessage) {
    return detailsMessage
  }

  if (payload?.message) {
    return payload.message
  }

  if (payload?.error) {
    return payload.error
  }

  return fallbackMessage
}

const unwrapSuccessPayload = (payload) => {
  if (payload?.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data ?? payload
  }

  return payload
}

const request = async (endpoint, options = {}, fallbackMessage) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage))
  }

  return unwrapSuccessPayload(payload)
}

export const loginRequest = async ({ identifier, password }) => {
  return request(
    '/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    },
    'Dang nhap that bai. Vui long thu lai.',
  )
}

export const registerRequest = async ({ email, password, fullName, phone }) => {
  return request(
    '/v1/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, phone }),
    },
    'Dang ky that bai. Vui long thu lai.',
  )
}

export const verifyRegistrationOtpRequest = async ({ email, otp }) => {
  return request(
    '/v1/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    },
    'Xac thuc OTP that bai. Vui long thu lai.',
  )
}

export const logoutRequest = async (accessToken) => {
  return request(
    '/v1/auth/logout',
    {
      method: 'POST',
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
    'Dang xuat that bai. Phien dang nhap cuc bo van se duoc xoa.',
  )
}
