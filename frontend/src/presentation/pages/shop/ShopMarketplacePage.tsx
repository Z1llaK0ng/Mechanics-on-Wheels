import { useState } from 'react'
import { useShopAuthStore, ALL_MODULES } from '../../hooks/useShopAuth'

type Period = 'monthly' | 'yearly'

export default function ShopMarketplacePage() {
    const user = useShopAuthStore((s) => s.user)
    const [period, setPeriod] = useState<Period>('monthly')
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [subscribed, setSubscribed] = useState<Set<string>>(
        new Set(user?.subscribedModules ?? [])
    )

    const subscribedMod = confirmId ? ALL_MODULES.find(m => m.id === confirmId) : null

    const handleSubscribe = () => {
        if (!confirmId) return
        setSubscribed(prev => new Set([...prev, confirmId]))
        setConfirmId(null)
        // TODO: POST /api/v1/subscriptions when backend is ready
    }

    const handleCancel = (id: string) => {
        setSubscribed(prev => { const s = new Set(prev); s.delete(id); return s })
        // TODO: DELETE /api/v1/subscriptions/:id when backend is ready
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Module Marketplace</h1>
                        <p>Extend your workshop with powerful add-ons</p>
                    </div>
                    {/* Billing period toggle */}
                    <div className="shop-period-toggle">
                        <button
                            className={`shop-period-btn ${period === 'monthly' ? 'active' : ''}`}
                            onClick={() => setPeriod('monthly')}
                        >Monthly</button>
                        <button
                            className={`shop-period-btn ${period === 'yearly' ? 'active' : ''}`}
                            onClick={() => setPeriod('yearly')}
                        >
                            Yearly
                            <span className="shop-save-badge">Save 17%</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="shop-module-grid">
                {ALL_MODULES.map(mod => {
                    const isActive = subscribed.has(mod.id)
                    return (
                        <div key={mod.id} className={`shop-module-card ${isActive ? 'active' : ''}`}>
                            <div className="shop-module-card-header">
                                <span className="shop-module-icon">{mod.icon}</span>
                                {isActive && <span className="badge badge-success">Active</span>}
                            </div>
                            <h3 className="shop-module-name">{mod.name}</h3>
                            <p className="shop-module-desc">{mod.desc}</p>
                            <div className="shop-module-price">
                                <span className="shop-price-amount">GH₵ {mod.price[period]}</span>
                                <span className="shop-price-period">/ {period === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                                {isActive ? (
                                    <button
                                        className="btn btn-danger w-full"
                                        onClick={() => handleCancel(mod.id)}
                                    >Cancel Subscription</button>
                                ) : (
                                    <button
                                        className="btn btn-primary w-full"
                                        onClick={() => setConfirmId(mod.id)}
                                    >Subscribe</button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Confirm modal */}
            {confirmId && subscribedMod && (
                <div className="modal-backdrop" onClick={() => setConfirmId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Confirm Subscription</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                            You are subscribing to <strong style={{ color: 'var(--text-primary)' }}>
                                {subscribedMod.icon} {subscribedMod.name}
                            </strong> for <strong style={{ color: 'var(--accent-light)' }}>
                                GH₵ {subscribedMod.price[period]} / {period === 'monthly' ? 'month' : 'year'}
                            </strong>.
                        </p>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubscribe}>Confirm &amp; Subscribe</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
