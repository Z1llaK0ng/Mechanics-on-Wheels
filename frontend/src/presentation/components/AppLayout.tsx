import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppLayout() {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-main">
                <Navbar />
                <main className="app-content fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
