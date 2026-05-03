import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, chatApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SAMPLE_QS = [
  "What to do during a flood warning?",
  "How does VeriAI classify severity?",
  "NDMA schemes for flood victims?",
  "How to report an incident?",
]

export default function VeriAIChatbot() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    {
      role: 'assistant',
      text: 'VeriAI online. I can assist with crisis protocols, incident analysis, and government relief schemes. How can I help?',
      ts: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', text: text.trim(), ts: Date.now() }
    const updatedMsgs = [...msgs, userMsg]
    setMsgs(updatedMsgs)
    setInput('')
    setLoading(true)

    try {
      // Build conversation history for Claude (exclude the greeting)
      const history = updatedMsgs
        .filter((_, i) => i > 0) // skip system greeting
        .map(m => ({ role: m.role, content: m.text }))

      const res = await chatApi.post('/veri/chat', { messages: history })
      let reply = res.data.reply
      const model = res.data.model

      // Check for redirect tag
      const redirectMatch = reply.match(/^\[REDIRECT:(.*?)\]\s*/)
      if (redirectMatch) {
        const path = redirectMatch[1]
        reply = reply.replace(/^\[REDIRECT:(.*?)\]\s*/, '')
        
        if (path === 'LOGOUT') {
          logout()
          navigate('/login')
        } else {
          navigate(path)
        }
        setOpen(false) // Close chatbot on redirect
      }

      setMsgs(p => [...p, {
        role: 'assistant',
        text: reply,
        model,
        ts: Date.now()
      }])
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      let errorMsg = '⚠️ Connection error. Please try again.'
      if (status === 401) errorMsg = '⚠️ Session expired. Please log in again.'
      else if (status === 502) errorMsg = `⚠️ VeriAI LLM unavailable: ${detail || 'KodeKloud API unreachable'}`
      else if (err.code === 'ECONNABORTED') errorMsg = '⚠️ Request timed out. Claude may be slow — please retry.'
      setMsgs(p => [...p, { role: 'assistant', text: errorMsg, ts: Date.now() }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 52, height: 52, border: '1px solid #2A4A72',
          backgroundColor: open ? '#1E3A5F' : '#0F1E38',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 2,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#F0F4F8', letterSpacing: '0.04em' }}>
          {open ? '✕' : 'AI'}
        </span>
        {!open && (
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 7, color: '#8A9BB0', letterSpacing: '0.04em' }}>
            VERI
          </span>
        )}
        {!open && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute', top: -3, right: -3,
              width: 9, height: 9, borderRadius: '50%',
              backgroundColor: '#27AE60',
            }}
          />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', bottom: 88, right: 24, zIndex: 199,
              width: 380, backgroundColor: '#0F1E38',
              border: '1px solid #1A2E4A',
              display: 'flex', flexDirection: 'column', maxHeight: 520,
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid #1A2E4A',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#050E1A',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#27AE60' }}
                />
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#F0F4F8', letterSpacing: '0.08em' }}>
                  VERI AI
                </span>
                <span style={{
                  fontFamily: 'IBM Plex Mono', fontSize: 7, color: '#1E3A5F',
                  letterSpacing: '0.06em', border: '1px solid #1A2E4A',
                  padding: '1px 5px', marginLeft: 4,
                }}>
                  LLM ENGINE
                </span>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', letterSpacing: '0.08em' }}>
                CRISIS DOMAIN
              </span>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <AnimatePresence initial={false}>
                {msgs.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '88%', padding: '9px 12px',
                      backgroundColor: m.role === 'user' ? '#1E3A5F' : '#0A1628',
                      border: `1px solid ${m.role === 'user' ? '#2A4A72' : '#1A2E4A'}`,
                      fontFamily: 'IBM Plex Sans', fontSize: 11.5,
                      color: '#F0F4F8', lineHeight: 1.65, whiteSpace: 'pre-wrap',
                    }}>
                      {m.text}
                    </div>
                    {m.model && (
                      <div style={{
                        fontFamily: 'IBM Plex Mono', fontSize: 8,
                        color: '#1E3A5F', marginTop: 3, letterSpacing: '0.06em',
                      }}>
                        {m.model}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', gap: 5, padding: '6px 0' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.9, delay, repeat: Infinity }}
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: '#1E3A5F',
                      }}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            {msgs.length === 1 && (
              <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SAMPLE_QS.map((q, i) => (
                  <motion.button
                    key={i}
                    onClick={() => send(q)}
                    whileHover={{ backgroundColor: '#1E3A5F', borderColor: '#2A4A72' }}
                    style={{
                      fontFamily: 'IBM Plex Sans', fontSize: 10, color: '#B8C5D3',
                      backgroundColor: '#0A1628', border: '1px solid #1A2E4A',
                      padding: '4px 9px', cursor: 'pointer', transition: 'none',
                    }}
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ borderTop: '1px solid #1A2E4A', display: 'flex', backgroundColor: '#050E1A' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                }}
                placeholder="Ask about crisis protocols..."
                style={{
                  flex: 1, backgroundColor: 'transparent', border: 'none',
                  outline: 'none', padding: '10px 14px',
                  fontFamily: 'IBM Plex Sans', fontSize: 11,
                  color: '#F0F4F8', caretColor: '#27AE60',
                }}
              />
              <motion.button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                whileHover={{ backgroundColor: '#1E3A5F' }}
                whileTap={{ scale: 0.9 }}
                style={{
                  padding: '0 16px', backgroundColor: 'transparent', border: 'none',
                  borderLeft: '1px solid #1A2E4A', cursor: 'pointer',
                  color: input.trim() ? '#F0F4F8' : '#8A9BB0',
                  fontFamily: 'IBM Plex Mono', fontSize: 13,
                }}
              >
                →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
