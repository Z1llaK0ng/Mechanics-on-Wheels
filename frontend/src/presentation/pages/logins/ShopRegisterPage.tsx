import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useShopRegister } from '../../hooks/useShopAuth'
import { capitalizeName } from '../../utils'

export default function ShopRegisterPage() {
    const navigate = useNavigate()
    const registerMutation = useShopRegister()
    const [form, setForm] = useState({
        shop_name: '', location: '', email: '', password: '', confirm: ''
    })
    const [error, setError] = useState('')

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (form.password !== form.confirm) {
            setError('Passwords do not match')
            return
        }
        registerMutation.mutate(
            {
                shop_name: capitalizeName(form.shop_name),
                location: capitalizeName(form.location),
                email: form.email,
                password: form.password
            },
            {
                onSuccess: () => navigate('/shop/login', { state: { registered: true } }),
                onError: (err: unknown) => {
                    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                    setError(detail ?? 'Registration failed. Please try again.')
                }
            }
        )
    }

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 480 }}>
                <div className="login-logo">
                    <div className="login-logo-icon">🏪</div>
                    <h1>Register Your Shop</h1>
                    <p>Create a CarrySpanner account</p>
                </div>

                {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-shop-name">Shop name</label>
                        <input id="reg-shop-name" type="text" className="form-input"
                            placeholder="e.g. Kwame Auto Works" value={form.shop_name}
                            onChange={set('shop_name')} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-location">Location</label>
                        <input id="reg-location" type="text" className="form-input"
                            placeholder="e.g. Kumasi, Ghana" value={form.location}
                            onChange={set('location')} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Admin email</label>
                        <input id="reg-email" type="email" className="form-input"
                            placeholder="admin@myshop.gh" value={form.email}
                            onChange={set('email')} required autoComplete="username" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-pw">Password</label>
                            <input id="reg-pw" type="password" className="form-input"
                                placeholder="••••••••" value={form.password}
                                onChange={set('password')} required autoComplete="new-password" />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-confirm">Confirm</label>
                            <input id="reg-confirm" type="password" className="form-input"
                                placeholder="••••••••" value={form.confirm}
                                onChange={set('confirm')} required autoComplete="new-password" />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full btn-lg"
                        disabled={registerMutation.isPending} style={{ marginTop: 8 }}>
                        {registerMutation.isPending ? <><div className="spinner" /> Creating account…</> : 'Create Shop Account'}
                    </button>
                </form>

                <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 20 }}>
                    Already registered?{' '}
                    <Link to="/shop/login" style={{ color: 'var(--accent-light)' }}>Sign in</Link>
                </p>
            </div>
        </div>
    )
}
