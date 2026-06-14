/** Combine API error + details for user-facing messages (details first when present). */
export function formatApiErrorBody(data, fallback) {
  const details = typeof data?.details === 'string' ? data.details.trim() : ''
  const error = typeof data?.error === 'string' ? data.error.trim() : ''
  if (details && error && details !== error) return `${error}: ${details}`
  if (details) return details
  if (error) return error
  return fallback
}
