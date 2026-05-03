import VeriAIChatbot from '../components/VeriAIChatbot'

export default function ChatbotPage() {
  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', color: '#F0F4F8', padding: '24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ border: '1px solid #1A2E4A', backgroundColor: '#0F1E38', padding: '18px 20px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8A9BB0', letterSpacing: '0.14em', marginBottom: 8 }}>
            VERI AI ASSISTANT
          </div>
          <h2 style={{ fontFamily: 'IBM Plex Sans', fontSize: 20, fontWeight: 400, margin: '0 0 8px' }}>
            Crisis Guidance Console
          </h2>
          <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#8A9BB0', lineHeight: 1.6, margin: 0 }}>
            Use the floating assistant to query response protocols, scheme eligibility, and incident interpretation.
          </p>
        </div>
      </div>
      <VeriAIChatbot />
    </div>
  )
}
