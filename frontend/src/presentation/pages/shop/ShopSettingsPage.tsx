import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useShopAuthStore } from '../../hooks/useShopAuth'
import shopApiClient from '../../../infrastructure/api/shopClient'
import { capitalizeName } from '../../utils'


export default function ShopSettingsPage() {
    const user = useShopAuthStore((s) => s.user)
    const [shopName, setShopName] = useState(user?.shopName ?? '')
    const [location, setLocation] = useState('')
    const [saved, setSaved] = useState(false)
    const [copied, setCopied] = useState(false)

    // Password change
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
    const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)

    const shopId = user?.shopId ?? '—'

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
        shopMutation.mutate({ shop_name: capitalizeName(shopName), location: capitalizeName(location) })
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

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Shop Settings</h1>
                <p>Manage your shop details</p>
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
                        href="/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                        🔗 Shop Staff Login Page
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
