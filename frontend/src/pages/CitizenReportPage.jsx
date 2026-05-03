import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { SeverityBadge, VerifiedBadge } from '../components/Badges'
import 'leaflet/dist/leaflet.css'

const CRISIS_TYPES = ['flood', 'fire', 'conflict', 'medical', 'infrastructure', 'cyclone', 'earthquake', 'other']
const STEPS = ['LOCATION', 'INCIDENT TYPE', 'DETAILS', 'REVIEW']

export default function CitizenReportPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ lat: '', lng: '', type: '', title: '', description: '' })
  const [veriPreview, setVeriPreview] = useState(null)
  const [veriLoading, setVeriLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const veriTimer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Live VeriAI preview as user types
  useEffect(() => {
    if (!form.description || form.description.length < 20) return
    clearTimeout(veriTimer.current)
    veriTimer.current = setTimeout(async () => {
      setVeriLoading(true)
      try {
        const res = await api.post('/veri/analyze', { text: `${form.title}. ${form.description}` })
        setVeriPreview(res.data)
      } catch {}
      setVeriLoading(false)
    }, 800)
    return () => clearTimeout(veriTimer.current)
  }, [form.description, form.title])

  // Leaflet map init
  const leafletMapRef = useRef(null)
  const leafletMarkerRef = useRef(null)

  useEffect(() => {
    if (step !== 0) return
    let map = null

    const initLeaflet = async () => {
      const L = (await import('leaflet')).default

      // Ensure container exists
      if (!mapRef.current || leafletMapRef.current) return

      map = L.map(mapRef.current, {
        center: [23.2599, 77.4126],
        zoom: 10,
        zoomControl: true,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map)

      leafletMapRef.current = map

      // Click to place marker
      map.on('click', (e) => {
        const { lat, lng } = e.latlng
        setForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))

        if (leafletMarkerRef.current) map.removeLayer(leafletMarkerRef.current)
        leafletMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: '#C0392B',
          color: '#fff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map).bindPopup(
          `<div style="font-family:IBM Plex Mono;font-size:10px;color:#F0F4F8;background:#0F1E38;padding:6px 10px;border:1px solid #1A2E4A">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`,
          { className: 'trinetra-popup' }
        ).openPopup()
      })
    }

    initLeaflet()

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        leafletMarkerRef.current = null
      }
    }
  }, [step])

  const submitMutation = useMutation({
    mutationFn: () => api.post('/incidents/report', {
      title: form.title, description: form.description, type: form.type,
      location: { lat: parseFloat(form.lat) || 23.2599, lng: parseFloat(form.lng) || 77.4126 },
    }),
    onSuccess: (res) => setSubmitted(res.data),
  })

  if (submitted) return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, backgroundColor: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#27AE60', letterSpacing: '0.2em', marginBottom: 8 }}>INCIDENT SUBMITTED</div>
        <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 20, fontWeight: 300, color: '#F0F4F8', marginBottom: 8 }}>Report Received</h2>
        <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#8A9BB0', marginBottom: 20 }}>Your incident has been analyzed by VeriAI and logged in the system.</p>
        <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '12px 20px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', marginBottom: 4 }}>INCIDENT ID</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: '#F0F4F8' }}>{submitted.id}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <SeverityBadge severity={submitted.severity} />
          <VerifiedBadge verified={submitted.is_verified} />
        </div>
        <button onClick={() => { setSubmitted(null); setStep(0); setForm({ lat: '', lng: '', type: '', title: '', description: '' }) }}
          style={{ marginTop: 24, backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '10px 24px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer' }}>
          SUBMIT ANOTHER →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1A2E4A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.15em', marginBottom: 2 }}>CITIZEN INTERFACE</div>
          <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: 0 }}>Report an Incident</h2>
        </div>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ padding: '4px 12px', fontFamily: 'IBM Plex Mono', fontSize: 8, letterSpacing: '0.1em', backgroundColor: i === step ? '#1E3A5F' : 'transparent', color: i === step ? '#F0F4F8' : '#8A9BB0', border: '1px solid #1A2E4A', borderLeft: i > 0 ? 'none' : '1px solid #1A2E4A' }}>
              {String(i + 1).padStart(2, '0')} {s}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 90px)' }}>
        {/* Main form area */}
        <div style={{ padding: '24px', borderRight: '1px solid #1A2E4A' }}>
          {/* Step 0: Location */}
          {step === 0 && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 12 }}>STEP 1 — PIN INCIDENT LOCATION</div>
              <div
                ref={mapRef}
                style={{ width: '100%', height: 320, backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', marginBottom: 12 }}
              />
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.08em', marginBottom: 12 }}>
                ↑ CLICK ON THE MAP TO PIN THE INCIDENT LOCATION
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LATITUDE</label>
                  <input className="input-field" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="Click map to set" />
                </div>
                <div>
                  <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LONGITUDE</label>
                  <input className="input-field" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="Click map to set" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Type */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 12 }}>STEP 2 — SELECT CRISIS TYPE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CRISIS_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ padding: '16px 8px', cursor: 'pointer', border: `1px solid ${form.type === t ? '#2A4A72' : '#1A2E4A'}`, backgroundColor: form.type === t ? '#1E3A5F' : '#0F1E38', color: form.type === t ? '#F0F4F8' : '#B8C5D3', fontFamily: 'IBM Plex Mono', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>STEP 3 — DESCRIBE THE INCIDENT</div>
              <div>
                <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>INCIDENT TITLE</label>
                <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief, factual title" />
              </div>
              <div>
                <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                <textarea className="input-field" rows={6} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what happened — location, scale, casualties, immediate needs..." style={{ resize: 'vertical' }} />
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', marginTop: 4 }}>VeriAI analyzes your text in real-time as you type →</div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 16 }}>STEP 4 — REVIEW & SUBMIT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['LOCATION', `${form.lat || 'Not set'}, ${form.lng || 'Not set'}`],
                  ['TYPE', form.type || 'Not selected'],
                  ['TITLE', form.title || 'Not provided'],
                  ['DESCRIPTION', form.description ? form.description.slice(0, 120) + '...' : 'Not provided'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 16, padding: '10px 14px', backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em', minWidth: 100 }}>{k}</span>
                    <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#F0F4F8' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ backgroundColor: 'transparent', color: '#B8C5D3', border: '1px solid #1A2E4A', padding: '10px 20px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>
                ← BACK
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)}
                style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '10px 20px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>
                NEXT →
              </button>
            ) : (
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                style={{ backgroundColor: '#C0392B', color: '#fff', border: '1px solid #922B21', padding: '10px 24px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.08em', cursor: submitMutation.isPending ? 'not-allowed' : 'pointer', opacity: submitMutation.isPending ? 0.6 : 1 }}>
                {submitMutation.isPending ? 'SUBMITTING...' : 'SUBMIT INCIDENT →'}
              </button>
            )}
          </div>
        </div>

        {/* VeriAI Preview Panel */}
        <div style={{ backgroundColor: '#050E1A', borderLeft: '1px solid #1A2E4A', padding: '20px 16px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 16 }}>VERI AI PREVIEW</div>
          {veriLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[60, 80, 50, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 36, width: `${w}%`, borderRadius: 2 }} />)}
            </div>
          ) : veriPreview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['SEVERITY', <SeverityBadge severity={veriPreview.severity} />],
                ['VERIFIED', <VerifiedBadge verified={veriPreview.is_verified} />],
                ['CONFIDENCE', <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: '#F0F4F8' }}>{(veriPreview.confidence * 100).toFixed(1)}%</span>],
                ['CRISIS TYPE', <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#B8C5D3', textTransform: 'uppercase' }}>{veriPreview.crisis_type}</span>],
                ['SENTIMENT', <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: veriPreview.sentiment === 'negative' ? '#C0392B' : veriPreview.sentiment === 'positive' ? '#27AE60' : '#B8C5D3' }}>{veriPreview.sentiment?.toUpperCase()}</span>],
              ].map(([label, value]) => (
                <div key={label} style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 4 }}>{label}</div>
                  {value}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', lineHeight: 1.6 }}>
              Start describing the incident in Step 3 and VeriAI will analyze severity, authenticity, and crisis type in real-time.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
