import { useMemo } from 'react'
import { useAuth as useAuthContext } from '../context/AuthContext'
import { api } from '../services/api'

function decodeJwt(token) {
    if (!token) return null
    try {
        const payload = token.split('.')[1]
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = atob(normalized)
        return JSON.parse(decoded)
    } catch {
        return null
    }
}

export function useAuth() {
    const auth = useAuthContext()
    const decodedToken = useMemo(() => decodeJwt(auth.token), [auth.token])

    const loginWithGoogle = async() => {
        const callbackUrl = `${window.location.origin}/oauth-callback`
        const res = await api.get('/auth/google', { params: { state: callbackUrl } })
        const authUrl = res.data?.auth_url
        if (!authUrl) throw new Error('Google OAuth URL not available')

        const popup = window.open(
            authUrl,
            'verisignal-google-oauth',
            'width=520,height=700,menubar=no,toolbar=no,status=no'
        )
        if (!popup) throw new Error('Popup blocked by browser')

        return new Promise((resolve, reject) => {
            const timer = setInterval(async() => {
                if (popup.closed) {
                    clearInterval(timer)
                    reject(new Error('Google login cancelled'))
                    return
                }

                try {
                    const url = new URL(popup.location.href)
                    if (url.origin !== window.location.origin || url.pathname !== '/oauth-callback') return

                    const accessToken = url.searchParams.get('access_token')
                    if (!accessToken) {
                        clearInterval(timer)
                        popup.close()
                        reject(new Error('Google login failed'))
                        return
                    }

                    clearInterval(timer)
                    popup.close()
                    const user = await auth.loginWithToken(accessToken)
                    resolve(user)
                } catch {
                    // Ignore cross-origin read errors until popup returns to frontend origin.
                }
            }, 500)
        })
    }

    return {...auth, decodedToken, loginWithGoogle }
}
