import { useNavigate } from 'react-router-dom'
import { useShopAuthStore, useModulesCatalogue } from '../../hooks/useShopAuth'

export default function MechanicModulesPage() {
    const user = useShopAuthStore((s) => s.user)
    const navigate = useNavigate()
    const activeIds = new Set(user?.subscribedModules ?? [])
    const { data: catalogue = [], isLoading } = useModulesCatalogue()
    const accessibleMods = catalogue.filter((m: any) => activeIds.has(m.id))

    // Module → ERP route mapping
    // NOTE: Some modules (inventory, invoicing, analytics) don't have dedicated ERP routes yet,
    // so they currently point to the modules overview instead of a non-existent path.
    const moduleRoutes: Record<string, string> = {
        'job-cards': '/job-cards',
        'vehicles': '/vehicles',
        'inventory': '/modules',
        'invoicing': '/modules',
        'analytics': '/modules',
        'pwa': '/download-pwa',
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Provided Modules</h1>
                <p>Tap a module to open it</p>
            </div>

            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading available modules...
                </div>
            ) : accessibleMods.length === 0 ? (
                <div className="loading-state">
                    <span style={{ fontSize: 48 }}>🔒</span>
                    <p style={{ fontWeight: 600 }}>No modules available</p>
                    <p style={{ fontSize: 13 }}>Your shop admin hasn't subscribed to any modules yet.</p>
                </div>
            ) : (
                <div className="mechanic-module-grid">
                    {accessibleMods.map((mod: any) => (
                        <button
                            key={mod.id}
                            className="mechanic-module-tile"
                            onClick={() => navigate(moduleRoutes[mod.id] ?? '/')}
                        >
                            <span className="mechanic-module-tile-icon">{mod.icon}</span>
                            <span className="mechanic-module-tile-name">{mod.name}</span>
                            <span className="mechanic-module-tile-desc">{mod.desc}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="card" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 24 }}>🏪</span>
                <div>
                    <div style={{ fontWeight: 600 }}>{user?.shopName ?? 'Your Shop'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {accessibleMods.length} module{accessibleMods.length !== 1 ? 's' : ''} available
                    </div>
                </div>
            </div>
        </div>
    )
}
