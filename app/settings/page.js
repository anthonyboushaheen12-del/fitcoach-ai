'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'
import WeightModal from '../components/WeightModal'
import TrainerModal from '../components/TrainerModal'
import ProgressChart from '../components/ProgressChart'

export default function Settings() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [weightLogs, setWeightLogs] = useState([])
  const [saving, setSaved] = useState(false)
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('profile')
    if (!stored) { router.push('/'); return }
    const p = JSON.parse(stored)
    setProfile(p)
    loadWeightLogs(p.id, p.weight_kg)
  }, [])

  async function loadWeightLogs(profileId, currentWeight) {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
      .limit(30)
    const built = []
    if (!data || data.length === 0) {
      built.push({ date: new Date().toISOString().split('T')[0], weight_kg: currentWeight })
    } else {
      data.forEach((l) => built.push({ date: (l.logged_at || l.created_at || '').split('T')[0], weight_kg: l.weight_kg }))
    }
    setWeightLogs(built)
  }

  async function saveProfile() {
    setSaved(true)
    try {
      await supabase
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
      localStorage.setItem('profile', JSON.stringify(profile))
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch (err) {
      console.error('Error saving:', err)
      alert('Failed to save.')
    } finally {
      setSaved(false)
    }
  }

  async function handleLogWeight(weightKg) {
    if (!profile) return
    await supabase.from('weight_logs').insert({ profile_id: profile.id, weight_kg: weightKg })
    const updated = { ...profile, weight_kg: weightKg }
    setProfile(updated)
    await supabase.from('profiles').update({ weight_kg: weightKg }).eq('id', profile.id)
    localStorage.setItem('profile', JSON.stringify(updated))
    setWeightLogs((prev) => {
      const today = new Date().toISOString().split('T')[0]
      const idx = prev.findIndex((d) => d.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], weight_kg: weightKg }
        return next
      }
      return [...prev, { date: today, weight_kg: weightKg }].sort((a, b) => a.date.localeCompare(b.date))
    })
    setWeightModalOpen(false)
  }

  async function handleSelectTrainer(t) {
    if (!profile) return
    await supabase.from('profiles').update({ trainer: t.id }).eq('id', profile.id)
    setProfile((prev) => ({ ...prev, trainer: t.id }))
    localStorage.setItem('profile', JSON.stringify({ ...profile, trainer: t.id }))
    setTrainerModalOpen(false)
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

  const update = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }))
  const trainer = getTrainer(profile.trainer)
  const startWeight = weightLogs[0]?.weight_kg ?? profile.weight_kg
  const weightDiff = profile.weight_kg - startWeight

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(14,20,14,0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(110,231,183,0.07)',
    borderRadius: 12,
    color: '#E2FBE8',
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
  }

  return (
    <div style={{ padding: '18px 20px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Profile & preferences</p>
      </div>

      {/* Profile Section */}
      <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Profile</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6EE7B7, #F97316)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: '#070B07',
          }}>
            {(profile.name || 'U')[0].toUpperCase()}
          </div>
        </div>
        {[
          { label: 'Name', field: 'name', type: 'text' },
          { label: 'Age', field: 'age', type: 'number' },
          { label: 'Height (cm)', field: 'height_cm', type: 'number' },
        ].map((f, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>{f.label}</label>
            <input type={f.type} value={profile[f.field] || ''} onChange={(e) => update(f.field, e.target.value)} style={inputStyle} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>Activity Level</label>
          <select value={profile.activity} onChange={(e) => update('activity', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very Active</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4, display: 'block' }}>Goal</label>
          <select value={profile.goal} onChange={(e) => update('goal', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="lose_fat">Lose Fat</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="recomp">Body Recomp</option>
            <option value="maintain">Maintain</option>
          </select>
        </div>
        <button onClick={saveProfile} disabled={saved} style={{
          width: '100%', padding: 16, borderRadius: 14, border: 'none',
          background: savedMsg ? 'rgba(110,231,183,0.15)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
          color: savedMsg ? '#6EE7B7' : '#070B07', fontSize: 15, fontWeight: 700,
          boxShadow: savedMsg ? 'none' : '0 4px 20px rgba(16,185,129,0.25)',
        }}>
          {saved ? 'Saving...' : savedMsg ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Body Stats Section */}
      <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Body Stats</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Current Weight</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{profile.weight_kg} kg</div>
          </div>
          <button onClick={() => setWeightModalOpen(true)} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(110,231,183,0.08)', color: '#6EE7B7', fontSize: 12, fontWeight: 600,
          }}>
            Log
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Target Weight</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6EE7B7' }}>{profile.target_weight} kg</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Change since start</div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: weightDiff > 0 ? '#6EE7B7' : weightDiff < 0 ? '#FB7185' : '#93C5FD',
          }}>
            {weightDiff >= 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
          </div>
        </div>
        <div style={{ height: 60 }}>
          <ProgressChart data={weightLogs} targetWeight={profile.target_weight} height={60} />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Preferences</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Current Trainer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24 }}>{trainer.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{trainer.name}</span>
            </div>
          </div>
          <button onClick={() => setTrainerModalOpen(true)} style={{
            padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(110,231,183,0.08)', color: '#6EE7B7', fontSize: 13, fontWeight: 600,
          }}>
            Switch Trainer
          </button>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 4 }}>Units</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['metric', 'imperial'].map((u) => (
              <button
                key={u}
                onClick={() => update('units', u)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  border: profile.units === u ? '2px solid rgba(110,231,183,0.4)' : '1px solid rgba(110,231,183,0.1)',
                  background: profile.units === u ? 'rgba(110,231,183,0.1)' : 'transparent',
                  color: profile.units === u ? '#6EE7B7' : '#2D5B3F',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {u === 'metric' ? 'Metric' : 'Imperial'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Data</div>
        <button style={{
          width: '100%', padding: 14, borderRadius: 12, marginBottom: 10,
          border: '1px solid rgba(110,231,183,0.15)', background: 'transparent', color: '#6EE7B7',
          fontSize: 14, fontWeight: 600, textAlign: 'left',
        }}>
          Export My Data
        </button>
        <button onClick={() => {
          if (confirm('Clear all chat history?')) {
            supabase.from('chat_messages').delete().eq('profile_id', profile.id).then(() => alert('Chat cleared.'))
          }
        }} style={{
          width: '100%', padding: 14, borderRadius: 12, marginBottom: 10,
          border: '1px solid rgba(110,231,183,0.15)', background: 'transparent', color: '#6EE7B7',
          fontSize: 14, fontWeight: 600, textAlign: 'left',
        }}>
          Clear Chat History
        </button>
        <button onClick={resetAccount} style={{
          width: '100%', padding: 14, borderRadius: 12,
          border: '1px solid rgba(251,113,133,0.25)', background: 'transparent', color: '#FB7185',
          fontSize: 14, fontWeight: 600, textAlign: 'left',
        }}>
          Reset Account
        </button>
      </div>

      {/* App Info */}
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#1F4030', fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>FitCoach AI v1.0</div>
        <div style={{ marginTop: 4 }}>Powered by Claude</div>
      </div>

      <WeightModal open={weightModalOpen} onClose={() => setWeightModalOpen(false)} profile={profile} onSave={handleLogWeight} />
      <TrainerModal open={trainerModalOpen} onClose={() => setTrainerModalOpen(false)} profile={profile} currentTrainer={trainer} onSelect={handleSelectTrainer} />
    </div>
  )
}
