import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useShopAuthStore } from '../../hooks/useShopAuth'
import shopApiClient from '../../../infrastructure/api/shopClient'

interface MechanicRow {
    id: string
    name: string
    email: string
    active: boolean
}

export default function ShopSettingsPage() {
    const user = useShopAuthStore((s) => s.user)
    const [shopName, setShopName] = useState(user?.shopName ?? '')
    const [location, setLocation] = useState('')
    const [saved, setSaved] = useState(false)
    const [showAddMechanic, setShowAddMechanic] = useState(false)
    const [newMechanic, setNewMechanic] = useState({ name: '', email: '', password: '' })
    const [addError, setAddError] = useState('')
    const [copied, setCopied] = useState(false)

    // Password change
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
    const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)

    const shopId = user?.shopId ?? '—'
    const qc = useQueryClient()

    const { data: mechanics = [], isLoading: mechanicsLoading } = useQuery<MechanicRow[]>({
        queryKey: ['shop', 'mechanics', user?.shopId],
        enabled: !!user?.shopId,
        queryFn: async () => {
            if (!user?.shopId) return []
            const { data } = await shopApiClient.get(`/shops/${user.shopId}/mechanics`)
            return data.map((m: any) => ({
                id: m.id,
                name: m.full_name ?? `${m.first_name} ${m.last_name}`.trim(),
                email: m.email,
                active: m.active_status,
            }))
        },
    })

    const copyShopId = () => {
        navigator.clipboard.writeText(shopId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shopMutation = useMutation({
        mutationFn: async (payload: { shop_name: string; location: string }) => {
            if (!user?.shopId) return
            await shopApiClient.patch(`/shops/${user.shopId}`, payload)
        },
        onSuccess: () => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        },
    })

    const toggleMechanicMutation = useMutation({
        mutationFn: async (id: string) => {
            await shopApiClient.patch(`/shops/mechanics/${id}`)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['shop', 'mechanics', user?.shopId] })
        },
    })

    const removeMechanicMutation = useMutation({
        mutationFn: async (id: string) => {
            await shopApiClient.delete(`/shops/mechanics/${id}`)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['shop', 'mechanics', user?.shopId] })
        },
    })

    const addMechanicMutation = useMutation({
        mutationFn: async (payload: { name: string; email: string; password: string }) => {
            if (!user?.shopId) return
            await shopApiClient.post(`/shops/${user.shopId}/mechanics`, {
                full_name: payload.name,
                email: payload.email,
                password: payload.password,
            })
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['shop', 'mechanics', user?.shopId] })
            setNewMechanic({ name: '', email: '', password: '' })
            setShowAddMechanic(false)
            setAddError('')
            alert('Mechanic added successfully!')
        },
        onError: (error: any) => {
            setAddError(error?.response?.data?.detail || 'Failed to add mechanic. Please try again.')
        }
    })

    const changePasswordMutation = useMutation({
        mutationFn: async (payload: { current_password: string; new_password: string }) => {
            if (!user?.shopId) return
            await shopApiClient.patch(`/shops/${user.shopId}/password`, payload)
        },
        onSuccess: () => {
            setPwMsg({ text: '✅ Password updated successfully!', ok: true })
            setPwForm({ current: '', next: '', confirm: '' })
            setTimeout(() => setPwMsg(null), 3000)
        },
        onError: (error: any) => {
            setPwMsg({ text: error?.response?.data?.detail || 'Failed to update password.', ok: false })
        },
    })

    const saveShopInfo = (e: React.FormEvent) => {
        e.preventDefault()
        shopMutation.mutate({ shop_name: shopName, location })
    }

    const changePassword = (e: React.FormEvent) => {
        e.preventDefault()
        if (pwForm.next !== pwForm.confirm) {
            setPwMsg({ text: 'New passwords do not match.', ok: false })
            return
        }
        if (pwForm.next.length < 6) {
            setPwMsg({ text: 'Password must be at least 6 characters.', ok: false })
            return
        }
        changePasswordMutation.mutate({ current_password: pwForm.current, new_password: pwForm.next })
    }

    const toggleMechanic = (id: string) => {
        toggleMechanicMutation.mutate(id)
    }

    const removeMechanic = (id: string) => {
        if (!window.confirm('Remove this mechanic?')) return
        removeMechanicMutation.mutate(id)
    }

    const addMechanic = (e: React.FormEvent) => {
        e.preventDefault()
        addMechanicMutation.mutate(newMechanic)
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
                <div style={{ marginTop: 12 }}>
                    <a
                        href="/shop/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                        🔗 Open Mechanic Login Page
                    </a>
                </div>
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
                    {mechanicsLoading && (
                        <div className="loading-state" style={{ padding: '24px 0' }}>
                            <span>Loading mechanics…</span>
                        </div>
                    )}
                    {!mechanicsLoading && mechanics.map(mec => (
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
                    {!mechanicsLoading && mechanics.length === 0 && (
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
                            {addError && <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '13px' }}>{addError}</div>}
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

            {/* ── Change Password ── */}
            <div className="card" style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Change Password
                </div>
                <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {pwMsg && (
                        <div style={{
                            padding: '10px 14px', borderRadius: 8, fontSize: 13,
                            background: pwMsg.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: pwMsg.ok ? '#22c55e' : '#ef4444',
                            border: `1px solid ${pwMsg.ok ? '#22c55e33' : '#ef444433'}`,
                        }}>
                            {pwMsg.text}
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label" htmlFor="pw-current">Current password</label>
                        <input id="pw-current" type="password" className="form-input"
                            placeholder="••••••••" required
                            value={pwForm.current}
                            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="pw-new">New password</label>
                        <input id="pw-new" type="password" className="form-input"
                            placeholder="••••••••" required
                            value={pwForm.next}
                            onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
                        <input id="pw-confirm" type="password" className="form-input"
                            placeholder="••••••••" required
                            value={pwForm.confirm}
                            onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
                    </div>
                    <div>
                        <button type="submit" className="btn btn-primary" disabled={changePasswordMutation.isPending}>
                            {changePasswordMutation.isPending ? 'Updating…' : '🔒 Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
