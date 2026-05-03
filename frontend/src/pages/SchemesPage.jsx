import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

const CATEGORIES = ['', 'flood', 'fire', 'medical', 'infrastructure', 'drought', 'earthquake', 'cyclone', 'disaster relief']
const STATES = ['', 'Madhya Pradesh', 'National', 'Maharashtra', 'Kerala', 'Assam', 'Odisha', 'Uttarakhand']

// Category → colour mapping for badges
const CAT_COLORS = {
  flood:           { bg: '#0d2d4d', border: '#1565C0', text: '#64B5F6' },
  fire:            { bg: '#3d1a0d', border: '#BF360C', text: '#FF8A65' },
  cyclone:         { bg: '#1a0d3d', border: '#4527A0', text: '#B39DDB' },
  earthquake:      { bg: '#3d2a0d', border: '#E65100', text: '#FFCC80' },
  drought:         { bg: '#2a2a0d', border: '#827717', text: '#DCE775' },
  medical:         { bg: '#0d3d2a', border: '#00695C', text: '#80CBC4' },
  infrastructure:  { bg: '#1a2a3d', border: '#1565C0', text: '#90CAF9' },
  'disaster relief': { bg: '#0d3d3d', border: '#00838F', text: '#80DEEA' },
}

function getCatStyle(cat = '') {
  const key = cat.toLowerCase()
  return CAT_COLORS[key] || { bg: '#1A2E4A', border: '#2A4A72', text: '#8A9BB0' }
}

export default function SchemesPage() {
  const [filters, setFilters] = useState({ category: '', state: '' })

  const params = new URLSearchParams()
  if (filters.category) params.append('category', filters.category)
  if (filters.state) params.append('state', filters.state)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['schemes', filters],
    queryFn: () => api.get(`/schemes/?${params}`).then(r => r.data),
    refetchInterval: 300000,
    retry: 2,
  })

  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')

  const handleScrapeNow = async () => {
    if (scraping) return
    setScraping(true)
    setScrapeMsg('PIPELINE RUNNING...')
    try {
      await api.post('/scraper/run')
      setScrapeMsg('SCRAPED — refreshing...')
      setTimeout(() => {
        refetch()
        setScrapeMsg('')
      }, 5000)
    } catch {
      setScrapeMsg('ERROR — check backend')
      setTimeout(() => setScrapeMsg(''), 4000)
    } finally {
      setScraping(false)
    }
  }

  // Normalise fields: backend may return 'source_url' instead of 'link',
  // 'raw_text' instead of 'description' — handle both gracefully.
  const raw = data?.data || []
  const schemes = raw.map(s => ({
    ...s,
    link:        s.link        || s.source_url || '#',
    description: s.description || s.raw_text   || 'No description available.',
    category:    s.category    || 'disaster relief',
    state:       s.state       || 'National',
  }))

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1A2E4A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.15em', marginBottom: 2 }}>GOVERNMENT SCHEMES</div>
          <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 16, fontWeight: 400, color: '#F0F4F8', margin: 0 }}>
            Disaster Relief Schemes{' '}
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#8A9BB0' }}>({data?.total ?? '—'})</span>
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {scrapeMsg && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: scraping ? '#27AE60' : '#F59E0B', letterSpacing: '0.08em', animation: scraping ? 'pulse-dot 1s infinite' : 'none' }}>
              {scrapeMsg}
            </span>
          )}
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', letterSpacing: '0.08em', textAlign: 'right' }}>
            AUTO-POPULATED FROM<br />NDMA · MP SDMA · STATE SDMA
          </div>
          <button
            onClick={handleScrapeNow}
            disabled={scraping}
            style={{
              backgroundColor: scraping ? '#1A2E4A' : '#1E3A5F',
              border: `1px solid ${scraping ? '#2A4A72' : '#27AE60'}`,
              color: scraping ? '#8A9BB0' : '#27AE60',
              fontFamily: 'IBM Plex Mono', fontSize: 10,
              letterSpacing: '0.1em', padding: '8px 16px',
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
        <select className="select-field" style={{ width: 'auto', minWidth: 140 }}
          value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <select className="select-field" style={{ width: 'auto', minWidth: 160 }}
          value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}>
          <option value="">All States</option>
          {STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ category: '', state: '' })}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.08em', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer' }}>CLEAR</button>
        )}
      </div>

      {/* Error banner */}
      {isError && (
        <div style={{ margin: '12px 24px', padding: '10px 14px', backgroundColor: '#2d0d0d', border: '1px solid #C0392B', fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#FF8A65' }}>
          ⚠ API error: {error?.message || 'Could not load schemes'}. Make sure the backend is running.
        </div>
      )}

      {/* Schemes grid */}
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {isLoading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 2 }} />
            ))
          : schemes.length === 0
            ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#8A9BB0' }}>
                {isError
                  ? 'Cannot load schemes — backend unreachable.'
                  : 'No schemes found. Run the scraper pipeline to populate this page.'}
              </div>
            )
            : schemes.map(s => {
                const cs = getCatStyle(s.category)
                return (
                  <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div
                      style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '16px', transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2A4A72'; e.currentTarget.style.boxShadow = '0 0 12px rgba(42,74,114,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A2E4A'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {/* Title row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <h3 style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 500, color: '#F0F4F8', margin: 0, lineHeight: 1.4, flex: 1 }}>
                          {s.title}
                        </h3>
                        {/* Category badge */}
                        <span style={{
                          fontFamily: 'IBM Plex Mono', fontSize: 8, flexShrink: 0, textTransform: 'uppercase',
                          padding: '2px 7px', border: `1px solid ${cs.border}`,
                          backgroundColor: cs.bg, color: cs.text,
                        }}>
                          {s.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p style={{
                        fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', lineHeight: 1.6,
                        margin: '0 0 12px',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {s.description}
                      </p>

                      {/* Benefits & Eligibility */}
                      {(s.benefits || s.eligibility) && (
                        <div style={{ display: 'grid', gap: 6, marginBottom: 12, borderTop: '1px solid #1A2E4A', paddingTop: 10 }}>
                          {s.eligibility && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#10B981', flexShrink: 0, marginTop: 2 }}>ELIGIBILITY</span>
                              <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 10, color: '#B8C5D3', lineHeight: 1.4 }}>{s.eligibility}</span>
                            </div>
                          )}
                          {s.benefits && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#F59E0B', flexShrink: 0, marginTop: 2 }}>BENEFITS</span>
                              <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 10, color: '#F0F4F8', lineHeight: 1.4 }}>{s.benefits}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0',
                          border: '1px solid #1A2E4A', padding: '1px 6px', textTransform: 'uppercase',
                        }}>
                          {s.state}
                        </span>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#3A5A7A' }}>
                          {s.scraped_at ? `UPDATED ${new Date(s.scraped_at).toLocaleDateString()}` : 'OFFICIAL SOURCE'}
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })
        }
      </div>
    </div>
  )
}
