import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useShopAuthStore } from '../hooks/useShopAuth'

export default function ShopLayout() {
    const { user, logout } = useShopAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/shop/login')
    }

    const isAdmin = user?.role === 'admin'

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏪</div>
                    <div className="sidebar-logo-text">
                        Shop Portal
                        <span>{user?.shopName ?? 'Mechanics on Wheels'}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {isAdmin ? (
                        <>
                            <NavLink to="/shop/marketplace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">🛒</span> Marketplace
                            </NavLink>
                            <NavLink to="/shop/subscriptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">📋</span> Subscriptions
                            </NavLink>
                            <NavLink to="/shop/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">⚙️</span> Settings
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/shop/modules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="sidebar-link-icon">🔧</span> My Modules
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ padding: '8px 12px', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name ?? 'User'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user?.role === 'admin' ? 'Shop Admin' : 'Mechanic'}</div>
                    </div>
                    <button className="sidebar-link w-full" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                        <span className="sidebar-link-icon">↩</span> Sign Out
                    </button>
                </div>
            </aside>

            {/* Content */}
            <div className="app-main">
                <header className="navbar">
                    <span className="navbar-title">
                        {isAdmin ? 'Shop Administration' : 'Mechanic Dashboard'}
                    </span>
                    <div className="navbar-right">
                        <span className="badge badge-accent" style={{ textTransform: 'none' }}>
                            {user?.role === 'admin' ? '🏢 Admin' : '🔧 Mechanic'}
                        </span>
                        <div className="avatar">
                            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'U'}
                        </div>
                    </div>
                </header>
                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
