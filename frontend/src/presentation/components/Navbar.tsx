import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../infrastructure/store/authStore'

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/job-cards': 'Job Cards',
    '/vehicles': 'Vehicles',
    '/modules': 'My Modules',
    '/download-pwa': 'Download App',
}

export default function Navbar() {
    const mechanic = useAuthStore((s) => s.mechanic)
    const location = useLocation()
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const on = () => setIsOnline(true)
        const off = () => setIsOnline(false)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
    }, [])

    const initials = mechanic
        ? `${mechanic.first_name[0]}${mechanic.last_name[0]}`.toUpperCase()
        : 'M'

    const title = ROUTE_TITLES[location.pathname] ?? 'MechERP'

    return (
        <header className="navbar">
            <span className="navbar-title">{title}</span>

            <div className="navbar-right">
                <div className="online-badge">
                    <div className={`online-dot${isOnline ? '' : ' offline'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                </div>

                <div className="avatar" title={mechanic?.email ?? ''}>
                    {initials}
                </div>
            </div>
        </header>
    )
}
