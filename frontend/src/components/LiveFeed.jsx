import IncidentCard from './IncidentCard'

export default function LiveFeed({ messages = [], onIncidentClick }) {
  const items = messages
    .filter((m) => m.type === 'new_incident' || m.type === 'incident_updated')
    .slice(0, 20)

  if (!items.length) {
    return (
      <div style={{ padding: '20px 16px', fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#8A9BB0' }}>
        Awaiting live incident events...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
      {items.map((msg, i) => {
        if (msg.type === 'incident_updated') {
          return (
            <div key={i} style={{ border: '1px solid #1A2E4A', padding: '10px 12px', backgroundColor: '#0A1628' }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0' }}>INCIDENT UPDATE</div>
              <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#F0F4F8', marginTop: 4 }}>
                #{msg.payload?.id} status changed to {(msg.payload?.status || '').toUpperCase()}
              </div>
            </div>
          )
        }
        const incident = {
          id: msg.payload?.id,
          title: msg.payload?.title || 'Untitled incident',
          severity: msg.payload?.severity || 'LOW',
          type: msg.payload?.type || 'other',
          source: 'scraped',
          is_verified: true,
          sentiment: 'neutral',
          status: 'open',
          confidence: 0.7,
        }
        return <IncidentCard key={i} incident={incident} onClick={() => onIncidentClick?.(incident)} />
      })}
    </div>
  )
}
