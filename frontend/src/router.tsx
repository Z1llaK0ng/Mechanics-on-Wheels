import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './infrastructure/store/authStore'
import LoginPage from './presentation/pages/erp/LoginPage'
import DashboardPage from './presentation/pages/erp/DashboardPage'
import ModulesPage from './presentation/pages/erp/ModulesPage'
import JobCardsPage from './presentation/pages/erp/JobCardsPage'
import VehiclesPage from './presentation/pages/erp/VehiclesPage'
import PWADownloadPage from './presentation/pages/erp/PWADownloadPage'
import AppLayout from './presentation/components/AppLayout'
import LandingPage from './presentation/pages/LandingPage'

// ── Shop Portal ───────────────────────────────────────────────────────────────
import ShopLoginPage from './presentation/pages/shop/ShopLoginPage'
import ShopRegisterPage from './presentation/pages/shop/ShopRegisterPage'
import ShopMarketplacePage from './presentation/pages/shop/ShopMarketplacePage'
import ShopSubscriptionPage from './presentation/pages/shop/ShopSubscriptionPage'
import ShopSettingsPage from './presentation/pages/shop/ShopSettingsPage'
import MechanicModulesPage from './presentation/pages/shop/MechanicModulesPage'
import ShopLayout from './presentation/components/ShopLayout'
import { useShopAuthStore } from './presentation/hooks/useShopAuth'

// ─── ERP Guard ───────────────────────────────────────────────────────────────
function PrivateRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

// ─── Shop Guard: real auth ────────────────────────────────────────────────────
function ShopPrivateRoute({ requiredRole }: { requiredRole?: 'admin' | 'mechanic' }) {
    const { isAuthenticated, user } = useShopAuthStore()
    if (!isAuthenticated) return <Navigate to="/shop/login" replace />
    if (requiredRole && user?.role !== requiredRole) return <Navigate to="/shop/login" replace />
    return <Outlet />
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ── Public ── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* ── Shop Portal ── */}
                <Route path="/shop" element={<Navigate to="/shop/login" replace />} />
                <Route path="/shop/login" element={<ShopLoginPage />} />
                <Route path="/shop/register" element={<ShopRegisterPage />} />

                {/* Admin-only */}
                <Route element={<ShopPrivateRoute requiredRole="admin" />}>
                    <Route element={<ShopLayout />}>
                        <Route path="/shop/marketplace" element={<ShopMarketplacePage />} />
                        <Route path="/shop/subscriptions" element={<ShopSubscriptionPage />} />
                        <Route path="/shop/settings" element={<ShopSettingsPage />} />
                    </Route>
                </Route>

                {/* Mechanic-only */}
                <Route element={<ShopPrivateRoute requiredRole="mechanic" />}>
                    <Route element={<ShopLayout />}>
                        <Route path="/shop/modules" element={<MechanicModulesPage />} />
                    </Route>
                </Route>

                {/* ── ERP (auth bypassed for preview) ── */}
                <Route element={<PrivateRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/modules" element={<ModulesPage />} />
                        <Route path="/job-cards" element={<JobCardsPage />} />
                        <Route path="/vehicles" element={<VehiclesPage />} />
                        <Route path="/download-pwa" element={<PWADownloadPage />} />
                    </Route>
                </Route>

                {/* ── Fallback ── */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
