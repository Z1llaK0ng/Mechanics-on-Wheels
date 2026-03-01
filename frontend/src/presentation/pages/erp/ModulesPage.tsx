import { useModules } from '../../hooks/useModules'
import type { AppModule } from '../../../domain/types'

export default function ModulesPage() {
    const { data: modules, isLoading, isError } = useModules()

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>My Modules</h1>
                <p>Active subscription modules for your workshop</p>
            </div>

            {isLoading && (
                <div className="loading-state"><div className="spinner" /><span>Loading modules…</span></div>
            )}

            {isError && (
                <div className="card" style={{ color: 'var(--danger)', textAlign: 'center' }}>
                    Could not load modules. Make sure the backend is running.
                </div>
            )}

            {modules && modules.length === 0 && !isLoading && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No active modules</div>
                    <p className="text-sm">Contact your shop administrator to subscribe to modules.</p>
                </div>
            )}

            <div className="card-grid">
                {modules?.map((mod) => (
                    <ModuleInfoCard key={mod.subscription.subscription_id} mod={mod} />
                ))}
            </div>
        </div>
    )
}

function ModuleInfoCard({ mod }: { mod: AppModule }) {
    const since = new Date(mod.activeSince).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    })

    return (
        <div className="module-card">
            <div className="module-card-header">
                <div>
                    <div className="module-card-icon">📦</div>
                    <div className="module-card-title">{mod.subscription.name}</div>
                    <div className="module-card-period">{mod.subscription.payment_period} subscription</div>
                </div>
                <span className="badge badge-success">Active</span>
            </div>

            <div className="module-card-features">
                {mod.features.map(f => (
                    <div key={f.label} className="module-card-feature">
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                    </div>
                ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                Active since {since}
            </div>
        </div>
    )
}
