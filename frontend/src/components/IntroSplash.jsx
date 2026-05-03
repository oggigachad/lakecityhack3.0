import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const BOOT_LINES = [
  'INITIALIZING TRINETRA v1.0 ...',
  'LOADING CRISIS MODULES ...',
  'CONNECTING TO LIVE FEEDS ...',
  'VERI-AI ENGINE READY.',
  'ALL SYSTEMS OPERATIONAL.',
]

export default function IntroSplash({ onComplete }) {
  const rootRef = useRef(null)
  const logoRef = useRef(null)
  const triRef = useRef(null)
  const netraRef = useRef(null)
  const taglineRef = useRef(null)
  const bootBoxRef = useRef(null)
  const linesContainerRef = useRef(null)
  const scanlineRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // Initial state
      gsap.set([triRef.current, netraRef.current, taglineRef.current, bootBoxRef.current], {
        opacity: 0
      })
      gsap.set(overlayRef.current, { scaleX: 0, transformOrigin: 'left center' })

      // Scanline flicker
      tl.fromTo(scanlineRef.current,
        { opacity: 0 },
        { opacity: 0.05, duration: 0.1, repeat: 5, yoyo: true }
      )

      // Logo reveal — TRI slides in from left, NETRA from right
      .fromTo(triRef.current,
        { opacity: 0, x: -60, letterSpacing: '0.5em' },
        { opacity: 1, x: 0, letterSpacing: '0.02em', duration: 0.9, ease: 'power4.out' },
        '-=0.1'
      )
      .fromTo(netraRef.current,
        { opacity: 0, x: 60, letterSpacing: '0.5em' },
        { opacity: 1, x: 0, letterSpacing: '0.02em', duration: 0.9, ease: 'power4.out' },
        '<'
      )
      // Tagline fades in
      .fromTo(taglineRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.2'
      )

      // Boot box slides up
      .fromTo(bootBoxRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 },
        '+=0.15'
      )

      // Type each boot line
      BOOT_LINES.forEach((line, i) => {
        tl.call(() => {
          if (!linesContainerRef.current) return
          const p = document.createElement('p')
          p.textContent = ''
          p.style.cssText = `
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px;
            color: #27AE60;
            letter-spacing: 0.05em;
            margin: 0 0 4px;
            white-space: nowrap;
          `
          linesContainerRef.current.appendChild(p)
          // Type character by character
          let charIdx = 0
          const typingInterval = setInterval(() => {
            p.textContent += line[charIdx]
            charIdx++
            if (charIdx >= line.length) clearInterval(typingInterval)
          }, 28)
        }, null, `+=0.12`)
      })

      // Hold, then wipe exit overlay
      tl.to({}, { duration: 0.45 })
        .fromTo(overlayRef.current,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }
        )
        // Fade out entire splash
        .to(rootRef.current,
          { opacity: 0, duration: 0.3, ease: 'power2.in' },
          '-=0.15'
        )
        .call(() => {
          if (onComplete) onComplete()
        })
    })

    return () => ctx.revert()
  }, [onComplete])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#020A14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'all',
      }}
    >
      {/* Scanline overlay */}
      <div
        ref={scanlineRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Corner brackets */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            width: 32,
            height: 32,
            [pos.includes('top') ? 'top' : 'bottom']: 24,
            [pos.includes('left') ? 'left' : 'right']: 24,
            borderTop: pos.includes('top') ? '1px solid #1E3A5F' : 'none',
            borderBottom: pos.includes('bottom') ? '1px solid #1E3A5F' : 'none',
            borderLeft: pos.includes('left') ? '1px solid #1E3A5F' : 'none',
            borderRight: pos.includes('right') ? '1px solid #1E3A5F' : 'none',
          }}
        />
      ))}

      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
        {/* Logo */}
        <div ref={logoRef} style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0 }}>
          <span
            ref={triRef}
            style={{
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: 'clamp(48px, 8vw, 80px)',
              fontWeight: 300,
              color: '#F0F4F8',
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            TRI
          </span>
          <span
            ref={netraRef}
            style={{
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: 'clamp(48px, 8vw, 80px)',
              fontWeight: 700,
              color: '#F0F4F8',
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            NETRA
          </span>
        </div>

        {/* Tagline */}
        <div
          ref={taglineRef}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#1E3A5F',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: 40,
          }}
        >
          AI-POWERED CRISIS INTELLIGENCE PLATFORM — INDIA
        </div>

        {/* Boot terminal */}
        <div
          ref={bootBoxRef}
          style={{
            width: 380,
            backgroundColor: '#050E1A',
            border: '1px solid #1A2E4A',
            padding: '14px 18px',
            textAlign: 'left',
          }}
        >
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            color: '#1E3A5F',
            letterSpacing: '0.15em',
            marginBottom: 10,
            borderBottom: '1px solid #1A2E4A',
            paddingBottom: 6,
          }}>
            BOOT SEQUENCE — TRINETRA OS v1.0
          </div>
          <div ref={linesContainerRef} style={{ minHeight: 96 }} />
          {/* Blinking cursor */}
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 12,
            backgroundColor: '#27AE60',
            animation: 'cursor-blink 0.8s step-end infinite',
            verticalAlign: 'middle',
          }} />
        </div>
      </div>

      {/* Wipe overlay (exit transition) */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#0A1628',
          zIndex: 10,
          transformOrigin: 'left center',
        }}
      />

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
