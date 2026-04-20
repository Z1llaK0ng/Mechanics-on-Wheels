import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
    const { loginMutation } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        loginMutation.mutate({ username: email, password })
    }

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon">🔧</div>
                    <h1>CarrySpanner</h1>
                    <p>Sign in to your workshop dashboard</p>
                </div>

                {/* Error */}
                {loginMutation.isError && (
                    <div className="login-error" style={{ marginBottom: 16 }}>
                        {(loginMutation.error as Error)?.message?.includes('401')
                            ? 'Incorrect email or password'
                            : 'Login failed. Please try again.'}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="mechanic@workshop.gh"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full btn-lg"
                        disabled={loginMutation.isPending}
                        style={{ marginTop: 8 }}
                    >
                        {loginMutation.isPending ? (
                            <><div className="spinner" /> Signing in…</>
                        ) : ('Sign In')}
                    </button>
                </form>

                <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 20 }}>
                    Don't have an account? Contact your shop administrator.
                </p>
            </div>
        </div>
    )
}
