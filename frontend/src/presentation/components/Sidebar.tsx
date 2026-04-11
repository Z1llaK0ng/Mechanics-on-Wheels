import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../infrastructure/store/authStore'
import { useModules } from '../hooks/useModules'

const STATIC_NAV = [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/modules', icon: '📦', label: 'My Modules' },
]

export default function Sidebar() {
    const mechanic = useAuthStore((s) => s.mechanic)
    const logout = useAuthStore((s) => s.logout)
    const navigate = useNavigate()
    const { data: modules = [] } = useModules()
    const [collapsed, setCollapsed] = useState(false)

    const initials = mechanic
        ? `${mechanic.first_name[0]}${mechanic.last_name[0]}`.toUpperCase()
        : 'M'

    const handleLogout = () => { logout(); navigate('/login') }

    return (
        <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🔧</div>
                {!collapsed && (
                    <div className="sidebar-logo-text">
                        {mechanic?.shop_name || 'MechERP'}
                        <span>Mechanics on Wheels</span>
                    </div>
                )}
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '»' : '«'}
                </button>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {STATIC_NAV.map(({ to, icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon">{icon}</span>
                        {!collapsed && <span className="sidebar-link-label">{label}</span>}
                    </NavLink>
                ))}

                {/* Subscriptions */}
                {modules.length > 0 && !collapsed && (
                    <div style={{ padding: '12px 12px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Subscriptions
                    </div>
                )}
                {modules.map(mod => (
                    <NavLink
                        key={mod.routeKey}
                        to={`/${mod.routeKey}`}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon">{mod.icon}</span>
                        {!collapsed && <span className="sidebar-link-label">{mod.shortName}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer: mechanic info + logout */}
            <div className="sidebar-footer">
                {!collapsed && (
                    <div className="sidebar-link" style={{ cursor: 'default', marginBottom: 4, color: 'var(--text-primary)' }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                            {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {mechanic ? `${mechanic.first_name} ${mechanic.last_name}` : 'Mechanic'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {mechanic?.email}
                            </div>
                        </div>
                    </div>
                )}
                
                <button 
                    className="sidebar-link btn-ghost" 
                    onClick={handleLogout}
                    style={{ justifyContent: collapsed ? 'center' : undefined, color: 'var(--danger)' }}
                >
                    <span className="sidebar-link-icon">🚪</span>
                    {!collapsed && <span className="sidebar-link-label">Sign Out</span>}
                </button>
            </div>
        </aside>
    )
}
