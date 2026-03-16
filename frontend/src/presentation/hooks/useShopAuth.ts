import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMutation, useQuery } from '@tanstack/react-query'
import shopApiClient from '../../infrastructure/api/shopClient'

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
    const { data } = await shopApiClient.post('/auth/shop-login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    return data
}

export function useShopAuth(options?: { onSuccess?: () => void }) {
    const { login, logout, user, isAuthenticated } = useShopAuthStore()

    const loginMutation = useMutation({
        mutationFn: shopLogin,
        onSuccess: (data) => {
            login(data.user, data.access_token)
            options?.onSuccess?.()
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
    const { data } = await shopApiClient.post('/auth/shop-register', payload)
    return data
}

export function useShopRegister() {
    return useMutation({ mutationFn: shopRegister })
}

// ── Individual modules catalogue (Fetched from Backend) ───────────────────────
// The backend returns separate docs for monthly/yearly. We aggregate them here.
export interface CatalogueModule {
    id: string
    name: string
    icon: string
    desc: string
    price: { monthly: number; yearly: number }
    features: string[]
}

// Icons and features are still best maintained on the frontend to keep the DB
// schema simple and strictly focused on billing/auth.
const MODULE_META: Record<string, { icon: string; features: string[] }> = {
    'job-cards': {
        icon: '🔧',
        features: ['Upload existing job cards', 'Create & fill new job cards', 'Job card form builder', 'Full history log'],
    },
    'inventory': {
        icon: '📦',
        features: ['Parts logging', 'Part request forms', 'Stock tracking', 'Supplier records'],
    },
    'crm': {
        icon: '👥',
        features: ['New customer profiles', 'Vehicle-to-owner assignment', 'Vehicle registration', 'Customer job card history'],
    },
    'invoicing': {
        icon: '🧾',
        features: ['Parts cost tracking', 'Revenue from job cards', 'Billing history', 'Financial overview'],
    },
    'employees': {
        icon: '👨‍🔧',
        features: ['Active & past employee records', 'Technician & non-technician tracking', 'Hours logging', 'Technician job card view'],
    },
    'global-db': {
        icon: '🌐',
        features: ['Cross-shop job card visibility', 'DVLA & VIN car registry', 'Work & parts history', 'Network-wide search'],
    },
}

export function useModulesCatalogue() {
    return useQuery({
        queryKey: ['catalogue', 'modules'],
        queryFn: async (): Promise<CatalogueModule[]> => {
            const { data } = await shopApiClient.get<any[]>('/subscriptions/')
            
            // Backend returns flat list: [ { subscription_id: "job-cards_monthly", price: 29, ... }, ... ]
            // We group by the base ID.
            const map = new Map<string, CatalogueModule>()

            data.forEach((sub: any) => {
                // Determine base ID (e.g. "job-cards" from "job-cards_monthly")
                const [baseId, period] = sub.subscription_id.split('_')
                if (!baseId || !period) return

                if (!map.has(baseId)) {
                    map.set(baseId, {
                        id: baseId,
                        name: sub.name,
                        icon: MODULE_META[baseId]?.icon ?? '🧩',
                        desc: sub.desc || 'No description provided.',
                        price: { monthly: 0, yearly: 0 },
                        features: MODULE_META[baseId]?.features ?? [],
                    })
                }

                const entry = map.get(baseId)!
                if (period === 'monthly') entry.price.monthly = sub.price
                if (period === 'yearly')  entry.price.yearly = sub.price
            })

            // Sort them in the original presentation order
            const order = ['job-cards', 'inventory', 'crm', 'invoicing', 'employees', 'global-db']
            return Array.from(map.values()).sort((a, b) => {
                const idxA = order.indexOf(a.id)
                const idxB = order.indexOf(b.id)
                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
            })
        },
        staleTime: 1000 * 60 * 60, // Data stays fresh for 1 hour
    })
}

// ── Composition rules for groups ──────────────────────────────────────────────
// • Any group with invoicing MUST include job-cards and inventory
// • Any group with global-db MUST include job-cards
export const MODULE_REQUIREMENTS: Record<string, string[]> = {
    'invoicing':  ['job-cards', 'inventory'],
    'global-db':  ['job-cards'],
}

// ── Preset module groups ──────────────────────────────────────────────────────
export interface ModuleGroup {
    id: string
    name: string
    icon: string
    desc: string
    moduleIds: string[]
    price: { monthly: number; yearly: number }
}

export const ALL_MODULE_GROUPS: ModuleGroup[] = [
    {
        id: 'shop-management-1',
        name: 'Shop Management 1',
        icon: '🏪',
        desc: 'The essential workshop bundle — job cards, billing, staff and parts all in one package.',
        moduleIds: ['job-cards', 'invoicing', 'employees', 'inventory'],
        price: { monthly: 89, yearly: 890 },
    },
    {
        id: 'job-card-management',
        name: 'Job Card Management',
        icon: '📋',
        desc: 'Manage and share job cards across the Mechanics-on-Wheels network via the Global Database.',
        moduleIds: ['job-cards', 'global-db'],
        price: { monthly: 55, yearly: 550 },
    },
    {
        id: 'vehicle-management',
        name: 'Vehicle Management',
        icon: '🚗',
        desc: 'Link customers to their vehicles and keep a complete service history with job cards.',
        moduleIds: ['crm', 'job-cards'],
        price: { monthly: 45, yearly: 450 },
    },
]
