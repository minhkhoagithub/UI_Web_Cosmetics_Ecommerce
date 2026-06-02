const resolveApiOrigin = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  }

  const apiOrigin = import.meta.env.VITE_API_ORIGIN
  return apiOrigin ? apiOrigin.replace(/\/$/, '') : ''
}

const API_ORIGIN = resolveApiOrigin()

export const normalizeMediaUrl = (url) => {
  if (!url) {
    return ''
  }

  const mediaUrl = String(url).trim()
  if (!mediaUrl) {
    return ''
  }

  if (/^(https?:)?\/\//i.test(mediaUrl) || /^(data|blob):/i.test(mediaUrl)) {
    return mediaUrl
  }

  if (!API_ORIGIN) {
    return mediaUrl
  }

  return mediaUrl.startsWith('/') ? `${API_ORIGIN}${mediaUrl}` : `${API_ORIGIN}/${mediaUrl}`
}
