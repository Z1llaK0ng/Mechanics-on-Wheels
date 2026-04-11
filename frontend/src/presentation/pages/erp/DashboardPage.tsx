import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../infrastructure/store/authStore'
import { useModules } from '../../hooks/useModules'
import apiClient from '../../../infrastructure/api/client'
import type { JobCard } from '../../../domain/types'

export default function DashboardPage() {
    const mechanic = useAuthStore((s) => s.mechanic)
    const navigate = useNavigate()
    const { data: modules } = useModules()

    const [modal, setModal] = useState<{ title: string; message: string; emoji: string } | null>(null)

    const { data: jobCards } = useQuery({
        queryKey: ['job-cards', 'dashboard'],
        queryFn: async () => {
            const { data } = await apiClient.get<JobCard[]>('/job-cards?limit=100')
            return data
        }
    })

    const pending = jobCards?.filter(j => j.status === 'pending').length ?? 0
    const inProgress = jobCards?.filter(j => j.status === 'in-progress').length ?? 0
    const completed = jobCards?.filter(j => j.status === 'completed').length ?? 0

    const hasCRM = modules?.some(m =>
        m.routeKey === 'crm' ||
        m.subscription?.name?.toLowerCase().includes('customer')
    ) ?? false

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good morning'
        if (h < 17) return 'Good afternoon'
        return 'Good evening'
    }

    const handleRegisterVehicle = () => {
        if (!hasCRM) {
            setModal({
                emoji: '🔒',
                title: 'Module Not Available',
                message:
                    'The Customer Relations module has not been purchased for your shop. ' +
                    'Please contact your shop administrator to activate this module in order to register vehicles.',
            })
            return
        }
        navigate('/vehicles')
    }

    const handleDownloadApp = () => {
        setModal({
            emoji: '🚀',
            title: 'Coming Soon',
            message: 'The mobile app download is coming in a future update. Stay tuned!',
        })
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>{greeting()}, {mechanic?.first_name} 👋</h1>
                <p>Here's what's happening at your workshop today.</p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
                <StatCard label="Pending Jobs" value={pending} color="var(--warning)" emoji="⏳" onClick={() => navigate('/job-cards')} />
                <StatCard label="Jobs In Progress" value={inProgress} color="var(--info)" emoji="🔨" onClick={() => navigate('/job-cards')} />
                <StatCard label="Completed Jobs" value={completed} color="var(--success)" emoji="✅" onClick={() => navigate('/job-cards')} />
                <StatCard label="Active Modules" value={modules?.length ?? 0} color="var(--accent-light)" emoji="📦" onClick={() => navigate('/modules')} />
            </div>

            {/* Quick actions */}
            <div className="page-header">
                <h1 style={{ fontSize: 16 }}>Quick Actions</h1>
            </div>
            <div className="card-grid" style={{ marginBottom: 32 }}>
                <ActionCard
                    emoji="📋"
                    title="New Job Card"
                    description="Start a new repair job for a vehicle"
                    onClick={() => navigate('/job-cards')}
                />
                <ActionCard
                    emoji="🚗"
                    title="Register Vehicle"
                    description="Add a new vehicle to the workshop registry"
                    locked={!hasCRM}
                    onClick={handleRegisterVehicle}
                />
                <ActionCard
                    emoji="📱"
                    title="Download App"
                    description="Install the offline PWA to your device"
                    onClick={handleDownloadApp}
                />
            </div>

            {/* Recent job cards */}
            {jobCards && jobCards.length > 0 && (
                <>
                    <div className="page-header">
                        <h1 style={{ fontSize: 16 }}>Recent Job Cards</h1>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Registry</th>
                                    <th>VIN</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobCards.slice(0, 5).map(j => (
                                    <tr key={j.job_card_id} style={{ cursor: 'pointer' }} onClick={() => navigate('/job-cards')}>
                                        <td>{j.job_card_id}</td>
                                        <td>{j.vehicle_registry || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{j.vehicle_vin || '—'}</td>
                                        <td><StatusBadge status={j.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Info Modal */}
            {modal && (
                <InfoModal
                    emoji={modal.emoji}
                    title={modal.title}
                    message={modal.message}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({ label, value, color, emoji, onClick }: {
    label: string; value: number; color: string; emoji: string; onClick: () => void
}) {
    return (
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onClick}>
            <div style={{ fontSize: 22 }}>{emoji}</div>
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value" style={{ color }}>{value}</div>
        </div>
    )
}

function ActionCard({ emoji, title, description, locked = false, onClick }: {
    emoji: string; title: string; description: string; locked?: boolean; onClick: () => void
}) {
    return (
        <div
            className="card"
            style={{ cursor: 'pointer', position: 'relative', opacity: locked ? 0.85 : 1 }}
            onClick={onClick}
        >
            <div style={{ fontSize: 28, marginBottom: 12 }}>
                {emoji}
                {locked && <span style={{ fontSize: 14, marginLeft: 6 }}>🔒</span>}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div className="text-sm text-muted">{description}</div>
        </div>
    )
}

function InfoModal({ emoji, title, message, onClose }: {
    emoji: string; title: string; message: string; onClose: () => void
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    maxWidth: 420, width: '100%', textAlign: 'center',
                    padding: '36px 32px', borderRadius: 20,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ fontSize: 52, marginBottom: 16 }}>{emoji}</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>{message}</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
                    Got it
                </button>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'pending': 'badge-warning',
        'in-progress': 'badge-info',
        'completed': 'badge-success'
    }
    return <span className={`badge ${map[status] ?? 'badge-info'}`}>{status}</span>
}
