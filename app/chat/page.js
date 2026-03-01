'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'

export default function Chat() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  useEffect(() => {
    const stored = localStorage.getItem('profile')
    if (!stored) { router.push('/'); return }
    const p = JSON.parse(stored)
    setProfile(p)
    loadChatHistory(p.id)
    refreshProfile(p.id)
  }, [])

  async function refreshProfile(profileId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (data) {
        setProfile(data)
        localStorage.setItem('profile', JSON.stringify(data))
      }
    } catch (err) {
      console.warn('Could not refresh profile from Supabase:', err)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChatHistory(profileId) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (data && data.length > 0) {
      setMessages(data.map(m => ({
        role: m.role,
        content: m.content,
        image_url: m.image_url,
      })))
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target.result)
      // Extract base64 data (remove the data:image/...;base64, prefix)
      setImageBase64(event.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImagePreview(null)
    setImageBase64(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function sendMessage() {
    if ((!input.trim() && !imageBase64) || loading) return

    const userMessage = {
      role: 'user',
      content: input.trim(),
      image_url: imagePreview || null,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const currentImage = imageBase64
    removeImage()

    try {
      let onboardingContext = profile?.onboarding_context || null
      if (!onboardingContext) {
        const storedOnboarding = localStorage.getItem('onboardingContext')
        if (storedOnboarding) {
          try {
            onboardingContext = JSON.parse(storedOnboarding)
          } catch {
            onboardingContext = null
          }
        }
      }

      // Save user message
      await supabase.from('chat_messages').insert({
        profile_id: profile.id,
        role: 'user',
        content: userMessage.content,
        image_url: userMessage.image_url,
        trainer: profile.trainer,
      })

      // Send to Claude
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          image: currentImage,
          profile: profile,
          trainerId: profile.trainer,
          onboardingContext,
          history: messages.slice(-20).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.reply || 'Sorry, I had trouble responding. Try again!',
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message
      await supabase.from('chat_messages').insert({
        profile_id: profile.id,
        role: 'assistant',
        content: assistantMessage.content,
        trainer: profile.trainer,
      })
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Check your API key and try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      {/* Chat Header */}
      <div style={{ padding: '18px 20px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
              <span style={{ color: '#6EE7B7' }}>Fit</span>
              <span style={{ color: '#fff' }}>Coach</span>
              <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
            </h1>
            <p style={{ fontSize: 12, fontWeight: 500, marginTop: 3, color: trainer.color }}>
              {trainer.emoji} Chatting with {trainer.name}
            </p>
          </div>
          <button onClick={() => {
            if (confirm('Clear chat history?')) {
              supabase.from('chat_messages').delete().eq('profile_id', profile.id).then(() => {
                setMessages([])
              })
            }
          }} style={{
            padding: '6px 12px', borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.1)',
            background: 'transparent', color: '#2D5B3F',
            fontSize: 11, fontWeight: 600,
          }}>Clear</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#2D5B3F' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{trainer.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6EE7B7', marginBottom: 6 }}>
              {trainer.name}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              {trainer.style}<br />
              Send a message or upload a photo to get started!
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
            alignItems: 'flex-end',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(16,185,129,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 8, flexShrink: 0,
              }}>{trainer.emoji}</div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: msg.image_url ? 5 : '12px 16px',
              borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #F97316, #EC4899)'
                : 'rgba(14,20,14,0.55)',
              backdropFilter: msg.role === 'assistant' ? 'blur(24px)' : 'none',
              color: msg.role === 'user' ? '#fff' : '#D1FAE5',
              fontSize: 13.5, lineHeight: 1.55,
              fontWeight: msg.role === 'user' ? 500 : 400,
              border: msg.role === 'user' ? 'none' : '1px solid rgba(110,231,183,0.07)',
              boxShadow: msg.role === 'user' ? '0 4px 15px rgba(249,115,22,0.2)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.image_url && (
                <img src={msg.image_url} alt="Upload" style={{
                  width: '100%', maxHeight: 200, objectFit: 'cover',
                  borderRadius: 16, marginBottom: msg.content ? 8 : 0,
                }} />
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(16,185,129,0.08))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, marginRight: 8,
            }}>{trainer.emoji}</div>
            <div className="glass-sm" style={{
              padding: '12px 20px', color: '#2D5B3F', fontSize: 13,
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{
            position: 'relative', display: 'inline-block',
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(249,115,22,0.3)',
          }}>
            <img src={imagePreview} alt="Preview" style={{ height: 80, borderRadius: 12 }} />
            <button onClick={removeImage} style={{
              position: 'absolute', top: 4, right: 4,
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', border: 'none',
              color: '#fff', fontSize: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div style={{ padding: '12px 20px 16px' }}>
        <div className="glass" style={{
          display: 'flex', gap: 8,
          borderRadius: 18, padding: '5px 5px 5px 14px',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(236,72,153,0.1))',
            border: 'none', borderRadius: 10,
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>📷</button>
          <input
            type="text"
            placeholder="Ask your trainer anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            style={{
              flex: 1, background: 'none', border: 'none',
              color: '#D1FAE5', fontSize: 14, fontWeight: 400,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !imageBase64) || loading}
            style={{
              background: (input.trim() || imageBase64) && !loading
                ? 'linear-gradient(135deg, #10B981, #6EE7B7)'
                : 'rgba(110,231,183,0.08)',
              border: 'none', borderRadius: 13,
              width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#070B07', fontWeight: 800, fontSize: 17,
              boxShadow: (input.trim() || imageBase64) ? '0 2px 10px rgba(16,185,129,0.3)' : 'none',
            }}
          >↑</button>
        </div>
      </div>
    </div>
  )
}