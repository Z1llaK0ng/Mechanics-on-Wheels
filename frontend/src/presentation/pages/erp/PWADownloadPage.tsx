import { useNavigate } from 'react-router-dom'
import { useModules } from '../../hooks/useModules'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import type { AppModule } from '../../../domain/types'

export default function PWADownloadPage() {
    const { data: modules, isLoading } = useModules()
    const { canInstall, isInstalled, isInstalling, triggerInstall } = usePWAInstall()
    const navigate = useNavigate()

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Download App</h1>
                <p>Install the offline-capable PWA for your subscribed modules</p>
            </div>

            {/* Main install banner */}
            {isInstalled ? (
                <div className="install-prompt" style={{
                    background: 'linear-gradient(135deg, var(--success) 0%, #065f46 100%)'
                }}>
                    <div className="install-prompt-text">
                        <h2>✅ App Installed!</h2>
                        <p>CarrySpanner is installed on this device. Open it from your home screen or app drawer.</p>
                    </div>
                    <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={() => navigate('/dashboard')}>
                        Go to Dashboard
                    </button>
                </div>
            ) : canInstall ? (
                <div className="install-prompt">
                    <div className="install-prompt-text">
                        <h2>Install Offline App</h2>
                        <p>Work without internet. Your subscribed modules will be available offline.</p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ flexShrink: 0, fontWeight: 700 }}
                        disabled={isInstalling}
                        onClick={triggerInstall}
                    >
                        {isInstalling ? <><div className="spinner" /> Installing…</> : '📲 Install Now'}
                    </button>
                </div>
            ) : (
                <div className="card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 32 }}>ℹ️</div>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>How to install</div>
                        <div className="text-sm text-muted">
                            In Chrome: open the browser menu (⋮) and tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.<br />
                            In Safari (iOS): tap the Share button and select <strong>"Add to Home Screen"</strong>.
                        </div>
                    </div>
                </div>
            )}

            {/* Module cards */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Your Modules</h2>
                <p className="text-sm text-muted">
                    Installing the app gives you offline access to all of these modules.
                </p>
            </div>

            {isLoading && (
                <div className="loading-state"><div className="spinner" /><span>Loading modules…</span></div>
            )}

            {!isLoading && (!modules || modules.length === 0) && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No active modules</div>
                    <p className="text-sm">You need an active subscription to access offline modules.</p>
                </div>
            )}

            <div className="card-grid">
                {modules?.map((mod) => (
                    <PWAModuleCard key={mod.subscription.subscription_id} mod={mod} isInstalled={isInstalled} />
                ))}
            </div>

            {/* Offline explanation */}
            <div className="card" style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🔄 How Offline Sync Works</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    {[
                        { step: '1', title: 'Install', desc: 'Add the app to your device home screen above' },
                        { step: '2', title: 'Cache', desc: 'The app downloads your data when you\'re online' },
                        { step: '3', title: 'Work', desc: 'Use the app normally even without internet' },
                        { step: '4', title: 'Sync', desc: 'Changes automatically upload when connection returns' }
                    ].map(s => (
                        <div key={s.step} style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--accent-dim)', color: 'var(--accent-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 14, flexShrink: 0
                            }}>{s.step}</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                                <div className="text-sm text-muted">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function PWAModuleCard({ mod, isInstalled }: { mod: AppModule; isInstalled: boolean }) {
    return (
        <div className="module-card">
            <div className="module-card-header">
                <div>
                    <div className="module-card-icon">
                        {mod.routeKey === 'job-cards' ? '📋' :
                            mod.routeKey === 'vehicles' ? '🚗' :
                                mod.routeKey === 'inventory' ? '🔧' :
                                    mod.routeKey === 'analytics' ? '📈' : '📦'}
                    </div>
                    <div className="module-card-title">{mod.subscription.name}</div>
                    <div className="module-card-period">{mod.subscription.payment_period}</div>
                </div>
                {isInstalled
                    ? <span className="badge badge-success">✓ Installed</span>
                    : <span className="badge badge-accent">Offline Ready</span>
                }
            </div>

            <div className="module-card-features">
                {mod.features.map(f => (
                    <div key={f.label} className="module-card-feature">
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                    </div>
                ))}
            </div>

            <div className="module-card-footer">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {isInstalled
                        ? '✅ Available offline via installed app'
                        : '📥 Will be available offline after installation'
                    }
                </div>
            </div>
        </div>
    )
}
