/** Default Sonnet model — claude-sonnet-4-20250514 retires June 15, 2026. */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'

export function getClaudeModel() {
  const fromEnv = process.env.ANTHROPIC_MODEL?.trim()
  return fromEnv || DEFAULT_CLAUDE_MODEL
}

/** First text block from a Messages API response. */
export function getAssistantText(response) {
  const blocks = response?.content
  if (!Array.isArray(blocks)) return ''
  const textBlock = blocks.find((b) => b?.type === 'text') || blocks[0]
  return textBlock?.type === 'text' && typeof textBlock.text === 'string' ? textBlock.text.trim() : ''
}

/** Pull human-readable text from Anthropic SDK / HTTP errors. */
function anthropicErrorText(err) {
  if (!err) return ''
  const nested = err?.error?.message
  if (typeof nested === 'string' && nested.trim()) return nested.trim()
  const msg = typeof err.message === 'string' ? err.message : String(err)
  const jsonStart = msg.indexOf('{')
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(msg.slice(jsonStart))
      const inner = parsed?.error?.message
      if (typeof inner === 'string' && inner.trim()) return inner.trim()
    } catch {
      // ignore
    }
  }
  return msg
}

/** User-facing message for Anthropic SDK errors. */
export function formatAnthropicError(err) {
  if (!err) return 'AI request failed'
  const text = anthropicErrorText(err)
  const status = err.status ?? err.statusCode

  if (/credit balance|purchase credits|insufficient.*credit|billing/i.test(text)) {
    return 'AI credits exhausted — add credits at console.anthropic.com (Plans & Billing), then try again.'
  }
  if (status === 401 || text.includes('authentication_error') || text.includes('invalid x-api-key')) {
    return 'AI authentication failed — ANTHROPIC_API_KEY may be missing or invalid on the server.'
  }
  if (status === 404 || text.includes('not_found_error') || /model.*not/i.test(text)) {
    return `AI model unavailable (${getClaudeModel()}). Set ANTHROPIC_MODEL on the server.`
  }
  if (status === 529 || text.includes('overloaded')) {
    return 'AI service is busy — try again in a moment.'
  }
  if (status === 429 || text.includes('rate_limit')) {
    return 'AI rate limit reached — try again shortly.'
  }
  return text.length > 240 ? `${text.slice(0, 240)}…` : text
}
