import { useState } from 'react'
import { useModules } from '../../hooks/useModules'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import type { AppModule } from '../../../domain/types'

export default function ModulesPage() {
    const { data: modules, isLoading, isError } = useModules()
    const { canInstall, isInstalled, isInstalling, triggerInstall } = usePWAInstall()
    const [showModal, setShowModal] = useState(false)

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>My Modules</h1>
                        <p>Active subscription modules for your workshop</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                        📱 Download App
                    </button>
                </div>
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

            {/* PWA Download Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <span className="modal-title">📱 Download App</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-form" style={{ padding: '24px 20px' }}>
                            {isInstalled ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>App Already Installed</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>You can open "CarrySpanner" from your home screen or app drawer.</p>
                                </div>
                            ) : canInstall ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📲</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Install Offline App</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                        Work without internet! Install the app to your device for offline support and faster access.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        disabled={isInstalling}
                                        onClick={() => {
                                            triggerInstall()
                                            // Modal can stay open so they see the browser prompt
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        {isInstalling ? <><div className="spinner" /> Installing…</> : 'Install Now'}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                        <div style={{ fontSize: 40, marginBottom: 12 }}>ℹ️</div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>How to Install</h3>
                                    </div>
                                    <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <li><strong>In Chrome/Edge:</strong> Tap the browser menu (⋮) and select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                                        <li><strong>In Safari (iOS):</strong> Tap the Share button (square with arrow) and select <strong>"Add to Home Screen"</strong>.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '100%' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                    <div className="module-card-icon">{mod.icon || '📦'}</div>
                    <div className="module-card-title">{mod.subscription.name}</div>
                    <div className="module-card-period">{mod.subscription.payment_period} subscription</div>
                </div>
                <span className="badge badge-success">Active</span>
            </div>

            <div className="module-card-features">
                {mod.subscription.description ? (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {mod.subscription.description}
                    </p>
                ) : (
                    mod.features.map(f => (
                        <div key={f.label} className="module-card-feature">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                        </div>
                    ))
                )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                Active since {since}
            </div>
        </div>
    )
}
