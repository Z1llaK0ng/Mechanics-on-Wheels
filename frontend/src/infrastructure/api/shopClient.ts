import axios from 'axios'
import { useShopAuthStore } from '../../presentation/hooks/useShopAuth'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

const shopApiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

shopApiClient.interceptors.request.use((config) => {
    let token: string | null = null;
    
    // 1. First try Shop Auth Store
    try {
        const shopState = JSON.parse(localStorage.getItem('shop-auth') || '{}');
        token = shopState?.state?.token;
    } catch (e) {}

    // 2. Fallback to standard ERP Auth Store
    if (!token) {
        try {
            const authState = JSON.parse(localStorage.getItem('mow-auth') || '{}');
            token = authState?.state?.token;
        } catch (e) {}
    }

    if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

shopApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url ?? ''
        const isLoginEndpoint = url.includes('/auth/shop-login') || url.includes('/auth/login')

        if (error.response?.status === 401 && !isLoginEndpoint) {
            // Only auto-logout for authenticated requests that get a 401,
            // never for the login request itself (wrong password = 401 but should show error to user).
            useShopAuthStore.getState().logout()
            window.location.href = '/shop/login'
        }
        return Promise.reject(error)
    }
)

export default shopApiClient
