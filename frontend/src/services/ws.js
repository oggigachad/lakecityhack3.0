const WS_URL =
    import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

class WebSocketService {
    constructor() {
        this.socket = null
        this.path = '/ws/incidents'
    }

    connect(path = '/ws/incidents') {
            if (this.socket && this.socket.readyState !== WebSocket.CLOSED && this.path === path) {
                return this.socket
            }
            this.path = path
            const token = localStorage.getItem('vs_token')
            const url = `${WS_URL}${path}${token ? `?token=${token}` : ''}`
    this.socket = new WebSocket(url)
    return this.socket
  }

  close() {
    if (this.socket) this.socket.close()
    this.socket = null
  }
}

export const wsClient = new WebSocketService()