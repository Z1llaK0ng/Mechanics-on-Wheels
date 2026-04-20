import { useQuery } from '@tanstack/react-query'
import apiClient from '../../infrastructure/api/client'
import type { ActiveSub, AppModule } from '../../domain/types'

const MODULE_META: Record<string, { shortName: string; icon: string; features: { label: string; icon: string }[]; routeKey: string }> = {
    'Job Card Management': {
        shortName: 'Job Cards',
        icon: '🔧',
        routeKey: 'job-cards',
        features: [
            { label: 'Create & track job cards', icon: '📋' },
            { label: 'Assign mechanics', icon: '👷' },
            { label: 'Offline sync', icon: '🔄' }
        ]
    },
    'Vehicle Registry': {
        shortName: 'Vehicles',
        icon: '🚗',
        routeKey: 'vehicles',
        features: [
            { label: 'VIN & plate lookup', icon: '🚗' },
            { label: 'Service history', icon: '📅' },
            { label: 'Owner management', icon: '👤' }
        ]
    },
    'Inventory Management': {
        shortName: 'Inventory',
        icon: '🔧',
        routeKey: 'inventory',
        features: [
            { label: 'Parts stock tracking', icon: '🔧' },
            { label: 'Low-stock alerts', icon: '⚠️' },
            { label: 'Supplier ledger', icon: '🏭' }
        ]
    },
    'Analytics Dashboard': {
        shortName: 'Analytics',
        icon: '📈',
        routeKey: 'analytics',
        features: [
            { label: 'Revenue charts', icon: '📈' },
            { label: 'Mechanic productivity', icon: '⚡' },
            { label: 'GDP export feeds', icon: '🌍' }
        ]
    },
    'Global Database': {
        shortName: 'Global DB',
        icon: '🌐',
        routeKey: 'global-db',
        features: [
            { label: 'Cross-shop job card visibility', icon: '🔍' },
            { label: 'DVLA & VIN car registry', icon: '🚗' },
            { label: 'Work & parts history', icon: '📋' },
            { label: 'Network-wide search', icon: '🔗' }
        ]
    },
    'Customer Relationships': {
        shortName: 'CRM',
        icon: '👥',
        routeKey: 'crm',
        features: [
            { label: 'Customer management', icon: '👤' },
            { label: 'Vehicle assignment', icon: '🚗' },
            { label: 'Job card notifications', icon: '📋' }
        ]
    }
}



export function useModules() {
    return useQuery({
        queryKey: ['modules', 'me'],
        queryFn: async () => {
            const { data } = await apiClient.get<ActiveSub[]>('/subscriptions/me')
            const modules: AppModule[] = data.map((sub) => {
                const meta = MODULE_META[sub.subscription.name]
                return {
                    subscription: sub.subscription,
                    activeSince: sub.date_of_activation,
                    features: meta ? meta.features : [],
                    routeKey: meta ? meta.routeKey : sub.subscription.name.toLowerCase().replace(/\s+/g, '-'),
                    icon: meta ? meta.icon : '📦',
                    shortName: meta ? meta.shortName : sub.subscription.name
                }
            })
            return modules
        },
        staleTime: 1000 * 30 // 30 seconds — keeps it snappy without hammering the API
    })
}
