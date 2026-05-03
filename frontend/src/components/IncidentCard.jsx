import { SeverityBadge, SourceBadge, VerifiedBadge, SentimentBadge, StatusBadge } from './Badges'

export default function IncidentCard({ incident, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        backgroundColor: '#0F1E38',
        border: '1px solid #1A2E4A',
        padding: '12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        <SourceBadge source={incident.source} />
        <VerifiedBadge verified={incident.is_verified} />
        <SentimentBadge sentiment={incident.sentiment} />
      </div>
      <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#F0F4F8', marginBottom: 4 }}>
        {incident.title}
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.05em' }}>
        {incident.type?.toUpperCase()} · {(incident.confidence * 100).toFixed(1)}% CONFIDENCE
      </div>
    </button>
  )
}
