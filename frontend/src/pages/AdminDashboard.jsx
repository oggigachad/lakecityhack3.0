import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { SeverityBadge, SourceBadge, StatusBadge } from '../components/Badges'
import MapView from '../components/MapView'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'

const SEV_COLORS = { CRITICAL: '#C0392B', MEDIUM: '#E67E22', LOW: '#27AE60' }
const TYPE_COLORS = ['#1E3A5F', '#C0392B', '#E67E22', '#27AE60', '#2A4A72', '#8A9BB0', '#3498DB']

function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '16px 20px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 28, fontWeight: 300, color: accent || '#F0F4F8', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '8px 12px' }}>
      {label && <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: p.fill || '#F0F4F8' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState('24h')
  const [activeTab, setActiveTab] = useState('overview')
  const { messages, isConnected } = useWebSocket()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/incidents/stats/summary').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents-map'],
    queryFn: () => api.get('/incidents/?limit=100').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: scraperStatus } = useQuery({
    queryKey: ['scraper-status'],
    queryFn: () => api.get('/scraper/status').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: feedData } = useQuery({
    queryKey: ['scraper-feed'],
    queryFn: () => api.get('/scraper/feed?limit=20').then(r => r.data),
    refetchInterval: 30000,
  })

  const sevData = stats
    ? Object.entries(stats.severity_distribution || {}).map(([k, v]) => ({ name: k, value: v }))
    : []
  const typeData = stats
    ? Object.entries(stats.type_distribution || {})
        .map(([k, v]) => ({ name: k.toUpperCase(), count: v }))
        .sort((a, b) => b.count - a.count)
    : []

  const liveEvents = messages.filter(m => m.type === 'new_incident').slice(0, 10)
  const incidents = incidentsData?.data || []

  const TABS = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'map', label: 'MAP' },
    { id: 'scraper', label: 'SCRAPER' },
  ]

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid #1A2E4A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.15em', marginBottom: 2 }}>ADMIN — COMMAND CENTER</div>
          <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: 0 }}>Situation Overview</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* WS indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isConnected ? '#27AE60' : '#C0392B' }}
              className={isConnected ? 'animate-pulse-dot' : ''} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: isConnected ? '#27AE60' : '#C0392B', letterSpacing: '0.08em' }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          {/* Time range */}
          <div style={{ display: 'flex', gap: 0 }}>
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.08em', padding: '4px 10px', cursor: 'pointer', border: '1px solid #1A2E4A', borderLeft: r === '24h' ? '1px solid #1A2E4A' : 'none', backgroundColor: timeRange === r ? '#1E3A5F' : 'transparent', color: timeRange === r ? '#F0F4F8' : '#8A9BB0' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid #1A2E4A', display: 'flex' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 20px', fontFamily: 'IBM Plex Mono', fontSize: 10, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.id ? '#F0F4F8' : '#8A9BB0', borderBottom: `2px solid ${activeTab === tab.id ? '#1E3A5F' : 'transparent'}`, transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatBox label="Total Incidents" value={stats?.total} sub="All time" />
              <StatBox label="Active / Open" value={stats?.open} sub="Awaiting response" accent="#E67E22" />
              <StatBox label="Critical" value={stats?.critical} sub="Immediate action needed" accent="#C0392B" />
              <StatBox label="New (Live)" value={liveEvents.length} sub="This session via WS" accent="#27AE60" />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Severity Donut */}
              <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '16px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 12 }}>SEVERITY DISTRIBUTION</div>
                {sevData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={sevData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {sevData.map((entry, i) => <Cell key={i} fill={SEV_COLORS[entry.name] || '#1E3A5F'} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                      {Object.entries(SEV_COLORS).map(([k, c]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, backgroundColor: c }} />
                          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="skeleton" style={{ height: 160 }} />}
              </div>

              {/* Type Bar */}
              <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '16px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginBottom: 12 }}>INCIDENT TYPE BREAKDOWN</div>
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={typeData} layout="vertical" margin={{ left: 4, right: 8 }}>
                      <XAxis type="number" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} width={80} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                        {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="skeleton" style={{ height: 160 }} />}
              </div>
            </div>

            {/* Live feed + scraper side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12 }}>
              {/* Live incident stream */}
              <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>LIVE INCIDENT STREAM</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#27AE60' }} className="animate-pulse-dot" />
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#27AE60' }}>REAL-TIME</span>
                  </div>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {liveEvents.length === 0 ? (
                    <div style={{ padding: '24px 16px', fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#8A9BB0', textAlign: 'center' }}>
                      Awaiting live WebSocket events...
                    </div>
                  ) : liveEvents.map((m, i) => (
                    <div key={i} className="animate-slide-in"
                      style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <SeverityBadge severity={m.payload?.severity} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.payload?.title}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', marginTop: 2 }}>
                          {m.payload?.type} · {m.payload?.source || 'user'} · {new Date(m.payload?.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scraper monitor */}
              <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>SCRAPER MONITOR</span>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {(scraperStatus?.sources || []).map((src, i) => (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid #1A2E4A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#F0F4F8', letterSpacing: '0.04em' }}>{src.source_name}</span>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: src.status === 'error' ? '#C0392B' : '#27AE60' }} />
                      </div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', marginTop: 2 }}>
                        {src.last_run ? new Date(src.last_run).toLocaleTimeString() : 'N/A'} · {src.total_ingested || 0} items
                      </div>
                      {src.last_error && (
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#C0392B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {src.last_error}
                        </div>
                      )}
                    </div>
                  ))}
                  {!scraperStatus?.sources?.length && (
                    <div style={{ padding: '16px', fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>
                      No scraper data yet — run python scraper/scheduler.py
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAP TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>
                GEOSPATIAL INCIDENT MAP — {incidents.length} INCIDENTS PLOTTED
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>
                  CRITICAL: {incidents.filter(i => i.severity === 'CRITICAL').length}
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>
                  OPEN: {incidents.filter(i => i.status === 'open').length}
                </span>
              </div>
            </div>
            <div style={{ border: '1px solid #1A2E4A' }}>
              <MapView incidents={incidents} height={500} />
            </div>
          </div>
        )}

        {/* ── SCRAPER TAB ───────────────────────────────────────────────── */}
        {activeTab === 'scraper' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em' }}>SCRAPER STATUS — ALL SOURCES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {(scraperStatus?.sources || []).map((src, i) => (
                <div key={i} style={{ backgroundColor: '#0F1E38', border: `1px solid ${src.status === 'error' ? 'rgba(192,57,43,0.3)' : '#1A2E4A'}`, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#F0F4F8' }}>{src.source_name}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: src.status === 'error' ? '#C0392B' : '#27AE60', border: `1px solid ${src.status === 'error' ? '#C0392B' : '#27AE60'}30`, padding: '1px 6px' }}>
                      {(src.status || 'ok').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0' }}>LAST RUN</span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#B8C5D3' }}>
                        {src.last_run ? new Date(src.last_run).toLocaleString() : 'Never'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0' }}>TOTAL INGESTED</span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#B8C5D3' }}>{src.total_ingested || 0}</span>
                    </div>
                  </div>
                  {src.last_error && (
                    <div style={{ marginTop: 8, fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#C0392B', borderTop: '1px solid rgba(192,57,43,0.2)', paddingTop: 6 }}>
                      {src.last_error.slice(0, 100)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Latest feed items */}
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.12em', marginTop: 8 }}>LATEST SCRAPED FEED</div>
            <div style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
              {(feedData?.data || []).slice(0, 15).map((item, i) => (
                <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#1E3A5F', border: '1px solid #1A2E4A', padding: '1px 6px', flexShrink: 0, marginTop: 2 }}>
                    {item.source_name?.toUpperCase().slice(0, 8)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.raw_text?.slice(0, 120)}
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', marginTop: 2 }}>
                      {item.veri_analysis?.crisis_type} · conf {((item.veri_analysis?.confidence || 0) * 100).toFixed(0)}%
                      · {new Date(item.scraped_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <SeverityBadge severity={item.veri_analysis?.severity} />
                </div>
              ))}
              {!feedData?.data?.length && (
                <div style={{ padding: 24, fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#8A9BB0', textAlign: 'center' }}>
                  No scraped feed yet — start scheduler.py
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
