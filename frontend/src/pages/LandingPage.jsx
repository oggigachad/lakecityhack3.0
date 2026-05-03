import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../services/api'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger)

const RESEARCH_PAPERS = [
  { ref: "[1]", title: "Twitter as a Lifeline", authors: "Imran et al., AAAI 2016", note: "Disaster NLP classification — foundation for VeriAI crisis-type tagging" },
  { ref: "[2]", title: "RoBERTa: A Robustly Optimized BERT Pretraining", authors: "Liu et al., 2019", note: "Core model architecture powering VeriAI" },
  { ref: "[3]", title: "CrisisNLP: Annotated Crisis-Related Tweets", authors: "Imran et al., 2016", note: "NLP benchmark used to evaluate VeriAI performance" },
  { ref: "[4]", title: "Fake News Detection on Social Media", authors: "Shu et al., 2017", note: "VeriAI fake-report filtering methodology" },
  { ref: "[5]", title: "Web Scraping for Crisis Informatics", authors: "Purohit et al., 2018", note: "Justification for real-time India scraper pipeline" },
]

const FEATURES = [
  { code: "01", title: "VeriAI Analysis", desc: "Fine-tuned RoBERTa classifies severity, sentiment, and crisis type. Filters fake reports at inference time.", accent: '#C0392B' },
  { code: "02", title: "Live India Feed", desc: "Real-time scraping from NDMA, IMD, NDRF, GDACS, NDTV. New alerts surface every 5 minutes via APScheduler.", accent: '#27AE60' },
  { code: "03", title: "Geospatial Mapping", desc: "Leaflet dark-mode maps with incident clustering, severity-colored markers, and city-level location inference.", accent: '#E67E22' },
  { code: "04", title: "Role-Based Command", desc: "Three-tier access: Citizen → Responder → Admin. Immutable audit trail on every status change.", accent: '#2A4A72' },
  { code: "05", title: "WebSocket Broadcast", desc: "Instant push to all connected dashboards when a CRITICAL incident is detected or status changes.", accent: '#8A9BB0' },
  { code: "06", title: "Govt Schemes Portal", desc: "NDMA + MP SDMA schemes auto-populated and categorized. Always current via scraper cycle.", accent: '#1E3A5F' },
]

