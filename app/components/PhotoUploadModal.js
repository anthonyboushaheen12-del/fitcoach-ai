'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { compressImageForUpload } from '../../lib/image-compress'

async function jsonHeadersWithAuth() {
  const headers = { 'Content-Type': 'application/json' }
  if (!supabase) return headers

  let {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    session = refreshed?.session ?? null
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

export default function PhotoUploadModal({ isOpen, onClose, profile, onSaved, latestSessionId = null }) {
  const [photoType, setPhotoType] = useState('front')
  const [notes, setNotes] = useState('')
  const [weight, setWeight] = useState(profile?.weight_kg ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [batchHint, setBatchHint] = useState('')
  const [addToLatestVisit, setAddToLatestVisit] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !profile) return
    setJustSaved(false)
    setError('')
    setBatchHint('')
    setWeight(profile.weight_kg ?? '')
    setAddToLatestVisit(false)
  }, [isOpen, profile?.id, profile?.weight_kg])

  if (!isOpen || !profile?.id) return null

  async function handleFile(e) {
    const files = Array.from(e.target.files || []).filter(Boolean)
    if (!files.length) return
    e.target.value = ''
    setError('')
    setBatchHint('')
    setBusy(true)
    const wVal = weight !== '' ? Number(weight) : profile.weight_kg
    const notesVal = notes?.trim() || null
    let saved = 0
    let lastAnalysis = null
    const failures = []

    const useLatest = Boolean(addToLatestVisit && latestSessionId)
    let batchSessionId = useLatest ? latestSessionId : null

    const authHeaders = await jsonHeadersWithAuth()
    if (!authHeaders.Authorization) {
      setError('Sign-in required to save photos. Refresh the page or open Settings and sign in again.')
      setBusy(false)
      return
    }

    try {
      for (let i = 0; i < files.length; i++) {
        if (files.length > 1) {
          setBatchHint(`Photo ${i + 1} of ${files.length}…`)
        }
        try {
          const { base64 } = await compressImageForUpload(files[i])
          const ar = await fetch('/api/analyze-body', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', profile, photoType }),
          })
          const analysisPayload = await ar.json().catch(() => ({}))
          const analysis = analysisPayload.analysis || analysisPayload

          const body = {
            profileId: profile.id,
            imageBase64: base64,
            analysis,
            weightAtTime: wVal,
            notes: notesVal,
            photoType,
          }
          if (batchSessionId) body.sessionId = batchSessionId

          const pr = await fetch('/api/progress-photo', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          })
          const payload = await pr.json().catch(() => ({}))
          if (!pr.ok) {
            throw new Error(payload.error || 'Save failed')
          }
          if (payload.sessionId && !batchSessionId) {
            batchSessionId = payload.sessionId
          }
          lastAnalysis = analysis
          saved++
        } catch (oneErr) {
          failures.push(`#${i + 1}: ${oneErr?.message || 'failed'}`)
        }
      }

      if (saved > 0) {
        setNotes('')
        onSaved?.({ analysis: lastAnalysis })
      }
      if (failures.length) {
        const suffix =
          saved > 0 ? ` Saved ${saved}, failed: ${failures.join(' · ')}` : ` ${failures.join(' · ')}`
        setError(saved > 0 ? `${failures.length} photo(s) could not save.${suffix}` : failures.join(' · '))
        if (saved > 0) setJustSaved(true)
      } else {
        setJustSaved(true)
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setBatchHint('')
    }
  }

  function handleAddAnother() {
    setJustSaved(false)
    setError('')
  }

  function handleDone() {
    setJustSaved(false)
    onClose?.()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="glass"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 22,
          borderRadius: 16,
          border: '1px solid rgba(110,231,183,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Progress photo</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#2D5B3F', fontSize: 20 }}>
            ×
          </button>
        </div>

        {latestSessionId ? (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
              cursor: 'pointer',
              fontSize: 12,
              color: '#A7C4B8',
            }}
          >
            <input
              type="checkbox"
              checked={addToLatestVisit}
              onChange={(e) => setAddToLatestVisit(e.target.checked)}
            />
            <span>Add to latest check-in (same visit as your most recent date)</span>
          </label>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['front', 'side', 'back'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPhotoType(t)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 12,
                border: photoType === t ? '2px solid rgba(110,231,183,0.4)' : '1px solid rgba(110,231,183,0.12)',
                background: photoType === t ? 'rgba(110,231,183,0.12)' : 'transparent',
                color: photoType === t ? '#6EE7B7' : '#2D5B3F',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Weight at photo (kg)</label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{
            width: '100%',
            marginTop: 4,
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.12)',
            background: 'rgba(14,20,14,0.55)',
            color: '#E2FBE8',
            fontSize: 14,
          }}
        />
        <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            marginTop: 4,
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.12)',
            background: 'rgba(14,20,14,0.55)',
            color: '#E2FBE8',
            fontSize: 14,
            resize: 'vertical',
          }}
        />
        <div style={{ fontSize: 12, color: '#5BA37A', marginBottom: 10, lineHeight: 1.4 }}>
          Choose the angle that matches the shot — <strong style={{ color: '#6EE7B7' }}>Back</strong> for rear poses
          so lats and upper back are analyzed. The same type applies to every photo in this batch.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        {error && <div style={{ color: '#FB7185', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {justSaved ? (
          <div>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(110,231,183,0.2)',
                color: '#6EE7B7',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              Saved. Photos are grouped by check-in; start a new visit anytime.
            </div>
            <button
              type="button"
              onClick={handleAddAnother}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Add another photo
            </button>
            <button
              type="button"
              onClick={handleDone}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.2)',
                background: 'transparent',
                color: '#A7C4B8',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 14,
              border: 'none',
              background: busy ? 'rgba(110,231,183,0.2)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {busy ? batchHint || 'Analyzing & saving…' : 'Choose photo(s) — analyze & save'}
          </button>
        )}
      </div>
    </div>
  )
}
