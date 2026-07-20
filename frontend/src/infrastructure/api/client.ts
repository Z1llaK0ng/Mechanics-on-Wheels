import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useShopAuthStore } from '../../presentation/hooks/useShopAuth'

const getBaseUrl = () => {
    let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim().replace(/\/+$/, '')
    if (!url.endsWith('/api/v1')) {
        url = `${url}/api/v1`
    }
    return url
}

const BASE_URL = getBaseUrl()

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' }
})

// ─── Request interceptor: attach JWT ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
    // Skip if token is already explicitly provided
    if (config.headers.Authorization) {
        return config
    }

    let token = useAuthStore.getState().token
    if (!token) {
        token = useShopAuthStore.getState().token
    }
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Response interceptor: handle 401 → logout ───────────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url ?? ''
        const isLoginEndpoint = url.includes('/auth/login') || url.includes('/auth/shop-login')

        if (error.response?.status === 401 && !isLoginEndpoint) {
            if (window.location.pathname.startsWith('/shop')) {
                useShopAuthStore.getState().logout()
                window.location.href = '/shop/login'
            } else {
                useAuthStore.getState().logout()
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default apiClient
