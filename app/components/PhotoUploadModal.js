'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { compressImageForUpload } from '../../lib/image-compress'

async function jsonHeadersWithAuth() {
  const headers = { 'Content-Type': 'application/json' }
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

export default function PhotoUploadModal({ isOpen, onClose, profile, onSaved }) {
  const [photoType, setPhotoType] = useState('front')
  const [notes, setNotes] = useState('')
  const [weight, setWeight] = useState(profile?.weight_kg ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !profile) return
    setJustSaved(false)
    setError('')
    setWeight(profile.weight_kg ?? '')
  }, [isOpen, profile?.id, profile?.weight_kg])

  if (!isOpen || !profile?.id) return null

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    setBusy(true)
    try {
      const { base64 } = await compressImageForUpload(file)
      const ar = await fetch('/api/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', profile }),
      })
      const analysisPayload = await ar.json().catch(() => ({}))
      const analysis = analysisPayload.analysis || analysisPayload

      const pr = await fetch('/api/progress-photo', {
        method: 'POST',
        headers: await jsonHeadersWithAuth(),
        body: JSON.stringify({
          profileId: profile.id,
          imageBase64: base64,
          analysis,
          weightAtTime: weight !== '' ? Number(weight) : profile.weight_kg,
          notes: notes?.trim() || null,
          photoType,
        }),
      })
      if (!pr.ok) {
        const err = await pr.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      setNotes('')
      onSaved?.()
      setJustSaved(true)
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
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
            ✕
          </button>
        </div>
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
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
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
              Saved. You can add as many progress photos as you like.
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
            {busy ? 'Analyzing & saving…' : 'Choose photo — analyze & save'}
          </button>
        )}
      </div>
    </div>
  )
}
