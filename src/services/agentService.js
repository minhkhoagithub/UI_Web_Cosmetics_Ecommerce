import { getStoredAuthSession } from './auth'

const normalizeBaseUrl = (value) => {
  if (!value) {
    return ''
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

const resolveAgentEndpoint = () => {
  const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/api')
      ? `${configuredBaseUrl}/agent/message`
      : `${configuredBaseUrl}/api/agent/message`
  }

  const apiOrigin = normalizeBaseUrl(import.meta.env.VITE_API_ORIGIN)
  if (apiOrigin) {
    return `${apiOrigin}/api/agent/message`
  }

  return '/api/agent/message'
}

const AGENT_ENDPOINT = resolveAgentEndpoint()

const parseResponseBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const unwrapAgentPayload = (payload) => {
  if (payload?.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data ?? payload
  }

  return payload
}

const getErrorMessage = (payload) => {
  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    return payload.details
      .map((detail) => detail?.message || detail?.field)
      .filter(Boolean)
      .join('; ')
  }

  return payload?.message || payload?.error || 'Xin lỗi, hiện tại mình chưa thể kết nối với AI Agent. Bạn vui lòng thử lại sau.'
}

export const sendAgentMessage = async ({ userId, message }) => {
  const session = getStoredAuthSession()
  const token = session?.accessToken

  const response = await fetch(AGENT_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      userId: userId || null,
      message,
    }),
  })

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  const data = unwrapAgentPayload(payload)
  if (!data?.reply) {
    throw new Error('AI Agent chưa trả về nội dung phản hồi.')
  }

  return data
}
