import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useShopAuth, useShopAuthStore, ShopRole } from '../../hooks/useShopAuth'

export default function ShopLoginPage() {
    const navigate = useNavigate()
    const roleRef = useRef<ShopRole>('admin')

    // Watch the store directly — most reliable way to react to login
    const isAuthenticated = useShopAuthStore(s => s.isAuthenticated)
    const user = useShopAuthStore(s => s.user)

    const { loginMutation } = useShopAuth()

    // Navigate AFTER the store commits the user, not inside the mutation callback
    useEffect(() => {
        if (!isAuthenticated || !user) return
        if (user.role === 'admin') {
            navigate('/shop/marketplace', { replace: true })
        } else {
            // Mechanic scope — branch on staffrole
            navigate(
                user.staffrole === 'staff' ? '/shop/management' : '/modules',
                { replace: true }
            )
        }
    }, [isAuthenticated, user])  // eslint-disable-line react-hooks/exhaustive-deps

    const location = useLocation()
    const justRegistered = (location.state as { registered?: boolean })?.registered

    const [role, setRole] = useState<ShopRole>('admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [shopId, setShopId] = useState('')

    const handleRoleChange = (r: ShopRole) => {
        setRole(r)
        roleRef.current = r
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        loginMutation.mutate({ email, password, role, shopId: role === 'mechanic' ? shopId : undefined })
    }

    const errorMessage = loginMutation.isError
        ? ((loginMutation.error as any)?.response?.data?.detail ?? 'Incorrect credentials. Please check your details.')
        : null

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 440 }}>
                <div className="login-logo">
                    <div className="login-logo-icon">🏪</div>
                    <h1>Shop Portal</h1>
                    <p>Mechanics on Wheels — Shop Management</p>
                </div>

                {justRegistered && (
                    <div style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 8, padding: '10px 14px', fontSize: 13,
                        color: 'var(--success)', marginBottom: 16
                    }}>
                        ✅ Shop registered successfully! Please sign in.
                    </div>
                )}

                {/* Role toggle */}
                <div className="shop-role-toggle">
                    <button type="button" className={`shop-role-btn ${role === 'admin' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('admin')}>
                        🏢 Shop Admin
                    </button>
                    <button type="button" className={`shop-role-btn ${role === 'mechanic' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('mechanic')}>
                        👤 Shop Staff
                    </button>
                </div>

                {errorMessage && (
                    <div className="login-error" style={{ marginBottom: 16 }}>
                        {errorMessage}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    {/* Shop ID — staff only */}
                    {role === 'mechanic' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="shop-id-field">Shop ID</label>
                            <input
                                id="shop-id-field"
                                type="text"
                                className="form-input"
                                placeholder="Provided by your shop admin"
                                value={shopId}
                                onChange={e => setShopId(e.target.value)}
                                required
                                style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="shop-email">Email address</label>
                        <input id="shop-email" type="email" className="form-input"
                            placeholder={role === 'admin' ? 'admin@myshop.gh' : 'staff@myshop.gh'}
                            value={email} onChange={e => setEmail(e.target.value)}
                            required autoComplete="username" />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="shop-password">Password</label>
                        <input id="shop-password" type="password" className="form-input"
                            placeholder="••••••••" value={password}
                            onChange={e => setPassword(e.target.value)}
                            required autoComplete="current-password" />
                    </div>

                    <button type="submit" className="btn btn-primary w-full btn-lg"
                        disabled={loginMutation.isPending} style={{ marginTop: 8 }}>
                        {loginMutation.isPending
                            ? <><div className="spinner" /> Signing in…</>
                            : `Sign in as ${role === 'admin' ? 'Admin' : 'Shop Staff'}`}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    {role === 'admin' ? (
                        <p className="text-sm text-muted">
                            New to Mechanics on Wheels?{' '}
                            <Link to="/shop/register" style={{ color: 'var(--accent-light)' }}>
                                Register your shop
                            </Link>
                        </p>
                    ) : (
                        <p className="text-sm text-muted">
                            Your Shop ID and password are provided by your admin.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
