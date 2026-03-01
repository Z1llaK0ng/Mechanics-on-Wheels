import { useState } from 'react'
import { useShopAuthStore, ALL_MODULES } from '../../hooks/useShopAuth'

// Mock mechanic data — replace with API call
const MOCK_MECHANICS = [
    { id: 'm1', name: 'Kwame Asante', email: 'kwame@workshop.gh' },
    { id: 'm2', name: 'Ama Boateng', email: 'ama@workshop.gh' },
    { id: 'm3', name: 'Kofi Mensah', email: 'kofi@workshop.gh' },
    { id: 'm4', name: 'Abena Osei', email: 'abena@workshop.gh' },
]

export default function ShopSubscriptionPage() {
    const user = useShopAuthStore((s) => s.user)
    const activeIds = new Set(user?.subscribedModules ?? [])
    const activeMods = ALL_MODULES.filter(m => activeIds.has(m.id))

    // mechanic access: moduleId → Set of mechanic IDs with access
    const [access, setAccess] = useState<Record<string, Set<string>>>(() =>
        Object.fromEntries(activeMods.map(m => [m.id, new Set(MOCK_MECHANICS.map(mec => mec.id))]))
    )

    const toggleAccess = (moduleId: string, mechanicId: string) => {
        setAccess(prev => {
            const s = new Set(prev[moduleId] ?? [])
            s.has(mechanicId) ? s.delete(mechanicId) : s.add(mechanicId)
            return { ...prev, [moduleId]: s }
        })
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Subscriptions</h1>
                <p>Manage active modules and mechanic access</p>
            </div>

            {activeMods.length === 0 ? (
                <div className="loading-state">
                    <span style={{ fontSize: 40 }}>📦</span>
                    <p>No active subscriptions yet.</p>
                    <a href="/shop/marketplace" className="btn btn-primary">Browse Marketplace</a>
                </div>
            ) : activeMods.map(mod => (
                <div key={mod.id} className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 28 }}>{mod.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{mod.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active subscription</div>
                            </div>
                        </div>
                        <span className="badge badge-success">Active</span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Mechanic Access
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {MOCK_MECHANICS.map(mec => {
                            const hasAccess = access[mod.id]?.has(mec.id) ?? false
                            return (
                                <div key={mec.id} className="shop-mechanic-row">
                                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                        {mec.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{mec.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{mec.email}</div>
                                    </div>
                                    <label className="shop-toggle">
                                        <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            onChange={() => toggleAccess(mod.id, mec.id)}
                                        />
                                        <span className="shop-toggle-slider" />
                                    </label>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
