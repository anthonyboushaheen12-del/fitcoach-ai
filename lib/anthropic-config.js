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

/** User-facing message for Anthropic SDK errors. */
export function formatAnthropicError(err) {
  if (!err) return 'AI request failed'
  const msg = typeof err.message === 'string' ? err.message : String(err)
  const status = err.status ?? err.statusCode

  if (status === 401 || msg.includes('authentication_error') || msg.includes('invalid x-api-key')) {
    return 'AI authentication failed — ANTHROPIC_API_KEY may be missing or invalid on the server.'
  }
  if (status === 404 || msg.includes('not_found_error') || /model.*not/i.test(msg)) {
    return `AI model unavailable (${getClaudeModel()}). Set ANTHROPIC_MODEL on the server.`
  }
  if (status === 529 || msg.includes('overloaded')) {
    return 'AI service is busy — try again in a moment.'
  }
  if (status === 429 || msg.includes('rate_limit')) {
    return 'AI rate limit reached — try again shortly.'
  }
  return msg.length > 240 ? `${msg.slice(0, 240)}…` : msg
}
