import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('vs_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { setToken(null); localStorage.removeItem('vs_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, user } = res.data
    localStorage.setItem('vs_token', access_token)
    setToken(access_token)
    setUser(user)
    return user
  }

  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role })
    const { access_token, user } = res.data
    localStorage.setItem('vs_token', access_token)
    setToken(access_token)
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('vs_token')
    setToken(null)
    setUser(null)
  }

  const loginWithToken = async (accessToken, userHint = null) => {
    localStorage.setItem('vs_token', accessToken)
    setToken(accessToken)
    if (userHint) {
      setUser(userHint)
      return userHint
    }
    const res = await api.get('/auth/me')
    setUser(res.data)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
