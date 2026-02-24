import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../infrastructure/store/authStore'

const NAV_ITEMS = [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/job-cards', icon: '📋', label: 'Job Cards' },
    { to: '/vehicles', icon: '🚗', label: 'Vehicles' },
    { to: '/modules', icon: '📦', label: 'My Modules' },
    { to: '/download-pwa', icon: '📱', label: 'Download App' },
]

export default function Sidebar() {
    const mechanic = useAuthStore((s) => s.mechanic)
    const logout = useAuthStore((s) => s.logout)
    const navigate = useNavigate()

    const initials = mechanic
        ? `${mechanic.first_name[0]}${mechanic.last_name[0]}`.toUpperCase()
        : 'M'

    const handleLogout = () => { logout(); navigate('/login') }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🔧</div>
                <div className="sidebar-logo-text">
                    MechERP
                    <span>Mechanics on Wheels</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map(({ to, icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon">{icon}</span>
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer: mechanic info + logout */}
            <div className="sidebar-footer">
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
                <button className="sidebar-link btn-ghost" onClick={handleLogout}>
                    <span className="sidebar-link-icon">🚪</span>
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
