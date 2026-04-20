import axios from 'axios'
import { useShopAuthStore } from '../../presentation/hooks/useShopAuth'
import { useAuthStore } from '../store/authStore'

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
        if (error.response?.status === 401) {
            console.error('[ShopClient] 401 Unauthorized hit! URL:', error.response?.config?.url);
            // Temporarily disabled logout to trace the bug
            // useShopAuthStore.getState().logout()
        }
        return Promise.reject(error)
    }
)

export default shopApiClient

