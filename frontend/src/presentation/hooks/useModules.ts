import { useQuery } from '@tanstack/react-query'
import apiClient from '../../infrastructure/api/client'
import type { ActiveSub, AppModule } from '../../domain/types'

const MODULE_META: Record<string, { features: { label: string; icon: string }[]; routeKey: string }> = {
    'Job Card Management': {
        routeKey: 'job-cards',
        features: [
            { label: 'Create & track job cards', icon: '📋' },
            { label: 'Assign mechanics', icon: '👷' },
            { label: 'Offline sync', icon: '🔄' }
        ]
    },
    'Vehicle Registry': {
        routeKey: 'vehicles',
        features: [
            { label: 'VIN & plate lookup', icon: '🚗' },
            { label: 'Service history', icon: '📅' },
            { label: 'Owner management', icon: '👤' }
        ]
    },
    'Inventory Management': {
        routeKey: 'inventory',
        features: [
            { label: 'Parts stock tracking', icon: '🔧' },
            { label: 'Low-stock alerts', icon: '⚠️' },
            { label: 'Supplier ledger', icon: '🏭' }
        ]
    },
    'Analytics Dashboard': {
        routeKey: 'analytics',
        features: [
            { label: 'Revenue charts', icon: '📈' },
            { label: 'Mechanic productivity', icon: '⚡' },
            { label: 'GDP export feeds', icon: '🌍' }
        ]
    }
}

const DEFAULT_META = {
    routeKey: 'dashboard',
    features: [{ label: 'Core ERP features', icon: '⚙️' }]
}

export function useModules() {
    return useQuery({
        queryKey: ['modules', 'me'],
        queryFn: async () => {
            const { data } = await apiClient.get<ActiveSub[]>('/subscriptions/me')
            const modules: AppModule[] = data.map((sub) => {
                const meta = MODULE_META[sub.subscription.name] ?? DEFAULT_META
                return {
                    subscription: sub.subscription,
                    activeSince: sub.date_of_activation,
                    features: meta.features,
                    routeKey: meta.routeKey
                }
            })
            return modules
        },
        staleTime: 1000 * 60 * 5 // 5 min
    })
}
