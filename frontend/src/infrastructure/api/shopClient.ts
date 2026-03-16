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
    const token = useShopAuthStore.getState().token
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
            useShopAuthStore.getState().logout()
        }
        return Promise.reject(error)
    }
)

export default shopApiClient

