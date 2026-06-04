import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useShopAuthStore, MODULE_ROUTES } from '../hooks/useShopAuth'
import shopApiClient from '../../infrastructure/api/shopClient'

const FallbackModuleNames: Record<string, {name: string, icon: string}> = {
    'job-cards': { name: 'Job Cards', icon: '🔧' },
    'inventory': { name: 'Inventory', icon: '📦' },
    'crm': { name: 'CRM', icon: '👥' },
    'invoicing': { name: 'Invoicing', icon: '🧾' },
    'employees': { name: 'Employees', icon: '👨‍🔧' },
    'global-db': { name: 'Global DB', icon: '🌐' },
    'search': { name: 'Search', icon: '🔍' },
    'shop-map': { name: 'Shop Map', icon: '🗺️' }
}

export default function ShopLayout() {
    const { user, logout } = useShopAuthStore()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [avatarOpen, setAvatarOpen] = useState(false)
    const avatarRef = useRef<HTMLDivElement>(null)

    const handleLogout = () => {
        logout()
        navigate('/shop/login')
    }

    const isAdmin = user?.role === 'admin'
    const isStaff = user?.role === 'mechanic' && user?.staffrole === 'staff'
    const isTechnician = user?.role === 'mechanic' && user?.staffrole !== 'staff'

    // Live subscriptions for sidebar rendering
    const { data: liveSubIds = [] } = useQuery<string[]>({
        queryKey: ['shop', 'subscriptions'],
        enabled: !!user && (isAdmin || isStaff),
        queryFn: async () => {
            const { data } = await shopApiClient.get<string[]>('/subscriptions/shop-active')
            return data
        },
    })
    const subscribedBaseIds = [...new Set(liveSubIds.map(id => id.split('_')[0]))]

    // Close avatar dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
                setAvatarOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Badge label / icon per role
    const roleBadge = isAdmin ? '🏢 Admin' : isStaff ? '🗂️ Staff' : '🔧 Technician'

    return (
        <div className="app-layout">
            {/* ── Sidebar ── */}
            <aside className={`sidebar${isTechnician && collapsed ? ' sidebar-collapsed' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">{isAdmin ? '🏪' : isStaff ? '🗂️' : '🔧'}</div>
                    {(!isTechnician || !collapsed) ? (
                        <div className="sidebar-logo-text">
                            {isAdmin ? 'Shop Portal' : isStaff ? 'Staff Portal' : 'Mechanics Portal'}
                            <span>{user?.shopName ?? 'CarrySpanner'}</span>
                        </div>
                    ) : null}

                    {/* Collapse toggle — technicians only */}
                    {isTechnician && (
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
                    {isAdmin && (
                        <>
                            <NavLink to="/shop/management" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">👥</span>
                                <span className="sidebar-link-label">Management</span>
                            </NavLink>
                            <NavLink to="/shop/subscriptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">📋</span>
                                <span className="sidebar-link-label">Subscriptions</span>
                            </NavLink>
                            <NavLink to="/shop/marketplace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">🛒</span>
                                <span className="sidebar-link-label">Marketplace</span>
                            </NavLink>

                            {/* Dynamically added Subscribed Modules */}
                            {subscribedBaseIds.map(modId => {
                                const route = `/shop/m/${modId}`
                                const meta = FallbackModuleNames[modId] || { name: modId, icon: '🧩' }
                                return (
                                    <NavLink key={modId} to={route} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                        <span className="sidebar-link-icon">{meta.icon}</span>
                                        <span className="sidebar-link-label">{meta.name}</span>
                                    </NavLink>
                                )
                            })}
                        </>
                    )}

                    {isStaff && (
                        <>
                            <NavLink to="/shop/subscriptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">📋</span>
                                <span className="sidebar-link-label">Subscriptions</span>
                            </NavLink>
                            <NavLink to="/shop/management" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">👥</span>
                                <span className="sidebar-link-label">Management</span>
                            </NavLink>

                            {/* Dynamically added Subscribed Modules */}
                            {subscribedBaseIds.map(modId => {
                                const route = `/shop/m/${modId}`
                                const meta = FallbackModuleNames[modId] || { name: modId, icon: '🧩' }
                                return (
                                    <NavLink key={modId} to={route} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                        <span className="sidebar-link-icon">{meta.icon}</span>
                                        <span className="sidebar-link-label">{meta.name}</span>
                                    </NavLink>
                                )
                            })}
                        </>
                    )}

                    {isTechnician && (
                        <>
                            <NavLink to="/shop/modules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <span className="sidebar-link-icon">🧩</span>
                                {!collapsed && <span className="sidebar-link-label">Provided Modules</span>}
                            </NavLink>

                            {/* Dynamic links for each permitted module */}
                            {(user?.permittedModules ?? []).map(modId => {
                                const route = MODULE_ROUTES[modId]
                                if (!route) return null
                                const meta = FallbackModuleNames[modId] || { name: modId, icon: '🔧' }
                                return (
                                    <NavLink key={modId} to={route} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                        <span className="sidebar-link-icon">{meta.icon}</span>
                                        {!collapsed && <span className="sidebar-link-label">{meta.name}</span>}
                                    </NavLink>
                                )
                            })}
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    {/* Shop name / user card — clickable to settings for admins */}
                    {(!isTechnician || !collapsed) && (
                        isAdmin ? (
                            <NavLink
                                to="/shop/settings"
                                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                                style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', marginBottom: 8, gap: 2, borderRadius: 8 }}
                                title="Shop Settings"
                            >
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name ?? 'User'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Shop Admin · {user?.shopName}</div>
                            </NavLink>
                        ) : (
                            <div style={{ padding: '8px 12px', marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name ?? 'User'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    {isStaff ? 'Staff' : 'Mechanic'} · {user?.shopName}
                                </div>
                            </div>
                        )
                    )}
                    <button
                        className="sidebar-link w-full"
                        onClick={handleLogout}
                        style={{ color: 'var(--danger)', justifyContent: isTechnician && collapsed ? 'center' : undefined }}
                    >
                        <span className="sidebar-link-icon">↩</span>
                        {(!isTechnician || !collapsed) && <span className="sidebar-link-label">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* ── Content ── */}
            <div className="app-main">
                <header className="navbar">
                    <span className="navbar-title">
                        {isAdmin ? 'Shop Administration' : isStaff ? 'Staff Portal' : 'Mechanic Dashboard'}
                    </span>
                    <div className="navbar-right">
                        <span className="badge badge-accent" style={{ textTransform: 'none' }}>
                            {roleBadge}
                        </span>

                        {/* Avatar with dropdown */}
                        <div ref={avatarRef} style={{ position: 'relative' }}>
                            <div
                                className="avatar"
                                onClick={() => setAvatarOpen(o => !o)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                title="Account menu"
                            >
                                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'U'}
                            </div>

                            {avatarOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                                    minWidth: 200, zIndex: 999, overflow: 'hidden',
                                }}>
                                    {/* User info header */}
                                    <div style={{
                                        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-tertiary)',
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name ?? 'User'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {isAdmin
                                                ? `Shop Admin · ${user?.shopName}`
                                                : isStaff
                                                    ? `Staff · ${user?.shopName}`
                                                    : 'Mechanic'}
                                        </div>
                                    </div>

                                    {/* Settings — admin only */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => { navigate('/shop/settings'); setAvatarOpen(false) }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                width: '100%', padding: '10px 16px',
                                                background: 'none', border: 'none',
                                                color: 'var(--text-primary)', fontSize: 14,
                                                cursor: 'pointer', textAlign: 'left',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            <span>⚙️</span> Settings
                                        </button>
                                    )}

                                    {/* Sign out */}
                                    <button
                                        onClick={() => { setAvatarOpen(false); handleLogout() }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            width: '100%', padding: '10px 16px',
                                            background: 'none', border: 'none',
                                            color: 'var(--danger)', fontSize: 14,
                                            cursor: 'pointer', textAlign: 'left',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <span>↩</span> Sign Out
                                    </button>
                                </div>
                            )}
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
