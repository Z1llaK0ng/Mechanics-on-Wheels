import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMutation } from '@tanstack/react-query'
import apiClient from '../../infrastructure/api/client'

export type ShopRole = 'admin' | 'mechanic'

interface ShopUser {
    id: string
    name: string
    email: string
    role: ShopRole
    shopId: string
    shopName: string
    /** module IDs the shop has subscribed to */
    subscribedModules: string[]
}

interface ShopAuthState {
    user: ShopUser | null
    token: string | null
    isAuthenticated: boolean
    login: (user: ShopUser, token: string) => void
    logout: () => void
}

export const useShopAuthStore = create<ShopAuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        { name: 'shop-auth' }
    )
)

// ── Login mutation ────────────────────────────────────────────────────────────
interface LoginPayload { email: string; password: string; role: ShopRole; shopId?: string }

async function shopLogin(payload: LoginPayload) {
    const form = new URLSearchParams()
    form.append('username', payload.email)
    form.append('password', payload.password)
    form.append('scope', payload.role)
    if (payload.shopId) form.append('shop_id', payload.shopId)
    const { data } = await apiClient.post('/auth/shop-login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    return data
}

export function useShopAuth() {
    const { login, logout, user, isAuthenticated } = useShopAuthStore()

    const loginMutation = useMutation({
        mutationFn: shopLogin,
        onSuccess: (data) => {
            login(data.user, data.access_token)
        }
    })

    return { loginMutation, logout, user, isAuthenticated }
}

// ── Register mutation ─────────────────────────────────────────────────────────
interface RegisterPayload {
    shop_name: string
    location: string
    email: string
    password: string
}

async function shopRegister(payload: RegisterPayload) {
    const { data } = await apiClient.post('/auth/shop-register', payload)
    return data
}

export function useShopRegister() {
    return useMutation({ mutationFn: shopRegister })
}

// ── Mock modules catalogue (replace with API call when backend is ready) ──────
export const ALL_MODULES = [
    { id: 'job-cards', name: 'Job Cards', icon: '🔧', desc: 'Track repairs, parts and labour.', price: { monthly: 29, yearly: 290 } },
    { id: 'vehicles', name: 'Vehicle Registry', icon: '🚗', desc: 'Full VIN + owner CRM database.', price: { monthly: 19, yearly: 190 } },
    { id: 'inventory', name: 'Parts Inventory', icon: '📦', desc: 'Stock levels, reorder alerts, suppliers.', price: { monthly: 24, yearly: 240 } },
    { id: 'invoicing', name: 'Invoicing', icon: '🧾', desc: 'Generate and send customer invoices.', price: { monthly: 19, yearly: 190 } },
    { id: 'analytics', name: 'Analytics', icon: '📊', desc: 'Revenue, trends and performance reports.', price: { monthly: 34, yearly: 340 } },
    { id: 'pwa', name: 'Mobile PWA', icon: '📱', desc: 'Offline-ready mobile app for mechanics.', price: { monthly: 9, yearly: 90 } },
]
