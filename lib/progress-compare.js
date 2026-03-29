/** Lower bound of first numeric range in strings like "18-22%" or "~20%". */
export function parseBodyFatLower(str) {
  if (!str || typeof str !== 'string') return null
  const range = str.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return parseInt(range[1], 10)
  const one = str.match(/(\d+)/)
  return one ? parseInt(one[1], 10) : null
}

const LEVEL = { underdeveloped: 1, average: 2, 'well-developed': 3 }

function normLevel(v) {
  if (!v || typeof v !== 'string') return null
  const k = v.toLowerCase().trim()
  if (k.includes('not visible')) return null
  if (k.includes('under')) return 1
  if (k.includes('average')) return 2
  if (k.includes('well')) return 3
  return null
}

function goalImpliesLoss(goalText) {
  if (!goalText) return true
  const g = String(goalText).toLowerCase()
  if (g.includes('bulk') || g.includes('gain') || g.includes('mass') || g.includes('muscle up')) return false
  if (g.includes('cut') || g.includes('lean') || g.includes('fat loss') || g.includes('lose')) return true
  return true
}

/**
 * @param {object} beforeRow progress_photos row
 * @param {object} afterRow progress_photos row
 * @param {{ goal?: string }} profileSlice
 * @returns {{ label: string, improved: boolean | null }[]}
 */
export function compareProgressPhotoRows(beforeRow, afterRow, profileSlice = {}) {
  const changes = []
  const wantLoss = goalImpliesLoss(profileSlice?.goal)

  const wB = beforeRow?.weight_at_time != null ? Number(beforeRow.weight_at_time) : null
  const wA = afterRow?.weight_at_time != null ? Number(afterRow.weight_at_time) : null
  if (wB != null && wA != null && !Number.isNaN(wB) && !Number.isNaN(wA)) {
    const diff = wA - wB
    let improved = null
    if (Math.abs(diff) < 0.05) improved = null
    else if (wantLoss) improved = diff < 0
    else improved = diff > 0
    changes.push({
      label: `Weight: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`,
      improved,
    })
  }

  const bfB = parseBodyFatLower(beforeRow?.body_fat_estimate || beforeRow?.analysis?.bodyFatEstimate)
  const bfA = parseBodyFatLower(afterRow?.body_fat_estimate || afterRow?.analysis?.bodyFatEstimate)
  if (bfB != null && bfA != null) {
    const delta = bfA - bfB
    let improved = null
    if (delta === 0) improved = null
    else if (wantLoss) improved = delta < 0
    else improved = delta > 0
    changes.push({
      label: `Body fat estimate: ~${beforeRow.body_fat_estimate || bfB}% → ~${afterRow.body_fat_estimate || bfA}%`,
      improved,
    })
  } else if (beforeRow?.body_fat_estimate || afterRow?.body_fat_estimate) {
    changes.push({
      label: `Body fat: ${beforeRow?.body_fat_estimate || '—'} → ${afterRow?.body_fat_estimate || '—'}`,
      improved: null,
    })
  }

  const muscles = ['shoulders', 'chest', 'arms', 'core', 'back', 'legs']
  const bA = beforeRow?.analysis?.muscleAssessment || {}
  const aA = afterRow?.analysis?.muscleAssessment || {}
  for (const m of muscles) {
    const lb = normLevel(bA[m])
    const la = normLevel(aA[m])
    if (lb != null && la != null && la > lb) {
      changes.push({ label: `${m}: improved (${bA[m]} → ${aA[m]})`, improved: true })
    } else if (lb != null && la != null && la < lb) {
      changes.push({ label: `${m}: ${bA[m]} → ${aA[m]}`, improved: false })
    } else if (lb != null && la != null && lb === la && bA[m] === aA[m]) {
      /* skip */
    }
  }

  return changes
}
