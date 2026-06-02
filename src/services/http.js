import { getStoredAuthSession } from './auth'

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
const DEFAULT_RETRY_DELAY_MS = 300

const wait = (durationMs) => new Promise((resolve) => window.setTimeout(resolve, durationMs))

const isRetryableStatus = (status) => status === 408 || status >= 500

const toTimeoutError = () => {
  const error = new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.')
  error.retryable = true
  return error
}

const parseResponseBody = async (response) => {
  if (response.status === 204) {
    return null
  }

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

export const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          searchParams.append(key, String(entry))
        }
      })
      return
    }

    searchParams.append(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export const apiRequest = async (
  endpoint,
  {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    userId,
    retries = 0,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = 0,
  } = {},
  fallbackMessage = 'Yêu cầu không thành công. Vui lòng thử lại.',
) => {
  const session = getStoredAuthSession()
  const resolvedHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body !== undefined && !(body instanceof FormData)) {
    resolvedHeaders['Content-Type'] = 'application/json'
  }

  if (auth && session?.accessToken) {
    resolvedHeaders.Authorization = `Bearer ${session.accessToken}`
  }

  if (userId) {
    resolvedHeaders['X-User-Id'] = userId
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = timeoutMs > 0 ? new AbortController() : null
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        credentials: 'include',
        headers: resolvedHeaders,
        body: body instanceof FormData || body === undefined ? body : JSON.stringify(body),
        signal: controller?.signal,
      })

      const payload = await parseResponseBody(response)

      if (!response.ok) {
        const error = new Error(getErrorMessage(payload, fallbackMessage))
        error.retryable = isRetryableStatus(response.status)
        throw error
      }

      return unwrapSuccessPayload(payload)
    } catch (error) {
      const resolvedError = error?.name === 'AbortError' ? toTimeoutError() : error
      const isNetworkError = resolvedError instanceof TypeError
      const shouldRetry = resolvedError?.retryable || isNetworkError

      if (!shouldRetry || attempt >= retries) {
        throw resolvedError
      }

      await wait(retryDelayMs * (attempt + 1))
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }
}
