export function SeverityBadge({ severity }) {
  const map = {
    CRITICAL: { bg: 'rgba(192,57,43,0.15)', color: '#C0392B', border: 'rgba(192,57,43,0.4)' },
    MEDIUM:   { bg: 'rgba(230,126,34,0.15)', color: '#E67E22', border: 'rgba(230,126,34,0.4)' },
    LOW:      { bg: 'rgba(39,174,96,0.15)',  color: '#27AE60', border: 'rgba(39,174,96,0.4)' },
  }
  const s = map[severity] || map.LOW
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: 'IBM Plex Mono', fontSize: 9, padding: '2px 6px',
      letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block',
    }}>{severity || 'LOW'}</span>
  )
}

export function SourceBadge({ source }) {
  const scraped = source === 'scraped'
  return (
    <span style={{
      backgroundColor: scraped ? 'rgba(30,58,95,0.4)' : 'rgba(230,126,34,0.1)',
      color: scraped ? '#B8C5D3' : '#E67E22',
      border: `1px solid ${scraped ? '#1A2E4A' : 'rgba(230,126,34,0.3)'}`,
      fontFamily: 'IBM Plex Mono', fontSize: 9, padding: '2px 6px',
      letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block',
    }}>{scraped ? 'SCRAPED' : 'USER'}</span>
  )
}

export function VerifiedBadge({ verified }) {
  return verified ? (
    <span style={{
      backgroundColor: 'rgba(39,174,96,0.1)', color: '#27AE60',
      border: '1px solid rgba(39,174,96,0.3)',
      fontFamily: 'IBM Plex Mono', fontSize: 9, padding: '2px 6px',
      letterSpacing: '0.1em', display: 'inline-block',
    }}>VERIFIED</span>
  ) : (
    <span style={{
      backgroundColor: 'rgba(184,197,211,0.07)', color: '#B8C5D3',
      border: '1px solid rgba(184,197,211,0.2)',
      fontFamily: 'IBM Plex Mono', fontSize: 9, padding: '2px 6px',
      letterSpacing: '0.1em', display: 'inline-block',
    }}>UNVERIFIED</span>
  )
}

export function SentimentBadge({ sentiment }) {
  const map = {
    negative: { color: '#C0392B', label: 'NEG' },
    positive: { color: '#27AE60', label: 'POS' },
    neutral:  { color: '#B8C5D3', label: 'NEU' },
  }
  const s = map[sentiment] || map.neutral
  return (
    <span style={{
      color: s.color, fontFamily: 'IBM Plex Mono', fontSize: 9,
      letterSpacing: '0.1em', border: `1px solid ${s.color}30`,
      backgroundColor: `${s.color}10`, padding: '2px 5px',
    }}>{s.label}</span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    open:        { color: '#E67E22' },
    in_progress: { color: '#3498DB' },
    resolved:    { color: '#27AE60' },
    closed:      { color: '#B8C5D3' },
  }
  const s = map[status] || { color: '#B8C5D3' }
  return (
    <span style={{
      color: s.color, fontFamily: 'IBM Plex Mono', fontSize: 9,
      letterSpacing: '0.1em', border: `1px solid ${s.color}30`,
      backgroundColor: `${s.color}10`, padding: '2px 5px',
      textTransform: 'uppercase',
    }}>{status?.replace('_', ' ')}</span>
  )
}
