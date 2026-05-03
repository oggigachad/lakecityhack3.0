export default function ScraperMonitor({ sources = [] }) {
  if (!sources.length) {
    return <div style={{ padding: 16, fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>No scraper data yet</div>
  }

  return (
    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
      {sources.map((src, i) => (
        <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid #1A2E4A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#F0F4F8', letterSpacing: '0.04em' }}>
              {src.source_name}
            </span>
            <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#27AE60' }} />
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', marginTop: 2 }}>
            Last: {src.last_run ? new Date(src.last_run).toLocaleTimeString() : 'N/A'} · Total: {src.total_ingested || 0}
          </div>
        </div>
      ))}
    </div>
  )
}
