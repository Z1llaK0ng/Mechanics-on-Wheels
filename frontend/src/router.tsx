import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './infrastructure/store/authStore'
import LoginPage from './presentation/pages/logins/LoginPage'
import DashboardPage from './presentation/pages/erp/DashboardPage'
import ModulesPage from './presentation/pages/erp/ModulesPage'
import JobCardsPage from './presentation/pages/erp/JobCardsPage'
import VehiclesPage from './presentation/pages/erp/VehiclesPage'
import GlobalDbPage from './presentation/pages/erp/GlobalDbPage'
import CrmPage from './presentation/pages/erp/CrmPage'
import AppLayout from './presentation/components/AppLayout'
import LandingPage from './presentation/pages/LandingPage'

// ── Shop Portal ───────────────────────────────────────────────────────────────
import ShopLoginPage from './presentation/pages/logins/ShopLoginPage'
import ShopRegisterPage from './presentation/pages/logins/ShopRegisterPage'
import ShopMarketplacePage from './presentation/pages/shop/ShopMarketplacePage'
import ShopSubscriptionPage from './presentation/pages/shop/ShopSubscriptionPage'
import ShopSettingsPage from './presentation/pages/shop/ShopSettingsPage'
import ShopManagementPage from './presentation/pages/shop/ShopManagementPage'
import MechanicModulesPage from './presentation/pages/shop/MechanicModulesPage'
import ShopModuleWrapper from './presentation/pages/shop/ShopModuleWrapper'
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
    // During Zustand rehydration, isAuthenticated can be true but user still null.
    // Return null (render nothing) instead of redirecting to avoid a blank-page loop.
    if (isAuthenticated && !user) return null
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

                {/* Admin-only: marketplace + settings */}
                <Route element={<ShopPrivateRoute requiredRole="admin" />}>
                    <Route element={<ShopLayout />}>
                        <Route path="/shop/marketplace" element={<ShopMarketplacePage />} />
                        <Route path="/shop/settings" element={<ShopSettingsPage />} />
                    </Route>
                </Route>

                {/* Admin + Staff: subscriptions + management */}
                <Route element={<ShopPrivateRoute />}>
                    <Route element={<ShopLayout />}>
                        <Route path="/shop/subscriptions" element={<ShopSubscriptionPage />} />
                        <Route path="/shop/management" element={<ShopManagementPage />} />
                        {/* Render individual modules inside the shop frame */}
                        <Route path="/shop/m/:moduleId" element={<ShopModuleWrapper />} />
                    </Route>
                </Route>

                {/* Technician-only: modules */}
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
                        <Route path="/global-db" element={<GlobalDbPage />} />
                        <Route path="/crm" element={<CrmPage />} />
                    </Route>
                </Route>

                {/* ── Fallback ── */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