export default function LandingPage() {
  const { messages, isConnected } = useWebSocket()
  const [stats, setStats] = useState(null)
  const [liveCount, setLiveCount] = useState(0)
  const [feed, setFeed] = useState([])
  const [now, setNow] = useState(new Date())

  // GSAP refs
  const heroRef = useRef(null)
  const badgeRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const descRef = useRef(null)
  const ctasRef = useRef(null)
  const statsCardRef = useRef(null)
  const featuresRef = useRef(null)
  const researchRef = useRef(null)
  const footerRef = useRef(null)

  // Update clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch real stats from backend
  useEffect(() => {
    api.get('/incidents/stats/summary')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
  }, [])

  // Fetch real scraped feed for ticker
  useEffect(() => {
    api.get('/scraper/feed?limit=20')
      .then(r => {
        const items = r.data?.data || []
        setFeed(items)
      })
      .catch(() => setFeed([]))
  }, [])

  // Increment count from live WebSocket events
  useEffect(() => {
    const newOnes = messages.filter(m => m.type === 'new_incident').length
    setLiveCount(newOnes)
  }, [messages])

  // ── GSAP entrance animations ──────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero section timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(badgeRef.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.6 }
      )
      .fromTo(titleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7 },
        '-=0.3'
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.4'
      )
      .fromTo(descRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.3'
      )
      .fromTo(ctasRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.3'
      )
      .fromTo(statsCardRef.current,
        { opacity: 0, x: 40, scale: 0.97 },
        { opacity: 1, x: 0, scale: 1, duration: 0.7 },
        '-=0.7'
      )

      // Feature cards stagger on scroll
      if (featuresRef.current) {
        gsap.fromTo(
          featuresRef.current.querySelectorAll('.feature-card'),
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.55, stagger: 0.1,
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            }
          }
        )
      }

      // Research papers stagger on scroll
      if (researchRef.current) {
        gsap.fromTo(
          researchRef.current.querySelectorAll('.research-row'),
          { opacity: 0, x: -24 },
          {
            opacity: 1, x: 0, duration: 0.45, stagger: 0.08,
            scrollTrigger: {
              trigger: researchRef.current,
              start: 'top 88%',
              toggleActions: 'play none none none',
            }
          }
        )
      }

      // Footer fade
      if (footerRef.current) {
        gsap.fromTo(footerRef.current,
          { opacity: 0 },
          {
            opacity: 1, duration: 0.6,
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 95%',
            }
          }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  const totalIncidents = (stats?.total || 0) + liveCount
  const tickerItems = feed.length > 0
    ? [...feed, ...feed].map(f => f.raw_text?.slice(0, 120) || '')
    : []
  const sourceNames = [...new Set(feed.map((item) => item.source_name).filter(Boolean))]

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8' }}>

      {/* System bar */}
      <div style={{ backgroundColor: '#050E1A', borderBottom: '1px solid #1A2E4A', padding: '6px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#B8C5D3', letterSpacing: '0.1em' }}>
          TRINETRA v1.0 — LAKECITY HACK 3.0 — CRISIS MANAGEMENT PLATFORM
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isConnected ? '#27AE60' : '#E67E22' }}
              className={isConnected ? 'animate-pulse-dot' : ''} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#B8C5D3', letterSpacing: '0.08em' }}>
              {isConnected ? 'LIVE FEED ACTIVE' : 'CONNECTING...'}
            </span>
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#B8C5D3' }}>
            {now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST
          </span>
        </div>
      </div>

      {/* Ticker — real scraped data */}
      {tickerItems.length > 0 && (
        <div style={{ backgroundColor: '#C0392B', padding: '5px 0', overflow: 'hidden', borderBottom: '1px solid #922B21' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#922B21', padding: '0 12px', flexShrink: 0, fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#fff', whiteSpace: 'nowrap', height: 24, display: 'flex', alignItems: 'center' }}>
              LIVE ALERT
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="animate-ticker" style={{ display: 'flex', gap: 64, whiteSpace: 'nowrap' }}>
                {tickerItems.map((h, i) => (
                  <span key={i} style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#fff', letterSpacing: '0.04em' }}>
                    {h}
                    <span style={{ color: '#922B21', margin: '0 24px' }}>◆</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div ref={heroRef} style={{ padding: '60px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'start' }}>
          <div>
            <div ref={badgeRef} style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#1E3A5F', letterSpacing: '0.2em', marginBottom: 16, textTransform: 'uppercase', borderLeft: '2px solid #1E3A5F', paddingLeft: 12 }}>
              NATIONAL CRISIS RESPONSE SYSTEM — INDIA
            </div>
            <h1 ref={titleRef} style={{ fontFamily: 'IBM Plex Sans', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 300, color: '#F0F4F8', lineHeight: 1.1, margin: '0 0 8px' }}>
              TRI<span style={{ fontWeight: 600 }}>NETRA</span>
            </h1>
            <div ref={subtitleRef} style={{ fontFamily: 'IBM Plex Sans', fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 300, color: '#B8C5D3', marginBottom: 24, lineHeight: 1.5 }}>
              AI-Powered Crisis Incident Reporting &amp; Management Platform
            </div>
            <p ref={descRef} style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, color: '#8A9BB0', maxWidth: 560, lineHeight: 1.7, marginBottom: 32 }}>
              Aggregates real-time crisis data from NDMA, IMD, NDRF, and regional sources.
              VeriAI filters, classifies, and severity-ranks every incident before it reaches your command center.
            </p>
            <div ref={ctasRef} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" style={{ backgroundColor: '#1E3A5F', color: '#F0F4F8', padding: '10px 24px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid #2A4A72' }}>
                ACCESS PLATFORM →
              </Link>
              <Link to="/login" style={{ backgroundColor: 'transparent', color: '#B8C5D3', padding: '10px 24px', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid #1A2E4A' }}>
                SIGN IN
              </Link>
            </div>
          </div>

          {/* Live Stats — real API data */}
          <div ref={statsCardRef} style={{ minWidth: 220, backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#B8C5D3', letterSpacing: '0.1em' }}>SYSTEM STATUS</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isConnected ? '#27AE60' : '#E67E22' }}
                  className={isConnected ? 'animate-pulse-dot' : ''} />
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: isConnected ? '#27AE60' : '#E67E22', letterSpacing: '0.08em' }}>
                  {isConnected ? 'OPERATIONAL' : 'CONNECTING'}
                </span>
              </div>
            </div>
              {[
                { label: 'INCIDENTS TRACKED', value: stats ? totalIncidents.toLocaleString() : '—', color: '#F0F4F8' },
                { label: 'ACTIVE / OPEN', value: stats ? stats.open.toString() : '—', color: '#E67E22' },
                { label: 'CRITICAL', value: stats ? stats.critical.toString() : '—', color: '#C0392B' },
                { label: 'LIVE SOURCES', value: sourceNames.length ? sourceNames.length.toString() : '—', color: '#27AE60' },
                { label: 'WEBSOCKET EVENTS', value: liveCount.toString(), color: '#B8C5D3' },
              ].map(stat => (
              <div key={stat.label} style={{ padding: '10px 16px', borderBottom: '1px solid #1A2E4A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.08em' }}>{stat.label}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: stat.color, fontWeight: 500 }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto 0', padding: '0 24px' }}>
        <div style={{ height: 1, backgroundColor: '#1A2E4A' }} />
      </div>

      {/* PLATFORM CAPABILITIES — Framer Motion cards */}
      <FeatureSection featuresRef={featuresRef} />

      {/* DATA SOURCES — Framer Motion tags */}
      <DataSourcesSection sourceNames={sourceNames} />

      {/* RESEARCH FOUNDATION — Framer Motion rows */}
      <ResearchSection researchRef={researchRef} />

      {/* Footer */}
      <div ref={footerRef} style={{ borderTop: '1px solid #1A2E4A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.08em' }}>
          TRINETRA — LAKECITY HACK 3.0
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F' }}>
          BUILT FOR INDIA. POWERED BY AI.
        </span>
      </div>
    </div>
  )
}

// ── Framer Motion sub-components ──────────────────────────────────────────────

function FeatureSection({ featuresRef }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09 } },
  }
  const card = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <div ref={featuresRef} style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F', letterSpacing: '0.2em', marginBottom: 24 }}>
        — PLATFORM CAPABILITIES
      </div>
      <motion.div
        ref={ref}
        variants={container}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, border: '1px solid #1A2E4A' }}
      >
        {FEATURES.map(f => (
          <motion.div
            key={f.code}
            variants={card}
            whileHover={{ backgroundColor: '#162840', borderColor: f.accent || '#2A4A72', y: -2 }}
            style={{
              backgroundColor: '#0F1E38',
              borderRight: '1px solid #1A2E4A',
              borderBottom: '1px solid #1A2E4A',
              borderTop: '2px solid transparent',
              padding: '22px',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Accent top bar on hover */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                backgroundColor: f.accent || '#1E3A5F',
                transformOrigin: 'left',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: f.accent || '#1E3A5F', letterSpacing: '0.1em' }}>
                {f.code}
              </span>
              <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 500, color: '#F0F4F8' }}>
                {f.title}
              </span>
            </div>
            <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A9BB0', lineHeight: 1.65, margin: 0 }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

function DataSourcesSection({ sourceNames }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  }
  const tag = {
    hidden: { opacity: 0, scale: 0.85 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  }

  const STATIC_SOURCES = ['NDMA', 'IMD', 'NDRF', 'GDACS', 'NDTV Crisis']
  const display = sourceNames.length > 0 ? sourceNames : STATIC_SOURCES

  return (
    <div style={{ backgroundColor: '#050E1A', borderTop: '1px solid #1A2E4A', borderBottom: '1px solid #1A2E4A', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.2em', marginBottom: 16 }}>
          DATA SOURCES — INDIA
        </div>
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {display.map(s => (
            <motion.span
              key={s}
              variants={tag}
              whileHover={{
                backgroundColor: '#1E3A5F',
                borderColor: '#2A4A72',
                color: '#F0F4F8',
              }}
              style={{
                fontFamily: 'IBM Plex Mono', fontSize: 10,
                letterSpacing: '0.1em', color: '#B8C5D3',
                border: '1px solid #1A2E4A', backgroundColor: '#0A1628',
                padding: '5px 14px', cursor: 'default',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#27AE60', display: 'inline-block', flexShrink: 0 }} />
              {s}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

function ResearchSection({ researchRef }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={researchRef} style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#1E3A5F', letterSpacing: '0.2em' }}>
          — RESEARCH FOUNDATION
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          style={{ flex: 1, height: 1, backgroundColor: '#1A2E4A', transformOrigin: 'left' }}
        />
      </div>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {RESEARCH_PAPERS.map((p, i) => (
          <motion.div
            key={p.ref}
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.45, delay: i * 0.1, ease: 'easeOut' }}
            whileHover={{ backgroundColor: '#162840', x: 4 }}
            style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr',
              gap: 16, padding: '14px 16px',
              backgroundColor: '#0F1E38',
              borderBottom: '1px solid #1A2E4A',
              borderLeft: '2px solid transparent',
              alignItems: 'start', cursor: 'default',
            }}
          >
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#1E3A5F', paddingTop: 2, fontWeight: 600 }}>
              {p.ref}
            </span>
            <div>
              <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#F0F4F8', marginBottom: 4, fontWeight: 500 }}>
                {p.title}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.04em' }}>
                {p.authors}
              </div>
            </div>
            <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 11, color: '#8A9BB0', lineHeight: 1.6, borderLeft: '1px solid #1A2E4A', paddingLeft: 16 }}>
              {p.note}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
