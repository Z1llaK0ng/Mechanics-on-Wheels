import { useParams } from 'react-router-dom'
import JobCardsPage from '../erp/JobCardsPage'
import VehiclesPage from '../erp/VehiclesPage'
import GlobalDbPage from '../erp/GlobalDbPage'
import CrmPage from '../erp/CrmPage'
// other modules can be added here in the future mapping

const MODULE_REGISTRY: Record<string, React.ReactNode> = {
    'job-cards': <JobCardsPage />,
    'vehicles': <VehiclesPage />,
    'global-db': <GlobalDbPage />,
    'crm': <CrmPage />,
    // 'accounting': <AccountingPage /> etc.
}

export default function ShopModuleWrapper() {
    const { moduleId } = useParams<{ moduleId: string }>()

    if (!moduleId || !MODULE_REGISTRY[moduleId]) {
        // Fallback if the route doesn't match an exact component mapping
        return (
            <div className="fade-in" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <h2>Module Not Available</h2>
                <p>The interface for the module "{moduleId}" has not been implemented in the Shop Portal yet.</p>
            </div>
        )
    }

    // Render the actual ERP component directly inside the Shop Portal layout
    return (
        <div className="shop-module-container fade-in">
            {MODULE_REGISTRY[moduleId]}
        </div>
    )
}
