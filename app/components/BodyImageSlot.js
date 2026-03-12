'use client'

import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function BodyImageSlot({ label, hint, imageUrl, userId, profileId, slot, onUpload }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !userId || !profileId || !supabase) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, etc.)')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${slot}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('body-images')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('body-images')
        .getPublicUrl(path)

      const column = slot === 'current' ? 'body_image_url' : 'goal_body_image_url'
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [column]: urlData.publicUrl })
        .eq('id', profileId)

      if (updateError) throw updateError
      onUpload?.()
    } catch (err) {
      console.error('Body image upload error:', err)
      alert(err?.message || 'Upload failed. Make sure the body-images bucket exists.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      style={{
        aspectRatio: '1',
        background: 'rgba(14,20,14,0.55)',
        borderRadius: 12,
        border: '1px dashed rgba(110,231,183,0.2)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
        disabled={uploading}
      />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            textAlign: 'center',
            color: '#2D5B3F',
            fontSize: 12,
          }}
        >
          {uploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <span style={{ fontSize: 24, marginBottom: 4 }}>📷</span>
              <span style={{ fontWeight: 600 }}>{label}</span>
              {hint && <span style={{ marginTop: 2, fontSize: 11 }}>{hint}</span>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
