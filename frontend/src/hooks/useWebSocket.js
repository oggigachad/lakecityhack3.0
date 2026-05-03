import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

const MIN_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000

export function useWebSocket(path = '/ws/incidents') {
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectDelay = useRef(MIN_RECONNECT_MS)
  const reconnectTimer = useRef(null)
  const heartbeatTimer = useRef(null)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    if (unmounted.current) return

    const token = localStorage.getItem('vs_token')
    const url = `${WS_URL}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (unmounted.current) { ws.close(); return }
        setIsConnected(true)
        // Reset backoff on successful connect
        reconnectDelay.current = MIN_RECONNECT_MS

        // Heartbeat ping every 25s
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 25000)
      }

      ws.onmessage = (e) => {
        if (unmounted.current) return
        try {
          const data = JSON.parse(e.data)
          if (data !== 'pong') {
            setMessages(prev => [data, ...prev].slice(0, 200))
          }
        } catch {
          // Ignore non-JSON messages (e.g. 'pong')
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        clearInterval(heartbeatTimer.current)

        if (unmounted.current) return

        // Exponential backoff: 1s → 2s → 4s → ... → 30s max
        const delay = reconnectDelay.current
        reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_MS)

        console.debug(`[WS] Closed (code=${event.code}). Reconnecting in ${delay}ms...`)
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = (err) => {
        console.debug('[WS] Error:', err)
        ws.close()
      }
    } catch (err) {
      console.debug('[WS] Failed to create connection:', err)
      if (!unmounted.current) {
        const delay = reconnectDelay.current
        reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_MS)
        reconnectTimer.current = setTimeout(connect, delay)
      }
    }
  }, [path])

  useEffect(() => {
    unmounted.current = false
    connect()

    return () => {
      unmounted.current = true
      clearTimeout(reconnectTimer.current)
      clearInterval(heartbeatTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // Prevent reconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }, [])

  return { messages, isConnected, send }
}