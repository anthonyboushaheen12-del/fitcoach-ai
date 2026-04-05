/** @typedef {{ id?: string, created_at?: string, photo_type?: string, analysis?: object }} ProgressPhotoLike */

const MUSCLE_KEYS = ['shoulders', 'chest', 'arms', 'core', 'back', 'legs']

function isNotVisible(val) {
  if (val == null || val === '') return true
  const s = String(val).toLowerCase().replace(/_/g, ' ').trim()
  return s === 'not visible' || s === 'n/a' || s === 'na'
}

function photoTypeOf(photo) {
  const t = (photo?.photo_type || photo?.photoType || 'front').toLowerCase()
  if (t === 'back' || t === 'side' || t === 'front') return t
  return 'front'
}

/**
 * Chest and front-ab visibility: skip pure back shots so we don’t invent front-only cues.
 * Back assessment: prefer angled uploads; other keys accept any photo where the model saw muscle.
 */
function skipPhotoForKey(key, photo) {
  const pt = photoTypeOf(photo)
  if ((key === 'chest' || key === 'core') && pt === 'back') return true
  return false
}

function shortDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Merge `muscleAssessment` / `muscleNotes` from multiple progress photos so the dashboard reflects
 * all recent angles — not only the chronologically latest image (often front-only).
 *
 * @param {ProgressPhotoLike[]|null|undefined} photos
 * @returns {{ analysis: object, mergeHint: string | null } | null}
 */
export function mergeCheckInAnalysisFromPhotos(photos) {
  if (!photos?.length) return null
  const sorted = [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const latest = sorted[sorted.length - 1]
  const latestAnalysis = latest?.analysis
  if (!latestAnalysis || typeof latestAnalysis !== 'object') return null

  const mergedMa = { ...(latestAnalysis.muscleAssessment || {}) }
  const mergedNotes = { ...(latestAnalysis.muscleNotes || {}) }
  const byNewest = [...sorted].reverse()
  /** @type {{ key: string, when: string, type: string }[]} */
  const filledFrom = []

  for (const key of MUSCLE_KEYS) {
    if (!isNotVisible(mergedMa[key])) continue

    /** Try back/side photos first for `back`, then any remaining. */
    const passes =
      key === 'back'
        ? [
            (p) => photoTypeOf(p) === 'back' || photoTypeOf(p) === 'side',
            () => true,
          ]
        : [() => true]

    for (const pass of passes) {
      let filled = false
      for (const photo of byNewest) {
        if (photo === latest) continue
        if (!pass(photo)) continue
        if (skipPhotoForKey(key, photo)) continue
        const ma = photo?.analysis?.muscleAssessment
        if (!ma || typeof ma !== 'object') continue
        const val = ma[key]
        if (isNotVisible(val)) continue
        mergedMa[key] = val
        const noteFromOther = photo?.analysis?.muscleNotes?.[key]
        if (noteFromOther && typeof noteFromOther === 'string' && !mergedNotes[key]) {
          mergedNotes[key] = noteFromOther
        }
        filledFrom.push({
          key,
          when: shortDate(photo.created_at),
          type: photoTypeOf(photo),
        })
        filled = true
        break
      }
      if (filled) break
    }
  }

  const analysis = {
    ...latestAnalysis,
    muscleAssessment: mergedMa,
  }
  if (Object.keys(mergedNotes).length > 0) {
    analysis.muscleNotes = mergedNotes
  }

  let mergeHint = null
  if (filledFrom.length > 0) {
    const parts = filledFrom.map((f) => `${f.key} (${f.when}${f.type !== 'front' ? ` · ${f.type}` : ''})`)
    mergeHint = `Some areas use your clearest recent shot of that muscle group: ${parts.join('; ')}.`
  }

  return { analysis, mergeHint }
}
