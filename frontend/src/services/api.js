import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Long-timeout instance for LLM chat calls
export const chatApi = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// Attach JWT to all instances
const attachToken = config => {
  const token = localStorage.getItem('vs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}
api.interceptors.request.use(attachToken)
chatApi.interceptors.request.use(attachToken)

// Handle 401 globally on both instances
const handle401 = err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('vs_token')
    window.location.href = '/login'
  }
  return Promise.reject(err)
}
api.interceptors.response.use(res => res, handle401)
chatApi.interceptors.response.use(res => res, handle401)
