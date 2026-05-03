import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { gsap } from 'gsap'

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const errorRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(headerRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.5 }
      )
      .fromTo(panelRef.current,
        { opacity: 0, y: 36, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.65 },
        '-=0.2'
      )
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(errorRef.current,
        { x: -10 },
        { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' }
      )
    }
  }, [error])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/dashboard' : '/incidents')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const user = await loginWithGoogle()
      navigate(user.role === 'admin' ? '/dashboard' : '/incidents')
    } catch (err) {
      setError(err.message || 'Google login failed.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8', display: 'flex', flexDirection: 'column' }}>
      <div ref={headerRef} style={{ backgroundColor: '#050E1A', borderBottom: '1px solid #1A2E4A', padding: '8px 24px', display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#F0F4F8', textDecoration: 'none', letterSpacing: '0.08em' }}>← TRINETRA</Link>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>AUTHENTICATION TERMINAL</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div ref={panelRef} style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F', letterSpacing: '0.2em', marginBottom: 8 }}>— OPERATOR ACCESS</div>
            <h1 style={{ fontFamily: 'IBM Plex Sans', fontSize: 24, fontWeight: 300, color: '#F0F4F8', margin: 0 }}>Sign In</h1>
            <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', marginTop: 6 }}>Use your TriNetra credentials or Google OAuth</p>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div ref={errorRef} style={{ backgroundColor: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', padding: '10px 14px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#C0392B' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>EMAIL ADDRESS</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>PASSWORD</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
            </div>
            <button type="submit" disabled={loading}
              style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '11px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'background-color 0.2s, transform 0.15s' }}
              onMouseEnter={e => { if (!loading) gsap.to(e.currentTarget, { scale: 1.02, duration: 0.2, ease: 'power2.out' }) }}
              onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}>
              {loading ? 'AUTHENTICATING...' : 'SIGN IN →'}
            </button>
          </form>

          <div style={{ margin: '14px 0', borderTop: '1px solid #1A2E4A' }} />

          <button type="button" onClick={onGoogle} disabled={googleLoading}
            style={{ width: '100%', backgroundColor: '#0F1E38', color: '#F0F4F8', border: '1px solid #1A2E4A', padding: '11px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.08em', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.6 : 1, transition: 'background-color 0.2s' }}
            onMouseEnter={e => { if (!googleLoading) gsap.to(e.currentTarget, { scale: 1.015, duration: 0.2 }) }}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}>
            {googleLoading ? 'OPENING GOOGLE OAUTH...' : 'CONTINUE WITH GOOGLE'}
          </button>

          <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', marginTop: 20, textAlign: 'center' }}>
            New user? <Link to="/register" style={{ color: '#B8C5D3', textDecoration: 'none', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>CREATE ACCOUNT →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
