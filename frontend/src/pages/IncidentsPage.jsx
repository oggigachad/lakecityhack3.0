import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { SeverityBadge, SourceBadge, VerifiedBadge, SentimentBadge, StatusBadge } from '../components/Badges'

const SEVERITIES = ['', 'LOW', 'MEDIUM', 'CRITICAL']
const TYPES = ['', 'flood', 'fire', 'conflict', 'medical', 'infrastructure', 'cyclone', 'earthquake', 'other']
const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed']
const SOURCES = ['', 'scraped', 'user_reported']

export default function IncidentsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ severity: '', type: '', status: '', source: '' })
  const [selected, setSelected] = useState(null)
  const [statusForm, setStatusForm] = useState({ status: '', note: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [liveItems, setLiveItems] = useState([])   // WS-pushed items prepended in real-time
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const { messages, isConnected } = useWebSocket()
  const seenIds = useRef(new Set())

  // Prepend new WS incidents in real-time
  useEffect(() => {
    const latest = messages[0]
    if (!latest || latest.type !== 'new_incident') return
    const id = latest.payload?.id
    if (!id || seenIds.current.has(id)) return
    seenIds.current.add(id)
    setLiveItems(prev => [latest.payload, ...prev].slice(0, 50))
  }, [messages])

  const handleScrapeNow = async () => {
    if (scraping) return
    setScraping(true)
    setScrapeMsg('SCRAPING...')
    try {
      const res = await api.post('/scraper/run')
      setScrapeMsg('LIVE — data arriving via WebSocket')
      setTimeout(() => setScrapeMsg(''), 8000)
    } catch {
      setScrapeMsg('ERROR — check backend')
      setTimeout(() => setScrapeMsg(''), 4000)
    } finally {
      setScraping(false)
    }
  }

  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => api.get(`/incidents/?${params}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: detail } = useQuery({
    queryKey: ['incident', selected],
    queryFn: () => api.get(`/incidents/${selected}`).then(r => r.data),
    enabled: !!selected,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/incidents/${id}/status`, body),
    onSuccess: () => { qc.invalidateQueries(['incidents']); qc.invalidateQueries(['incident', selected]) },
  })

  const removeIncident = useMutation({
    mutationFn: (id) => api.delete(`/incidents/${id}`),
    onSuccess: () => { 
      setModalOpen(false)
      setSelected(null)
      qc.invalidateQueries(['incidents']) 
    },
  })

  const incidents = data?.data || []

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1A2E4A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.15em', marginBottom: 2 }}>INCIDENT MANAGEMENT</div>
          <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: 0 }}>
            All Incidents <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#8A9BB0' }}>({(data?.total ?? 0) + liveItems.length || '—'})</span>
          </h2>
        </div>
        {/* Live controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {scrapeMsg && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: scraping ? '#27AE60' : '#F59E0B', letterSpacing: '0.08em', animation: scraping ? 'pulse-dot 1s infinite' : 'none' }}>
              {scrapeMsg}
            </span>
          )}
          {liveItems.length > 0 && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#27AE60', border: '1px solid #27AE6040', padding: '2px 8px' }}>
              +{liveItems.length} LIVE
            </span>
          )}
          <button
            onClick={handleScrapeNow}
            disabled={scraping}
            style={{
              backgroundColor: scraping ? '#1A2E4A' : '#1E3A5F',
              border: `1px solid ${scraping ? '#2A4A72' : '#27AE60'}`,
              color: scraping ? '#8A9BB0' : '#27AE60',
              fontFamily: 'IBM Plex Mono', fontSize: 10,
              letterSpacing: '0.1em', padding: '7px 16px',
              cursor: scraping ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {scraping ? '⟳ SCRAPING...' : '⟳ SCRAPE NOW'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #1A2E4A', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>FILTER:</span>
        {[
          { key: 'severity', options: SEVERITIES, label: 'Severity' },
          { key: 'type', options: TYPES, label: 'Type' },
          { key: 'status', options: STATUSES, label: 'Status' },
          { key: 'source', options: SOURCES, label: 'Source' },
        ].map(f => (
          <select key={f.key} className="select-field" style={{ width: 'auto', minWidth: 120 }}
            value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}>
            <option value="">{f.label}</option>
            {f.options.filter(Boolean).map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ severity: '', type: '', status: '', source: '' })}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.08em', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer' }}>
            CLEAR
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ padding: '0 24px 24px', overflowX: 'auto' }}>
        <table className="data-table" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>SEVERITY</th><th>TITLE</th><th>TYPE</th><th>STATUS</th>
              <th>SOURCE</th><th>VERIFIED</th><th>CONFIDENCE</th><th>REPORTED</th>
            </tr>
          </thead>
          <tbody>
            {/* Live WS items — prepended instantly */}
            {liveItems.map((inc, i) => (
              <tr key={`live-${inc.id || i}`}
                style={{ cursor: 'default', backgroundColor: '#0A2A0A', borderLeft: '2px solid #27AE60', animation: 'liveFlash 1.5s ease-out' }}>
                <td><SeverityBadge severity={inc.severity} /></td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'IBM Plex Sans', fontSize: 12 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#27AE60', marginRight: 6 }}>● LIVE</span>
                  {inc.title}
                </td>
                <td><span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', textTransform: 'uppercase' }}>{inc.type}</span></td>
                <td><StatusBadge status="open" /></td>
                <td><SourceBadge source={inc.source || 'scraped'} /></td>
                <td><VerifiedBadge verified={inc.is_verified} /></td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#B8C5D3' }}>{((inc.confidence || 0.7) * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#27AE60' }}>JUST NOW</td>
              </tr>
            ))}
            {/* DB incidents */}
            {isLoading ? Array(8).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 20, borderRadius: 2 }} /></td></tr>
            )) : incidents.map(inc => (
              <tr key={inc.id} onClick={() => { setSelected(inc.id); setModalOpen(true) }}
                style={{ cursor: 'pointer' }}>
                <td><SeverityBadge severity={inc.severity} /></td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'IBM Plex Sans', fontSize: 12 }}>{inc.title}</td>
                <td><span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', textTransform: 'uppercase' }}>{inc.type}</span></td>
                <td><StatusBadge status={inc.status} /></td>
                <td><SourceBadge source={inc.source} /></td>
                <td><VerifiedBadge verified={inc.is_verified} /></td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#B8C5D3' }}>{(inc.confidence * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>{new Date(inc.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!isLoading && incidents.length === 0 && liveItems.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#8A9BB0', fontFamily: 'IBM Plex Mono', fontSize: 10, padding: 32 }}>No incidents match current filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {modalOpen && detail && (
        <div onClick={() => setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #1A2E4A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>INCIDENT DETAIL</span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#8A9BB0', cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: 14 }}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <SeverityBadge severity={detail.severity} />
                <StatusBadge status={detail.status} />
                <SourceBadge source={detail.source} />
                <VerifiedBadge verified={detail.is_verified} />
                <SentimentBadge sentiment={detail.sentiment} />
              </div>
              <h3 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: '0 0 12px' }}>{detail.title}</h3>
              <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#B8C5D3', lineHeight: 1.6, margin: '0 0 16px' }}>{detail.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['TYPE', detail.type], ['CONFIDENCE', `${(detail.confidence * 100).toFixed(1)}%`],
                  ['LAT / LNG', `${detail.location?.lat?.toFixed(4)}, ${detail.location?.lng?.toFixed(4)}`],
                  ['CREATED', new Date(detail.created_at).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} style={{ backgroundColor: '#0A1628', border: '1px solid #1A2E4A', padding: '8px 12px' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#F0F4F8' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Update status (responder/admin) */}
              {['responder', 'admin'].includes(user?.role) && (
                <div style={{ borderTop: '1px solid #1A2E4A', paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 10 }}>UPDATE STATUS</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="select-field" style={{ flex: 1 }}
                      value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="">Select status...</option>
                      {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                    <button onClick={() => { if (statusForm.status) updateStatus.mutate({ id: detail.id, body: statusForm }) }}
                      style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', border: '1px solid #2A4A72', padding: '6px 14px', fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>
                      APPLY
                    </button>
                  </div>
                </div>
              )}

              {/* Remove Incident */}
              {(user?.role === 'admin' || detail.reported_by === user?.id) && (
                <div style={{ borderTop: '1px solid #1A2E4A', paddingTop: 16, marginBottom: 16 }}>
                  <button onClick={() => { if (window.confirm("Are you sure you want to remove this incident?")) removeIncident.mutate(detail.id) }}
                    disabled={removeIncident.isPending}
                    style={{ backgroundColor: '#C0392B', color: '#fff', border: 'none', padding: '6px 14px', fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>
                    REMOVE INCIDENT
                  </button>
                </div>
              )}

              {/* Audit Trail */}
              {detail.audit_trail?.length > 0 && (
                <div style={{ borderTop: '1px solid #1A2E4A', paddingTop: 16 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 10 }}>AUDIT TRAIL</div>
                  {detail.audit_trail.map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #1A2E4A' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', flexShrink: 0 }}>{new Date(log.timestamp).toLocaleString()}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#B8C5D3' }}>{log.action}</span>
                      {log.note && <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0' }}>{log.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes liveFlash {
          0% { background-color: #0A3A1A; }
          100% { background-color: #0A2A0A; }
        }
      `}</style>
    </div>
  )
}
