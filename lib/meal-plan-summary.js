/**
 * One-line summary for coach / plan-qa so daily targets are never truncated out of JSON excerpts.
 * @param {Record<string, unknown> | null | undefined} content — meal plan `content` from DB
 * @returns {string} empty if no usable data
 */
export function mealPlanAuthoritativeSummary(content) {
  if (!content || typeof content !== 'object') return ''

  const dc = content.dailyCalories
  let calPart = ''
  if (typeof dc === 'number' && Number.isFinite(dc)) {
    calPart = `${dc.toLocaleString('en-US')} cal`
  } else if (typeof dc === 'string' && dc.trim()) {
    calPart = dc.trim()
  }

  const fmt = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return `${v}g`
    if (typeof v === 'string' && v.trim()) return v.trim()
    return '—'
  }

  const p = fmt(content.protein)
  const c = fmt(content.carbs)
  const f = fmt(content.fats)

  if (!calPart && p === '—' && c === '—' && f === '—') return ''

  const calDisplay = calPart || '—'
  return `Authoritative daily targets from saved meal plan: ${calDisplay}; protein ${p}; carbs ${c}; fats ${f}. Individual meal calories sum to this daily target.`
}
