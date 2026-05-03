import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const SOURCE_COLORS = {
  'news': '#3B82F6',
  'ndtv': '#EF4444',
  'air': '#8B5CF6',
  'gdacs': '#F59E0B',
  'ndma': '#10B981',
  'ndrf': '#06B6D4',
  'imd': '#F97316',
  'reliefweb': '#6366F1',
  'usgs': '#EC4899',
  'cwc': '#14B8A6',
  'isro': '#84CC16',
};

function getSourceColor(sourceName = '') {
  const lower = sourceName.toLowerCase();
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#64748B';
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [liveCards, setLiveCards] = useState([]);   // real-time WS items
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const { messages } = useWebSocket();
  const seenIds = useRef(new Set());

  // Prepend cards live from WebSocket
  useEffect(() => {
    const latest = messages[0];
    if (!latest || latest.type !== 'new_incident') return;
    const inc = latest.payload;
    if (!inc?.id || seenIds.current.has(inc.id)) return;
    seenIds.current.add(inc.id);
    // Convert WS payload to a card-compatible object
    const card = {
      id: inc.id,
      title: inc.title,
      raw_text: '',
      source_name: inc.source,
      source_url: null,
      scraped_at: inc.created_at,
      location: inc.location,
      veri_analysis: { severity: inc.severity },
      _live: true,
    };
    setLiveCards(prev => [card, ...prev].slice(0, 50));
  }, [messages]);

  const handleScrapeNow = async () => {
    if (scraping) return;
    setScraping(true);
    setScrapeMsg('PIPELINE RUNNING...');
    try {
      await api.post('/scraper/run');
      setScrapeMsg('LIVE — new cards appearing below');
      setTimeout(() => setScrapeMsg(''), 10000);
    } catch {
      setScrapeMsg('ERROR — check backend');
      setTimeout(() => setScrapeMsg(''), 4000);
    } finally {
      setScraping(false);
    }
  };

  const fetchNews = useCallback(() => {
    setLoading(true);
    api.get('/scraper/feed?limit=100')
      .then(res => {
        const data = res.data?.data || [];
        setNews(data);
        setLastFetched(new Date());
        // Mark existing as seen so WS dupes are filtered
        data.forEach(n => n.id && seenIds.current.add(n.id));
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto-refresh every 60s
    const t = setInterval(fetchNews, 60_000);
    return () => clearInterval(t);
  }, [fetchNews]);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#070D16', color: '#F0F4F8' }}>

      {/* Header bar */}
      <div style={{
        borderBottom: '1px solid #1A2E4A',
        padding: '18px 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0A1628',
      }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F', letterSpacing: '0.2em', marginBottom: 6 }}>
            — LIVE INTELLIGENCE FEED
          </div>
          <h1 style={{ fontFamily: 'IBM Plex Sans', fontSize: 22, fontWeight: 300, margin: 0, color: '#F0F4F8' }}>
            Crisis News <span style={{ fontWeight: 700 }}>Monitor</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {scrapeMsg && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: scraping ? '#27AE60' : '#F59E0B', letterSpacing: '0.08em', animation: scraping ? 'pulse-dot 1s infinite' : 'none' }}>
              {scrapeMsg}
            </span>
          )}
          {lastFetched && !scrapeMsg && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>
              UPDATED {lastFetched.toLocaleTimeString('en-IN', { hour12: false })} IST
            </span>
          )}
          {liveCards.length > 0 && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#27AE60', border: '1px solid #27AE6040', padding: '2px 8px' }}>
              +{liveCards.length} LIVE
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
              letterSpacing: '0.1em', padding: '8px 16px',
              cursor: scraping ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {scraping ? '⟳ SCRAPING...' : '⟳ SCRAPE NOW'}
          </button>
          <button
            onClick={fetchNews}
            disabled={loading}
            style={{
              backgroundColor: '#1E3A5F', border: '1px solid #2A4A72',
              color: '#F0F4F8', fontFamily: 'IBM Plex Mono', fontSize: 10,
              letterSpacing: '0.1em', padding: '8px 16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {loading ? 'LOADING...' : '↻ REFRESH'}
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Live stats row */}
        {!loading && (news.length > 0 || liveCards.length > 0) && (
          <div style={{ display: 'flex', gap: 24, marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'TOTAL ARTICLES', value: news.length + liveCards.length, color: '#F0F4F8' },
              { label: 'LIVE THIS SESSION', value: liveCards.length, color: '#27AE60' },
              { label: 'SOURCES', value: [...new Set([...news, ...liveCards].map(n => n.source_name).filter(Boolean))].length, color: '#3B82F6' },
              { label: 'LAST HOUR', value: news.filter(n => n.scraped_at && (Date.now() - new Date(n.scraped_at).getTime()) < 3600_000).length, color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.1em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: 180, backgroundColor: '#0F1E38', border: '1px solid #1A2E4A', borderRadius: 2,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* News cards grid: live first, then DB */}
        {!loading && (liveCards.length > 0 || news.length > 0) && (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {/* Live WS cards — green flash */}
            {liveCards.map((n, idx) => {
              const srcColor = '#27AE60';
              return (
                <div
                  key={`live-${n.id || idx}`}
                  style={{
                    backgroundColor: '#0A2A0A', border: '1px solid #27AE60',
                    borderTop: '2px solid #27AE60', borderRadius: 2,
                    padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10,
                    animation: 'liveFlash 2s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.1em', color: '#27AE60', border: '1px solid #27AE6040', padding: '2px 8px' }}>
                      ● LIVE — {n.source_name || 'SCRAPER'}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#27AE60' }}>JUST NOW</span>
                  </div>
                  <h3 style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 500, color: '#E2E8F0', lineHeight: 1.5, margin: 0 }}>
                    {n.title}
                  </h3>
                </div>
              );
            })}
            {/* Existing DB news cards */}
            {news.map((n, idx) => {
              const srcColor = getSourceColor(n.source_name);
              const severity = n.veri_analysis?.severity || 'LOW';
              const severityColors = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#22C55E' };

              return (
                <div
                  key={n.id || idx}
                  style={{
                    backgroundColor: '#0F1E38', border: '1px solid #1A2E4A',
                    borderTop: `2px solid ${srcColor}`, borderRadius: 2,
                    padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'border-color 0.2s, background 0.2s',
                    cursor: n.source_url ? 'pointer' : 'default',
                  }}
                  onClick={() => n.source_url && window.open(n.source_url, '_blank')}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#162840'; e.currentTarget.style.borderColor = srcColor; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0F1E38'; e.currentTarget.style.borderColor = '#1A2E4A'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.1em', color: srcColor, textTransform: 'uppercase', border: `1px solid ${srcColor}30`, padding: '2px 8px' }}>
                      {n.source_name || 'SCRAPER'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, letterSpacing: '0.08em', color: severityColors[severity] || '#64748B', border: `1px solid ${severityColors[severity] || '#64748B'}40`, padding: '2px 6px' }}>
                        {severity}
                      </span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#64748B' }}>
                        {getTimeAgo(n.scraped_at)}
                      </span>
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 500, color: '#E2E8F0', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {n.title || n.raw_text?.slice(0, 100)}
                  </h3>
                  {n.raw_text && n.raw_text !== n.title && (
                    <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.raw_text}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #1A2E4A' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>
                      {n.location?.city || n.location?.state || (n.location?.lat ? `${n.location.lat.toFixed(2)}°N` : 'INDIA')}
                    </span>
                    {n.source_url && (
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: srcColor, letterSpacing: '0.05em' }}>READ SOURCE →</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && news.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px solid #1A2E4A', backgroundColor: '#0F1E38',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 32, color: '#1E3A5F', marginBottom: 16 }}>◉</div>
            <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 18, color: '#B8C5D3', fontWeight: 300, marginBottom: 8 }}>
              No feed data yet
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#64748B', letterSpacing: '0.05em', marginBottom: 24 }}>
              Run the scraper from a terminal to populate the feed:
            </div>
            <code style={{
              display: 'block', fontFamily: 'IBM Plex Mono', fontSize: 12,
              backgroundColor: '#050E1A', color: '#27AE60',
              padding: '12px 24px', border: '1px solid #1A2E4A',
              letterSpacing: '0.04em', marginBottom: 24,
            }}>
              python scraper/pipeline.py
            </code>
            <button
              onClick={fetchNews}
              style={{
                backgroundColor: '#1E3A5F', border: '1px solid #2A4A72',
                color: '#F0F4F8', fontFamily: 'IBM Plex Mono', fontSize: 11,
                letterSpacing: '0.1em', padding: '10px 24px', cursor: 'pointer',
              }}
            >
              ↻ RETRY
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes liveFlash {
          0% { background-color: #0A4A1A; border-color: #27AE60; }
          100% { background-color: #0A2A0A; border-color: #27AE60; }
        }
      `}</style>
    </div>
  );
}
