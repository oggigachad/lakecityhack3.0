import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { gsap } from 'gsap'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const errorRef = useRef(null)
  const formFieldsRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(headerRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.5 }
      )
      .fromTo(panelRef.current,
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7 },
        '-=0.2'
      )
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(errorRef.current,
        { x: -12 },
        { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.4)' }
      )
    }
  }, [error])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await register(form.name, form.email, form.password, form.role)
      navigate(user.role === 'admin' ? '/dashboard' : '/incidents')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const ROLES = [
    { id: 'citizen', label: 'CITIZEN', desc: 'Report incidents, view alerts & safe routes' },
    { id: 'responder', label: 'RESPONDER', desc: 'Manage & respond to assigned incidents' },
  ]

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8', display: 'flex', flexDirection: 'column' }}>
      <div ref={headerRef} style={{ backgroundColor: '#050E1A', borderBottom: '1px solid #1A2E4A', padding: '8px 24px', display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#F0F4F8', textDecoration: 'none', letterSpacing: '0.08em' }}>← TRINETRA</Link>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>NEW OPERATOR REGISTRATION</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div ref={panelRef} style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F', letterSpacing: '0.2em', marginBottom: 8 }}>— CREATE ACCOUNT</div>
            <h1 style={{ fontFamily: 'IBM Plex Sans', fontSize: 24, fontWeight: 300, color: '#F0F4F8', margin: 0 }}>Register</h1>
            <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', marginTop: 6 }}>Select your role and create your TriNetra credentials</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div ref={errorRef} style={{ backgroundColor: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', padding: '10px 14px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#C0392B' }}>{error}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>FULL NAME</label>
              <input id="reg-name" type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Operator name" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>EMAIL ADDRESS</label>
              <input id="reg-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="you@domain.gov.in" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>PASSWORD</label>
              <input id="reg-password" type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="Min 8 characters" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>SELECT ROLE</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLES.map(r => (
                  <button key={r.id} type="button" id={`role-${r.id}`}
                    onClick={() => setForm(f => ({ ...f, role: r.id }))}
                    onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2, ease: 'power2.out' })}
                    onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}
                    style={{
                      flex: 1, padding: '12px 8px', textAlign: 'left', cursor: 'pointer',
                      backgroundColor: form.role === r.id ? '#1E3A5F' : '#0F1E38',
                      border: `1px solid ${form.role === r.id ? '#2A4A72' : '#1A2E4A'}`,
                      color: '#F0F4F8', transition: 'background-color 0.2s, border-color 0.2s',
                    }}>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, letterSpacing: '0.1em', marginBottom: 4, color: form.role === r.id ? '#F0F4F8' : '#B8C5D3' }}>{r.label}</div>
                    <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 10, color: '#8A9BB0', lineHeight: 1.4 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button id="reg-submit" type="submit" disabled={loading}
              style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '11px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 8, transition: 'background-color 0.2s' }}
              onMouseEnter={e => { if (!loading) gsap.to(e.currentTarget, { scale: 1.02, duration: 0.2, ease: 'power2.out' }) }}
              onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
            </button>
          </form>
          <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', marginTop: 20, textAlign: 'center' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#B8C5D3', textDecoration: 'none', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>SIGN IN →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
