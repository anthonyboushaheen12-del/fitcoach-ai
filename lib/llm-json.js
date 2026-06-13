/**
 * Extract a JSON object from LLM text (markdown fences, leading prose, etc.).
 * @param {string} text
 * @returns {object | null}
 */
export function extractJsonObject(text) {
  if (typeof text !== 'string' || !text.trim()) return null
  let s = text.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // fall through to brace extraction
  }
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1))
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
        } catch {
          return null
        }
        break
      }
    }
  }
  return null
}
