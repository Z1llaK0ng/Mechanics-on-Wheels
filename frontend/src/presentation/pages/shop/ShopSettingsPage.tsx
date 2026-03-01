import { useState } from 'react'
import { useShopAuthStore } from '../../hooks/useShopAuth'

// Mock mechanic data — replace with API calls
const MOCK_MECHANICS = [
    { id: 'm1', name: 'Kwame Asante', email: 'kwame@workshop.gh', active: true },
    { id: 'm2', name: 'Ama Boateng', email: 'ama@workshop.gh', active: true },
    { id: 'm3', name: 'Kofi Mensah', email: 'kofi@workshop.gh', active: false },
]

export default function ShopSettingsPage() {
    const user = useShopAuthStore((s) => s.user)
    const [shopName, setShopName] = useState(user?.shopName ?? '')
    const [location, setLocation] = useState('')
    const [saved, setSaved] = useState(false)
    const [mechanics, setMechanics] = useState(MOCK_MECHANICS)
    const [showAddMechanic, setShowAddMechanic] = useState(false)
    const [newMechanic, setNewMechanic] = useState({ name: '', email: '', password: '' })
    const [copied, setCopied] = useState(false)

    const shopId = user?.shopId ?? '—'

    const copyShopId = () => {
        navigator.clipboard.writeText(shopId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const saveShopInfo = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: PATCH /api/v1/shops/:id
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    const toggleMechanic = (id: string) => {
        setMechanics(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
        // TODO: PATCH /api/v1/mechanics/:id
    }

    const removeMechanic = (id: string) => {
        setMechanics(prev => prev.filter(m => m.id !== id))
        // TODO: DELETE /api/v1/mechanics/:id
    }

    const addMechanic = (e: React.FormEvent) => {
        e.preventDefault()
        setMechanics(prev => [...prev, {
            id: `m${Date.now()}`,
            name: newMechanic.name,
            email: newMechanic.email,
            active: true,
        }])
        setNewMechanic({ name: '', email: '', password: '' })
        setShowAddMechanic(false)
        // TODO: POST /api/v1/mechanics
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Shop Settings</h1>
                <p>Manage your shop details and mechanics</p>
            </div>

            {/* ── Shop ID ── */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Shop ID
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        flex: 1, fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
                        background: 'var(--bg-tertiary)', padding: '10px 16px',
                        borderRadius: 8, border: '1px solid var(--border-subtle)',
                        letterSpacing: '0.05em', color: 'var(--accent-light)'
                    }}>
                        {shopId}
                    </div>
                    <button className="btn btn-secondary" onClick={copyShopId}>
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>
                <p className="text-sm text-muted" style={{ marginTop: 10 }}>
                    Share this ID with your mechanics — they'll need it to log in.
                </p>
            </div>

            {/* ── Shop Info ── */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Shop Information
                </div>
                <form onSubmit={saveShopInfo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="set-shop-name">Shop name</label>
                        <input id="set-shop-name" type="text" className="form-input"
                            value={shopName} onChange={e => setShopName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="set-location">Location</label>
                        <input id="set-location" type="text" className="form-input"
                            placeholder="e.g. Kumasi, Ghana"
                            value={location} onChange={e => setLocation(e.target.value)} />
                    </div>
                    <div>
                        <button type="submit" className="btn btn-primary">
                            {saved ? '✅ Saved' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Mechanics ── */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Mechanics ({mechanics.length})
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddMechanic(true)}>
                        + Add Mechanic
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mechanics.map(mec => (
                        <div key={mec.id} className="shop-mechanic-row">
                            <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                {mec.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{mec.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{mec.email}</div>
                            </div>
                            <span className={`badge ${mec.active ? 'badge-success' : 'badge-warning'}`}>
                                {mec.active ? 'Active' : 'Inactive'}
                            </span>
                            <label className="shop-toggle" title="Toggle active">
                                <input type="checkbox" checked={mec.active} onChange={() => toggleMechanic(mec.id)} />
                                <span className="shop-toggle-slider" />
                            </label>
                            <button className="btn btn-danger btn-sm" onClick={() => removeMechanic(mec.id)}>
                                Remove
                            </button>
                        </div>
                    ))}
                    {mechanics.length === 0 && (
                        <div className="loading-state" style={{ padding: '24px 0' }}>
                            <span>No mechanics yet. Add one above.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add Mechanic Modal ── */}
            {showAddMechanic && (
                <div className="modal-backdrop" onClick={() => setShowAddMechanic(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Add Mechanic</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMechanic(false)}>✕</button>
                        </div>
                        <form className="modal-form" onSubmit={addMechanic}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="add-mec-name">Full name</label>
                                <input id="add-mec-name" type="text" className="form-input"
                                    placeholder="Kofi Mensah" required
                                    value={newMechanic.name}
                                    onChange={e => setNewMechanic(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="add-mec-email">Email</label>
                                <input id="add-mec-email" type="email" className="form-input"
                                    placeholder="kofi@myshop.gh" required
                                    value={newMechanic.email}
                                    onChange={e => setNewMechanic(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="add-mec-pw">Temporary password</label>
                                <input id="add-mec-pw" type="password" className="form-input"
                                    placeholder="••••••••" required
                                    value={newMechanic.password}
                                    onChange={e => setNewMechanic(p => ({ ...p, password: e.target.value }))} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMechanic(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Mechanic</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
