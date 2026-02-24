import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
// import { useAuthStore } from './infrastructure/store/authStore' // re-enable with auth
import LoginPage from './presentation/pages/LoginPage'
import DashboardPage from './presentation/pages/DashboardPage'
import ModulesPage from './presentation/pages/ModulesPage'
import JobCardsPage from './presentation/pages/JobCardsPage'
import VehiclesPage from './presentation/pages/VehiclesPage'
import PWADownloadPage from './presentation/pages/PWADownloadPage'
import AppLayout from './presentation/components/AppLayout'

// ─── Guard: AUTH BYPASSED for UI preview — revert before production ──────────
function PrivateRoute() {
    return <Outlet /> // TODO: restore auth check below when done previewing
    // const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    // return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Protected */}
                <Route element={<PrivateRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/modules" element={<ModulesPage />} />
                        <Route path="/job-cards" element={<JobCardsPage />} />
                        <Route path="/vehicles" element={<VehiclesPage />} />
                        <Route path="/download-pwa" element={<PWADownloadPage />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
