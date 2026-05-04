import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMutation, useQuery } from '@tanstack/react-query'
import shopApiClient from '../../infrastructure/api/shopClient'
import { useAuthStore } from '../../infrastructure/store/authStore'

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
    /** modules permitted for the mechanic */
    permittedModules?: string[]
    /** 'technician' | 'staff' — only set for mechanic-scoped logins */
    staffrole?: string
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
            logout: () => {
                set({ user: null, token: null, isAuthenticated: false })
                // Also clear standard ERP auth store if logging out of shop
                useAuthStore.getState().logout()
            },
        }),
        {
            name: 'shop-auth',
            // Explicitly list what to persist so reloads always restore full state.
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
            // Re-derive isAuthenticated from token on rehydration for safety.
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isAuthenticated = !!state.token
                }
            },
        }
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

export function useShopAuth(options?: { onSuccess?: (data: any) => void }) {
    const { login, logout, user, isAuthenticated } = useShopAuthStore()

    const loginMutation = useMutation({
        mutationFn: shopLogin,
        onSuccess: (data) => {
            login(data.user, data.access_token)
            
            // If it's a mechanic, also sync the standard ERP 'useAuthStore'
            // so they don't hit the PrivateRoute guard and get redirected back out.
            if (data.user.role === 'mechanic') {
                const nameParts = data.user.name.split(' ')
                const fn = nameParts[0] || 'Unknown'
                const ln = nameParts.slice(1).join(' ') || 'User'
                
                // Have to cast through any or omit role if Mechanic type doesn't have it,
                // but we map the correct payload to fulfill the ERP Mechanic interface:
                useAuthStore.getState().login(data.access_token, {
                    id: data.user.id,
                    first_name: fn,
                    last_name: ln,
                    email: data.user.email,
                    shop_id: data.user.shopId,
                    active_status: true,
                    // Note: 'role' is not in the Mechanic UI type, but we pass what's needed
                } as any)
            }
            
            options?.onSuccess?.(data)
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
    'search': {
        icon: '🔍',
        features: ['Advanced search capabilities', 'Cross-module search', 'Quick retrieval of vehicles & customers', 'Global and local queries'],
    },
    'shop-map': {
        icon: '🗺️',
        features: ['Interactive geographical map', 'Visualize shop locations', 'Customer distribution view', 'Route planning basics'],
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
            const order = ['job-cards', 'inventory', 'crm', 'invoicing', 'employees', 'global-db', 'search', 'shop-map']
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

// ── Module route mapping ──────────────────────────────────────────────────────
export const MODULE_ROUTES: Record<string, string> = {
    'job-cards': '/shop/m/job-cards',
    'inventory': '/shop/m/inventory',
    'invoicing': '/shop/m/invoicing',
    'crm': '/shop/m/crm',
    'employees': '/shop/m/employees',
    'global-db': '/shop/m/global-db',
    'search': '/shop/m/search',
    'shop-map': '/shop/m/shop-map'
}

// ── Preset module groups ──────────────────────────────────────────────────────
export interface ModuleGroup {
    id: string
    name: string
    icon: string
    desc: string
    moduleIds: string[]
    price: { monthly: number; yearly: number }
    shopId?: string
}

export function useModuleGroups(shopId?: string) {
    return useQuery({
        queryKey: ['catalogue', 'module-groups', shopId],
        queryFn: async (): Promise<ModuleGroup[]> => {
            if (!shopId) return []
            const { data } = await shopApiClient.get<any[]>(`/shops/${shopId}/module-groups`)
            return data.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                desc: g.desc,
                moduleIds: g.moduleIds,
                price: g.price,
                shopId: g.shop_id
            }))
        },
        enabled: !!shopId,
        staleTime: 1000 * 60 * 5,
    })
}

export function useCreateModuleGroup() {
    return useMutation({
        mutationFn: async (params: { shopId: string, payload: any }) => {
            const { data } = await shopApiClient.post(`/shops/${params.shopId}/module-groups`, params.payload)
            return data
        }
    })
}
