'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('profile')
    if (!stored) { router.push('/'); return }
    setProfile(JSON.parse(stored))
  }, [])

  async function saveProfile() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          age: parseInt(profile.age),
          weight_kg: parseFloat(profile.weight_kg),
          height_cm: parseFloat(profile.height_cm),
          activity: profile.activity,
          goal: profile.goal,
          target_weight: parseFloat(profile.target_weight),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error
      localStorage.setItem('profile', JSON.stringify(profile))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving:', err)
      alert('Failed to save. Check console.')
    } finally {
      setSaving(false)
    }
  }

  async function logWeight() {
    const weight = prompt('Enter your current weight (kg):')
    if (!weight) return
    
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum)) return

    await supabase.from('weight_logs').insert({
      profile_id: profile.id,
      weight_kg: weightNum,
    })

    // Update profile weight
    const updated = { ...profile, weight_kg: weightNum }
    setProfile(updated)
    await supabase.from('profiles').update({ weight_kg: weightNum }).eq('id', profile.id)
    localStorage.setItem('profile', JSON.stringify(updated))
    alert(`Weight logged: ${weightNum}kg`)
  }

  async function resetAccount() {
    if (!confirm('This will delete ALL your data (profile, plans, chat history). Are you sure?')) return
    if (!confirm('Really sure? This cannot be undone.')) return

    await supabase.from('chat_messages').delete().eq('profile_id', profile.id)
    await supabase.from('plans').delete().eq('profile_id', profile.id)
    await supabase.from('weight_logs').delete().eq('profile_id', profile.id)
    await supabase.from('photos').delete().eq('profile_id', profile.id)
    await supabase.from('profiles').delete().eq('id', profile.id)

    localStorage.clear()
    router.push('/')
  }

  if (!profile) return null

  const update = (field, value) => setProfile(prev => ({ ...prev, [field]: value }))

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(14,20,14,0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(110,231,183,0.07)',
    borderRadius: 12, color: '#E2FBE8',
    fontSize: 14, fontFamily: "'Outfit', sans-serif",
  }

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Profile & preferences</p>
      </div>

      <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Your Stats</div>

        {[
          { label: 'Name', field: 'name', type: 'text' },
          { label: 'Age', field: 'age', type: 'number' },
          { label: 'Weight (kg)', field: 'weight_kg', type: 'number' },
          { label: 'Height (cm)', field: 'height_cm', type: 'number' },
          { label: 'Target Weight (kg)', field: 'target_weight', type: 'number' },
        ].map((f, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              {f.label}
            </label>
            <input
              type={f.type}
              value={profile[f.field] || ''}
              onChange={(e) => update(f.field, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}

        {/* Activity Level */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>
            Activity Level
          </label>
          <select
            value={profile.activity}
            onChange={(e) => update('activity', e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very Active</option>
          </select>
        </div>

        {/* Goal */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>
            Goal
          </label>
          <select
            value={profile.goal}
            onChange={(e) => update('goal', e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="lose_fat">Lose Fat</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="recomp">Body Recomp</option>
            <option value="maintain">Maintain</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button onClick={saveProfile} disabled={saving} style={{
        width: '100%', padding: 16, borderRadius: 14, border: 'none',
        background: saved ? 'rgba(110,231,183,0.15)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
        color: saved ? '#6EE7B7' : '#070B07',
        fontSize: 15, fontWeight: 700, marginBottom: 12,
        boxShadow: saved ? 'none' : '0 4px 20px rgba(16,185,129,0.25)',
      }}>
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
      </button>

      {/* Log Weight */}
      <button onClick={logWeight} style={{
        width: '100%', padding: 14, borderRadius: 14,
        border: '1px solid rgba(110,231,183,0.15)',
        background: 'transparent', color: '#6EE7B7',
        fontSize: 14, fontWeight: 600, marginBottom: 12,
      }}>
        ⚖️ Log Today&apos;s Weight
      </button>

      {/* Reset */}
      <button onClick={resetAccount} style={{
        width: '100%', padding: 14, borderRadius: 14,
        border: '1px solid rgba(251,113,133,0.2)',
        background: 'transparent', color: '#FB7185',
        fontSize: 13, fontWeight: 600, marginBottom: 24,
      }}>
        Reset Account
      </button>
    </div>
  )
}
