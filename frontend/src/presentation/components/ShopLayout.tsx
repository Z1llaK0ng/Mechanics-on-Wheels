import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useShopAuthStore } from '../hooks/useShopAuth'

export default function ShopLayout() {
    const { user, logout } = useShopAuthStore()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/shop/login')
    }

    const isAdmin = user?.role === 'admin'

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar${!isAdmin && collapsed ? ' sidebar-collapsed' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">{isAdmin ? '🏪' : '🔧'}</div>
                    {(!isAdmin && !collapsed) || isAdmin ? (
                        <div className="sidebar-logo-text">
                            {isAdmin ? 'Shop Portal' : 'Mechanics Portal'}
                            <span>{user?.shopName ?? 'Mechanics on Wheels'}</span>
                        </div>
                    ) : null}

                    {/* Collapse toggle — mechanics only */}
                    {!isAdmin && (
                        <button
                            className="sidebar-collapse-btn"
                            onClick={() => setCollapsed(c => !c)}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? '»' : '«'}
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {isAdmin ? (
                        <>
                            <NavLink to="/shop/marketplace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">🛒</span>
                                <span className="sidebar-link-label">Marketplace</span>
                            </NavLink>
                            <NavLink to="/shop/subscriptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">📋</span>
                                <span className="sidebar-link-label">Subscriptions</span>
                            </NavLink>
                            <NavLink to="/shop/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">⚙️</span>
                                <span className="sidebar-link-label">Settings</span>
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/shop/modules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="sidebar-link-icon">🔧</span>
                            {!collapsed && <span className="sidebar-link-label">Provided Modules</span>}
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    {!collapsed && (
                        <div style={{ padding: '8px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name ?? 'User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user?.role === 'admin' ? 'Shop Admin' : 'Mechanic'}</div>
                        </div>
                    )}
                    <button className="sidebar-link w-full" onClick={handleLogout} style={{ color: 'var(--danger)', justifyContent: collapsed && !isAdmin ? 'center' : undefined }}>
                        <span className="sidebar-link-icon">↩</span>
                        {(!collapsed || isAdmin) && <span className="sidebar-link-label">Sign Out</span>}
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
