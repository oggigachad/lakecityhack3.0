import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'DASHBOARD', roles: ['admin'] },
  { path: '/incidents', label: 'INCIDENTS', roles: ['citizen', 'responder', 'admin'] },
  { path: '/report', label: 'REPORT', roles: ['citizen', 'responder', 'admin'] },
  { path: '/map', label: 'MAP', roles: ['citizen', 'responder', 'admin'] },
  { path: '/news', label: 'NEWS', roles: ['citizen', 'responder', 'admin'] },
  { path: '/schemes', label: 'SCHEMES', roles: ['citizen', 'responder', 'admin'] },
  { path: '/chatbot', label: 'CHATBOT', roles: ['citizen', 'responder', 'admin'] },
  { path: '/settings', label: 'SETTINGS', roles: ['citizen', 'responder', 'admin'] },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, isConnected } = useWebSocket()
  const [menuOpen, setMenuOpen] = useState(false)

  const newCount = messages.filter(m => m.type === 'new_incident').length
  const criticalCount = messages.filter(m => m.payload?.severity === 'CRITICAL').length

  const handleLogout = () => { logout(); navigate('/') }

  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role))

  return (
    <header style={{ backgroundColor: '#0A1628', borderBottom: '1px solid #1A2E4A' }}
      className="sticky top-0 z-50 w-full">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Brand */}
        <Link to={user?.role === 'admin' ? '/dashboard' : '/incidents'}
          className="flex items-center gap-3 no-underline">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, backgroundColor: '#C0392B' }}
              className="animate-pulse-dot" />
            <span style={{ color: '#F0F4F8', fontFamily: 'IBM Plex Mono', fontSize: 13,
              fontWeight: 500, letterSpacing: '0.08em' }}>
              TRI<span style={{ color: '#1E3A5F' }}>|</span>NETRA
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0">
          {visibleNav.map(item => (
            <Link key={item.path} to={item.path}
              style={{
                fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em',
                color: location.pathname === item.path ? '#F0F4F8' : '#B8C5D3',
                padding: '0 16px', height: 48, display: 'flex', alignItems: 'center',
                textDecoration: 'none',
                borderBottom: location.pathname === item.path ? '2px solid #1E3A5F' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}>
              {item.label}
              {item.path === '/incidents' && newCount > 0 && (
                <span style={{ marginLeft: 6, backgroundColor: '#C0392B', color: '#fff',
                  fontSize: 9, padding: '1px 5px', fontFamily: 'IBM Plex Mono', minWidth: 16,
                  textAlign: 'center' }}>
                  {newCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* WS status */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: isConnected ? '#27AE60' : '#C0392B',
            }} className={isConnected ? 'animate-pulse-dot' : ''} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9,
              color: isConnected ? '#27AE60' : '#C0392B', letterSpacing: '0.05em' }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Critical alerts badge */}
          {criticalCount > 0 && (
            <div style={{ backgroundColor: '#C0392B', color: '#fff',
              fontFamily: 'IBM Plex Mono', fontSize: 9, padding: '2px 6px',
              letterSpacing: '0.08em', animation: 'pulse-dot 1s infinite' }}>
              {criticalCount} CRITICAL
            </div>
          )}

          {/* Role pill */}
          <span style={{
            fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.1em',
            color: user?.role === 'admin' ? '#E67E22'
              : user?.role === 'responder' ? '#27AE60' : '#B8C5D3',
            border: `1px solid ${user?.role === 'admin' ? '#E67E22'
              : user?.role === 'responder' ? '#27AE60' : '#1A2E4A'}`,
            padding: '2px 6px', textTransform: 'uppercase',
          }}>
            {user?.role}
          </span>

          <button onClick={handleLogout}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, letterSpacing: '0.08em',
              color: '#B8C5D3', background: 'none', border: '1px solid #1A2E4A',
              padding: '4px 10px', cursor: 'pointer' }}
            className="hover:border-steel hover:text-white-muted transition-colors hidden sm:block">
            LOGOUT
          </button>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(o => !o)}
            className="md:hidden"
            style={{ background: 'none', border: 'none', color: '#B8C5D3', cursor: 'pointer',
              padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect y="2" width="18" height="1.5" /><rect y="8" width="18" height="1.5" />
              <rect y="14" width="18" height="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ borderTop: '1px solid #1A2E4A', backgroundColor: '#0F1E38' }}>
          {visibleNav.map(item => (
            <Link key={item.path} to={item.path}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '10px 16px',
                fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em',
                color: location.pathname === item.path ? '#F0F4F8' : '#B8C5D3',
                textDecoration: 'none', borderBottom: '1px solid #1A2E4A',
              }}>
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            style={{ width: '100%', textAlign: 'left', padding: '10px 16px',
              fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em',
              color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid #1A2E4A' }}>
            LOGOUT
          </button>
        </div>
      )}
    </header>
  )
}
