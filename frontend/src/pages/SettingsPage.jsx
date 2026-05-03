import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'

export default function SettingsPage() {
  const { user } = useAuth()
  const [alertRadius, setAlertRadius] = useState(user?.alert_radius || 10)
  const [notifications, setNotifications] = useState({ critical: true, medium: true, low: false, scraper: false })
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/auth/me/settings', { alert_radius: alertRadius, notifications }),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) },
    onError: () => setSaved(false),
  })

  const ROLE_DESC = {
    admin: 'Full access: dashboard, analytics, scraper monitor, resource allocation, user management.',
    responder: 'Manage and update assigned incidents, receive real-time WebSocket alerts.',
    citizen: 'Submit incident reports, view nearby incidents on map, receive safe route guidance.',
  }

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>
      <div style={{ borderBottom: '1px solid #1A2E4A', padding: '12px 24px' }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.15em', marginBottom: 2 }}>OPERATOR SETTINGS</div>
        <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: 0 }}>Configuration</h2>
      </div>

      <div style={{ padding: '24px', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile */}
        <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>OPERATOR PROFILE</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['NAME', user?.name], ['EMAIL', user?.email], ['ROLE', user?.role?.toUpperCase()]].map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>{k}</span>
                <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#F0F4F8' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16 }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>ACCESS LEVEL</span>
              <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', lineHeight: 1.5 }}>{ROLE_DESC[user?.role] || ''}</span>
            </div>
          </div>
        </div>

        {/* Alert Radius */}
        <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>ALERT RADIUS</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="range" min={1} max={100} value={alertRadius} onChange={e => setAlertRadius(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#1E3A5F' }} />
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, color: '#F0F4F8', minWidth: 60 }}>{alertRadius} km</span>
            </div>
            <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', margin: 0 }}>
              You will receive alerts for incidents within {alertRadius}km of your registered location.
            </p>
          </div>
        </div>

        {/* Notification Preferences */}
        <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>NOTIFICATION PREFERENCES</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { key: 'critical', label: 'CRITICAL incidents', desc: 'Immediate push for CRITICAL severity events' },
              { key: 'medium', label: 'MEDIUM incidents', desc: 'Alerts for MEDIUM severity events' },
              { key: 'low', label: 'LOW incidents', desc: 'Non-urgent low-severity alerts' },
              { key: 'scraper', label: 'Scraper digest', desc: 'Hourly summary of scraped India crisis data (admin only)' },
            ].map(n => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1A2E4A' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#F0F4F8', marginBottom: 2 }}>{n.label}</div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0' }}>{n.desc}</div>
                </div>
                <button onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key] }))}
                  style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: notifications[n.key] ? '#1E3A5F' : '#1A2E4A', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: notifications[n.key] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: notifications[n.key] ? '#F0F4F8' : '#8A9BB0', transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '10px 24px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', cursor: saveMutation.isPending ? 'not-allowed' : 'pointer', opacity: saveMutation.isPending ? 0.6 : 1 }}>
            {saveMutation.isPending ? 'SAVING...' : 'SAVE SETTINGS →'}
          </button>
          {saved && <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#27AE60', letterSpacing: '0.08em' }}>SAVED</span>}
        </div>
      </div>
    </div>
  )
}
