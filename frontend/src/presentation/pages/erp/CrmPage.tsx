import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import shopApiClient from '../../../infrastructure/api/shopClient'
import type { VehicleOwner, VehicleOwnerDetail, Vehicle, JobCard, NotifyResponse } from '../../../domain/types'
import { capitalizeName } from '../../utils'

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    'pending':     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'in-progress': { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    'completed':   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] ?? { label: status, color: 'var(--text-secondary)', bg: 'transparent' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontWeight: 600, fontSize: 11, padding: '3px 9px', borderRadius: 20,
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
        </span>
    )
}

// ── Tab types ────────────────────────────────────────────────────────────────

type TabKey = 'customers' | 'vehicles' | 'jobcards'

const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'customers', label: 'Customers',  icon: '👤' },
    { key: 'vehicles',  label: 'Vehicles',   icon: '🚗' },
    { key: 'jobcards',  label: 'Job Cards',  icon: '📋' },
]

// ── Main CRM Page ────────────────────────────────────────────────────────────

export default function CrmPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('customers')
    const [search, setSearch] = useState('')

    // Drawer state
    const [drawerCustomer, setDrawerCustomer] = useState<VehicleOwner | null>(null)

    // Modals
    const [showAddCustomer,   setShowAddCustomer]   = useState(false)
    const [showLinkCustomer,  setShowLinkCustomer]  = useState(false)
    const [showAddVehicle,    setShowAddVehicle]    = useState<{ registry: string; vin: string } | boolean>(false)
    const [assignTarget,      setAssignTarget]       = useState<Vehicle | null>(null)
    const [notifyTarget,      setNotifyTarget]       = useState<{ customer: VehicleOwner; jobCard: JobCard } | null>(null)

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
            {/* ── Page header ── */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-row">
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            👥 CRM
                            <span className="badge badge-accent" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, padding: '4px 10px' }}>
                                Customer Relationships
                            </span>
                        </h1>
                        <p>Manage customers, vehicles, and job card notifications</p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        {activeTab === 'customers' && (
                            <>
                                <button className="btn btn-secondary" id="crm-link-customer-btn" onClick={() => setShowLinkCustomer(true)}>
                                    🔗 Link Existing
                                </button>
                                <button className="btn btn-primary" id="crm-add-customer-btn" onClick={() => setShowAddCustomer(true)}>
                                    + New Customer
                                </button>
                            </>
                        )}
                        {activeTab === 'vehicles' && (
                            <button className="btn btn-primary" id="crm-add-vehicle-btn" onClick={() => setShowAddVehicle(true)}>
                                + Register Vehicle
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 20,
                borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0,
            }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        id={`crm-tab-${t.key}`}
                        onClick={() => { setActiveTab(t.key); setSearch('') }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '10px 18px', background: 'none', border: 'none',
                            borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === t.key ? 'var(--accent-light)' : 'var(--text-secondary)',
                            fontWeight: activeTab === t.key ? 700 : 500,
                            fontSize: 14, cursor: 'pointer',
                            transition: 'color 0.15s, border-color 0.15s',
                            marginBottom: -1,
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── Search bar ── */}
            <div style={{ marginBottom: 16 }}>
                <input
                    id="crm-search"
                    className="form-input"
                    style={{ maxWidth: 340 }}
                    placeholder={
                        activeTab === 'customers' ? 'Search customers…' :
                        activeTab === 'vehicles'  ? 'Search by plate or VIN…' :
                        'Search by plate, VIN or status…'
                    }
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* ── Tab content ── */}
            <div style={{ flex: 1, minHeight: 0 }}>
                {activeTab === 'customers' && (
                    <CustomersTab
                        search={search}
                        onViewCustomer={c => setDrawerCustomer(c)}
                    />
                )}
                {activeTab === 'vehicles' && (
                    <VehiclesTab
                        search={search}
                        onAssignOwner={v => setAssignTarget(v)}
                        onRegisterVehicle={prefill => setShowAddVehicle(prefill)}
                    />
                )}
                {activeTab === 'jobcards' && (
                    <JobCardsTab
                        search={search}
                        onNotify={(c, jc) => setNotifyTarget({ customer: c, jobCard: jc })}
                        onAssignOwner={v => setAssignTarget(v)}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            {showAddCustomer  && <AddCustomerModal  onClose={() => setShowAddCustomer(false)} />}
            {showLinkCustomer && <LinkCustomerModal onClose={() => setShowLinkCustomer(false)} />}
            {showAddVehicle   && (
                <AddVehicleModal
                    onClose={() => setShowAddVehicle(false)}
                    prefill={typeof showAddVehicle === 'object' ? showAddVehicle : undefined}
                />
            )}
            {assignTarget     && <AssignOwnerModal vehicle={assignTarget} onClose={() => setAssignTarget(null)} />}
            {notifyTarget    && (
                <NotifyModal
                    customer={notifyTarget.customer}
                    jobCard={notifyTarget.jobCard}
                    onClose={() => setNotifyTarget(null)}
                />
            )}

            {/* ── Customer Drawer ── */}
            {drawerCustomer && (
                <CustomerDrawer
                    customer={drawerCustomer}
                    onClose={() => setDrawerCustomer(null)}
                    onNotify={(c, jc) => {
                        setDrawerCustomer(null)
                        setNotifyTarget({ customer: c, jobCard: jc })
                    }}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ════════════════════════════════════════════════════════════════════════════

function CustomersTab({
    search,
    onViewCustomer,
}: {
    search: string
    onViewCustomer: (c: VehicleOwner) => void
}) {
    const qc = useQueryClient()

    const { data: customers = [], isLoading } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'customers'],
        queryFn: () => shopApiClient.get<VehicleOwner[]>('/crm/customers?limit=200').then(r => r.data),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => shopApiClient.delete(`/crm/customers/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'customers'] }),
    })

    const filtered = customers.filter(c =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone ?? '').includes(search) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) return <LoadingState label="Loading customers…" />

    return (
        <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <StatChip icon="👤" label="Total Customers" value={customers.length} />
                <StatChip icon="🚗" label="Total Vehicles" value={customers.reduce((s, c) => s + c.vehicle_count, 0)} />
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Vehicles</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                                {search ? 'No customers match your search.' : 'No customers yet. Add one to get started.'}
                            </td></tr>
                        ) : filtered.map(c => (
                            <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onViewCustomer(c)}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0, background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                                            {c.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                                <td>
                                    <span className="badge badge-accent">{c.vehicle_count} car{c.vehicle_count !== 1 ? 's' : ''}</span>
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            id={`crm-view-customer-${c.id}`}
                                            onClick={() => onViewCustomer(c)}
                                        >View</button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => { if (confirm(`Remove customer "${c.name}"? Their vehicles will be unlinked.`)) deleteMutation.mutate(c.id) }}
                                        >Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// VEHICLES TAB
// ════════════════════════════════════════════════════════════════════════════

function VehiclesTab({
    search,
    onAssignOwner,
    onRegisterVehicle,
}: {
    search: string
    onAssignOwner: (v: Vehicle) => void
    onRegisterVehicle: (prefill: { registry: string; vin: string }) => void
}) {
    const qc = useQueryClient()

    const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
        queryKey: ['crm', 'vehicles'],
        queryFn: () => shopApiClient.get<Vehicle[]>('/crm/vehicles?limit=200').then(r => r.data),
    })

    const { data: customers = [] } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'customers'],
        queryFn: () => shopApiClient.get<VehicleOwner[]>('/crm/customers?limit=200').then(r => r.data),
    })

    const { data: jobCards = [] } = useQuery<JobCard[]>({
        queryKey: ['crm', 'job-cards'],
        queryFn: () => shopApiClient.get<JobCard[]>('/job-cards?limit=100').then(r => r.data),
    })

    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

    const ownerMap = Object.fromEntries(customers.map(c => [c.id, c]))

    const updateRegistryMutation = useMutation({
        mutationFn: ({ oldRegistry, newRegistry }: { oldRegistry: string; newRegistry: string }) =>
            shopApiClient.put(`/vehicles/${encodeURIComponent(oldRegistry)}`, { registry: newRegistry }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['crm', 'vehicles'] })
            qc.invalidateQueries({ queryKey: ['crm', 'job-cards'] })
        },
    })

    const pendingActions = useMemo(() => {
        const toCreate: { registry: string; vin: string }[] = []
        const toUpdate: { registry: string; vin: string; oldRegistry: string }[] = []

        const registeredVins = new Set(vehicles.map(v => v.vin.trim().toUpperCase()))
        const registeredRegistries = new Set(vehicles.map(v => v.registry.trim().toUpperCase()))

        const seenVins = new Set<string>()
        const seenRegistries = new Set<string>()

        jobCards.forEach(jc => {
            const vin = jc.vehicle_vin?.trim().toUpperCase()
            const registry = jc.vehicle_registry?.trim().toUpperCase()
            if (!vin || !registry) return

            if (seenVins.has(vin) || seenRegistries.has(registry) || dismissedAlerts.includes(vin)) return

            const vinExists = registeredVins.has(vin)
            const registryExists = registeredRegistries.has(registry)

            if (!vinExists) {
                toCreate.push({ registry: jc.vehicle_registry, vin: jc.vehicle_vin })
                seenVins.add(vin)
                seenRegistries.add(registry)
            } else if (!registryExists) {
                const existingVehicle = vehicles.find(v => v.vin.trim().toUpperCase() === vin)
                if (existingVehicle && existingVehicle.registry.trim().toUpperCase() !== registry) {
                    toUpdate.push({
                        registry: jc.vehicle_registry,
                        vin: jc.vehicle_vin,
                        oldRegistry: existingVehicle.registry,
                    })
                    seenVins.add(vin)
                    seenRegistries.add(registry)
                }
            }
        })

        return { toCreate, toUpdate }
    }, [vehicles, jobCards, dismissedAlerts])

    const filtered = vehicles.filter(v =>
        !search ||
        v.registry.toLowerCase().includes(search.toLowerCase()) ||
        v.vin.toLowerCase().includes(search.toLowerCase()) ||
        (v.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (v.brand ?? '').toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) return <LoadingState label="Loading vehicles…" />

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── Alerts for New/Mismatched Vehicles ── */}
            {(pendingActions.toCreate.length > 0 || pendingActions.toUpdate.length > 0) && (
                <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    animation: 'fadeIn 0.2s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--accent-light)' }}>
                        <span>🔍</span>
                        <span>Unregistered / Updated Vehicles Detected in Job Cards</span>
                        <span className="badge badge-accent" style={{ fontSize: 10, padding: '2px 6px', textTransform: 'none' }}>
                            {pendingActions.toCreate.length + pendingActions.toUpdate.length} Suggestion(s)
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingActions.toCreate.map(action => (
                            <div key={action.vin} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-tertiary)',
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid var(--border-subtle)',
                            }}>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                    🚗 New vehicle detected: License Plate <strong style={{ color: 'var(--accent-light)' }}>{action.registry}</strong> (VIN: <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{action.vin}</code>)
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setDismissedAlerts(prev => [...prev, action.vin.trim().toUpperCase()])}
                                    >
                                        Ignore
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => onRegisterVehicle({ registry: action.registry, vin: action.vin })}
                                    >
                                        Create Profile
                                    </button>
                                </div>
                            </div>
                        ))}

                        {pendingActions.toUpdate.map(action => (
                            <div key={action.vin} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-tertiary)',
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid var(--border-subtle)',
                            }}>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                    🔄 License plate mismatch: VIN <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{action.vin}</code> has plate <strong style={{ color: 'var(--warning)' }}>{action.registry}</strong> in Job Cards, but profile has <strong style={{ color: 'var(--text-secondary)' }}>{action.oldRegistry}</strong>.
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setDismissedAlerts(prev => [...prev, action.vin.trim().toUpperCase()])}
                                    >
                                        Ignore
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
                                        disabled={updateRegistryMutation.isPending}
                                        onClick={async () => {
                                            if (confirm(`Update license plate for VIN ${action.vin} from "${action.oldRegistry}" to "${action.registry}"?`)) {
                                                try {
                                                    await updateRegistryMutation.mutateAsync({
                                                        oldRegistry: action.oldRegistry,
                                                        newRegistry: action.registry,
                                                    })
                                                } catch (e: any) {
                                                    alert(e?.response?.data?.detail ?? 'Failed to update license plate.')
                                                }
                                            }
                                        }}
                                    >
                                        {updateRegistryMutation.isPending ? 'Updating…' : 'Update Profile'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Plate / Registry</th>
                            <th>VIN</th>
                            <th>Make</th>
                            <th>Model</th>
                            <th>Owner</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                                {search ? 'No vehicles match your search.' : 'No vehicles linked to this shop yet.'}
                            </td></tr>
                        ) : filtered.map(v => {
                            const owner = v.owner_id ? ownerMap[v.owner_id] : null
                            return (
                                <tr key={v.registry}>
                                    <td style={{ fontWeight: 600 }}>
                                        {v.registry}
                                        {v.past_registry_num && v.past_registry_num.length > 0 && (
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                                                Prev: {v.past_registry_num.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{v.vin}</td>
                                    <td>{v.company ?? v.make ?? '—'}</td>
                                    <td>{v.brand ?? v.model ?? '—'}</td>
                                    <td>
                                        {owner ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="badge badge-success">✓</span>
                                                {owner.name}
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">Unassigned</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            id={`crm-assign-owner-${v.registry}`}
                                            onClick={() => onAssignOwner(v)}
                                        >
                                            {owner ? '🔄 Change Owner' : '👤 Assign Owner'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// JOB CARDS TAB
// ════════════════════════════════════════════════════════════════════════════

function JobCardsTab({
    search,
    onNotify,
    onAssignOwner,
}: {
    search: string
    onNotify: (c: VehicleOwner, jc: JobCard) => void
    onAssignOwner: (v: Vehicle) => void
}) {
    const { data: customers = [] } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'customers'],
        queryFn: () => shopApiClient.get<VehicleOwner[]>('/crm/customers?limit=200').then(r => r.data),
    })

    const { data: vehicles = [] } = useQuery<Vehicle[]>({
        queryKey: ['crm', 'vehicles'],
        queryFn: () => shopApiClient.get<Vehicle[]>('/crm/vehicles?limit=200').then(r => r.data),
    })

    // Build registry → owner map
    const ownerMap = Object.fromEntries(customers.map(c => [c.id, c]))
    const vehicleOwnerMap: Record<string, VehicleOwner | undefined> = {}
    vehicles.forEach(v => {
        if (v.owner_id && ownerMap[v.owner_id]) {
            vehicleOwnerMap[v.registry] = ownerMap[v.owner_id]
        }
    })

    const { data: jobCards = [], isLoading } = useQuery<JobCard[]>({
        queryKey: ['crm', 'job-cards'],
        queryFn: () => shopApiClient.get<JobCard[]>('/job-cards?limit=100').then(r => r.data),
    })

    const filtered = jobCards.filter(j =>
        !search ||
        j.vehicle_registry.toLowerCase().includes(search.toLowerCase()) ||
        j.vehicle_vin.toLowerCase().includes(search.toLowerCase()) ||
        j.status.includes(search.toLowerCase())
    )

    if (isLoading) return <LoadingState label="Loading job cards…" />

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Registry</th>
                        <th>VIN</th>
                        <th>Customer</th>
                        <th>Parts</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Notify</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                            {search ? 'No job cards match your search.' : 'No job cards found.'}
                        </td></tr>
                    ) : filtered.map(j => {
                        const owner = vehicleOwnerMap[j.vehicle_registry]
                        return (
                            <tr key={j.job_card_id}>
                                <td style={{ fontWeight: 600 }}>{j.vehicle_registry}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{j.vehicle_vin}</td>
                                <td>
                                    {owner
                                        ? <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{owner.name}</span>
                                        : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No owner linked</span>
                                    }
                                </td>
                                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                    {j.parts_affected}
                                </td>
                                <td><StatusBadge status={j.status} /></td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                    {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                                </td>
                                <td>
                                    {j.status === 'completed' && owner ? (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            id={`crm-notify-${j.job_card_id}`}
                                            style={{ color: 'var(--success)', borderColor: 'rgba(16,185,129,0.3)' }}
                                            onClick={() => onNotify(owner, j)}
                                        >
                                            🔔 Notify
                                        </button>
                                    ) : owner ? (
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not ready</span>
                                    ) : (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => onAssignOwner({
                                                registry: j.vehicle_registry,
                                                vin: j.vehicle_vin,
                                                company: '',
                                                brand: '',
                                                active_status: true,
                                            })}
                                        >
                                            👤 Assign Customer
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER DRAWER
// ════════════════════════════════════════════════════════════════════════════

function CustomerDrawer({
    customer,
    onClose,
    onNotify,
}: {
    customer: VehicleOwner
    onClose: () => void
    onNotify: (c: VehicleOwner, jc: JobCard) => void
}) {
    const qc = useQueryClient()

    const { data: detail, isLoading } = useQuery<VehicleOwnerDetail>({
        queryKey: ['crm', 'customers', customer.id],
        queryFn: () => shopApiClient.get<VehicleOwnerDetail>(`/crm/customers/${customer.id}`).then(r => r.data),
    })

    const { data: jobCards = [] } = useQuery<JobCard[]>({
        queryKey: ['crm', 'customer-jc', customer.id],
        queryFn: () => shopApiClient.get<JobCard[]>(`/crm/customers/${customer.id}/job-cards`).then(r => r.data),
    })

    // Edit state
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState({ name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '' })

    const editMutation = useMutation({
        mutationFn: (payload: typeof editForm) => shopApiClient.patch(`/crm/customers/${customer.id}`, payload).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['crm', 'customers'] })
            qc.invalidateQueries({ queryKey: ['crm', 'customers', customer.id] })
            setEditing(false)
        },
    })

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    zIndex: 200, backdropFilter: 'blur(2px)',
                }}
            />

            {/* Drawer panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 420, background: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-subtle)',
                zIndex: 201, overflow: 'auto',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
                animation: 'slideInRight 0.22s ease',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-tertiary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: 15, background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                            {customer.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{customer.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {detail?.vehicle_count ?? customer.vehicle_count} vehicle(s)
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                {isLoading ? (
                    <LoadingState label="Loading customer details…" />
                ) : (
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* Contact info */}
                        <Section title="Contact Info" action={
                            editing ? undefined : <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                        }>
                            {editing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Name</label>
                                        <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" placeholder="e.g. 055 000 0000" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" placeholder="customer@email.com" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            disabled={editMutation.isPending || !editForm.name}
                                            onClick={() => editMutation.mutate({ ...editForm, name: capitalizeName(editForm.name) })}
                                        >
                                            {editMutation.isPending ? 'Saving…' : '💾 Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                                    <InfoField label="Phone" value={customer.phone || '—'} />
                                    <InfoField label="Email" value={customer.email || '—'} />
                                </div>
                            )}
                        </Section>

                        {/* Vehicles */}
                        <Section title={`Vehicles (${detail?.vehicles.length ?? 0})`}>
                            {!detail?.vehicles.length ? (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No vehicles assigned to this customer.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {detail.vehicles.map(v => (
                                        <div key={v.registry} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 14px', background: 'var(--bg-tertiary)',
                                            borderRadius: 8, border: '1px solid var(--border-subtle)',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>🚗 {v.registry}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{v.vin}</div>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                                                {v.company ?? v.make ?? '—'} {v.brand ?? v.model ?? ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>

                        {/* Job Cards */}
                        <Section title={`Job Cards (${jobCards.length})`}>
                            {jobCards.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No job cards found for this customer's vehicles.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {jobCards.map((jc: any) => (
                                        <div key={jc.$id} style={{
                                            padding: '12px 14px', background: 'var(--bg-tertiary)',
                                            borderRadius: 8, border: '1px solid var(--border-subtle)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>📋 {jc.vehicle_registry}</div>
                                                <StatusBadge status={jc.status} />
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{jc.parts_affected}</div>
                                            {jc.status === 'completed' && (
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ marginTop: 8, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
                                                    onClick={() => onNotify(customer, {
                                                        job_card_id: jc.$id, vehicle_vin: jc.vehicle_vin,
                                                        vehicle_registry: jc.vehicle_registry, upload_mechanic: jc.upload_mechanic,
                                                        parts_affected: jc.parts_affected, details: jc.details, status: jc.status,
                                                    })}
                                                >🔔 Send Notification</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </div>
                )}
            </div>
        </>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// MODALS
// ════════════════════════════════════════════════════════════════════════════

function AddCustomerModal({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient()
    const [form, setForm] = useState({ name: '', phone: '', email: '' })
    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: () => shopApiClient.post('/crm/customers', {
            ...form,
            name: capitalizeName(form.name)
        }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'customers'] }); onClose() },
        onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create customer.'),
    })

    return (
        <ModalShell title="👤 New Customer" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px' }}>
                <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input id="crm-customer-name" className="form-input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input id="crm-customer-phone" className="form-input" placeholder="055 000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input id="crm-customer-email" className="form-input" type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                {error && <ErrorBanner msg={error} />}
            </div>
            <ModalFooter
                onClose={onClose}
                onConfirm={() => mutation.mutate()}
                confirmLabel="Create Customer"
                isPending={mutation.isPending}
                disabled={!form.name}
            />
        </ModalShell>
    )
}

function LinkCustomerModal({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient()
    const [query, setQuery] = useState('')
    const [linked, setLinked] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)

    const { data: results = [], isFetching } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'global-search', query],
        queryFn: () => {
            if (query.length < 2) return Promise.resolve([])
            return shopApiClient
                .get<VehicleOwner[]>(`/crm/customers/search-global?q=${encodeURIComponent(query)}`)
                .then(r => r.data)
        },
        enabled: query.length >= 2,
    })

    const linkMutation = useMutation({
        mutationFn: (customerId: string) =>
            shopApiClient.post(`/crm/customers/link?customer_id=${customerId}`).then(r => r.data),
        onSuccess: (_data, customerId) => {
            setLinked(prev => new Set(prev).add(customerId))
            qc.invalidateQueries({ queryKey: ['crm', 'customers'] })
            setError(null)
        },
        onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to link customer.'),
    })

    return (
        <ModalShell title="🔗 Link Existing Customer" onClose={onClose}>
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Search the network for an existing customer profile and link them to your shop.
                </p>

                <div className="form-group">
                    <label className="form-label">Search by name</label>
                    <input
                        id="crm-link-search"
                        className="form-input"
                        placeholder="Type at least 2 characters…"
                        value={query}
                        autoFocus
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>

                {isFetching && <LoadingState label="Searching…" />}

                {!isFetching && results.length === 0 && query.length >= 2 && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                        No customers found for "{query}".
                    </div>
                )}

                {results.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                        {results.map(c => (
                            <div key={c.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px', background: 'var(--bg-tertiary)',
                                borderRadius: 8, border: '1px solid var(--border-subtle)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: 'var(--accent-dim)', color: 'var(--accent-light)', flexShrink: 0 }}>
                                        {c.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {c.phone && `📞 ${c.phone}`}{c.phone && c.email && '  '}{c.email && `✉ ${c.email}`}
                                        </div>
                                    </div>
                                </div>
                                {linked.has(c.id) ? (
                                    <span className="badge badge-success">✓ Linked</span>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={linkMutation.isPending}
                                        onClick={() => linkMutation.mutate(c.id)}
                                    >
                                        Link
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {error && <ErrorBanner msg={error} />}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onClose}>Done</button>
            </div>
        </ModalShell>
    )
}

function AddVehicleModal({
    onClose,
    prefill,
}: {
    onClose: () => void
    prefill?: { registry: string; vin: string }
}) {
    const qc = useQueryClient()
    const [form, setForm] = useState({
        registry: prefill?.registry ?? '',
        vin: prefill?.vin ?? '',
        company: '',
        brand: '',
        owner_id: ''
    })
    const [error, setError] = useState<string | null>(null)

    const { data: customers = [] } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'customers'],
        queryFn: () => shopApiClient.get<VehicleOwner[]>('/crm/customers?limit=200').then(r => r.data),
    })

    const mutation = useMutation({
        mutationFn: () => shopApiClient.post('/crm/vehicles', {
            registry: form.registry,
            vin: form.vin,
            company: capitalizeName(form.company),
            brand: capitalizeName(form.brand),
            owner_id: form.owner_id || undefined,
        }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'vehicles'] }); onClose() },
        onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to register vehicle.'),
    })

    return (
        <ModalShell title="🚗 Register Vehicle" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">License Plate *</label>
                        <input id="crm-vehicle-registry" className="form-input" placeholder="GR 1234-23" value={form.registry} onChange={e => setForm(f => ({ ...f, registry: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">VIN *</label>
                        <input id="crm-vehicle-vin" className="form-input" placeholder="17-char VIN" value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Make / Company *</label>
                        <input className="form-input" placeholder="Toyota" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Model / Brand *</label>
                        <input className="form-input" placeholder="Corolla" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Assign to Customer (optional)</label>
                    <select className="form-input form-select" value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
                        <option value="">— Select customer —</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                {error && <ErrorBanner msg={error} />}
            </div>
            <ModalFooter
                onClose={onClose}
                onConfirm={() => mutation.mutate()}
                confirmLabel="Register Vehicle"
                isPending={mutation.isPending}
                disabled={!form.registry || !form.vin || !form.company || !form.brand}
            />
        </ModalShell>
    )
}

function AssignOwnerModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
    const qc = useQueryClient()
    const [selectedId, setSelectedId] = useState(vehicle.owner_id ?? '')
    const [error, setError] = useState<string | null>(null)

    const { data: customers = [] } = useQuery<VehicleOwner[]>({
        queryKey: ['crm', 'customers'],
        queryFn: () => shopApiClient.get<VehicleOwner[]>('/crm/customers?limit=200').then(r => r.data),
    })

    const mutation = useMutation({
        mutationFn: () => shopApiClient.patch(`/crm/vehicles/${encodeURIComponent(vehicle.registry)}/owner`, { owner_id: selectedId || null }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'vehicles'] }); qc.invalidateQueries({ queryKey: ['crm', 'customers'] }); onClose() },
        onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to assign owner.'),
    })

    return (
        <ModalShell title={`🔗 Assign Owner — ${vehicle.registry}`} onClose={onClose}>
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Select a customer to link to vehicle <strong style={{ color: 'var(--text-primary)' }}>{vehicle.registry}</strong>.
                </p>
                <div className="form-group">
                    <label className="form-label">Customer</label>
                    <select className="form-input form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                        <option value="">— Unassign / remove owner —</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
                    </select>
                </div>
                {error && <ErrorBanner msg={error} />}
            </div>
            <ModalFooter
                onClose={onClose}
                onConfirm={() => mutation.mutate()}
                confirmLabel="Confirm Assignment"
                isPending={mutation.isPending}
            />
        </ModalShell>
    )
}

function NotifyModal({ customer, jobCard, onClose }: { customer: VehicleOwner; jobCard: JobCard; onClose: () => void }) {
    const qc = useQueryClient()
    const [isVerified, setIsVerified] = useState(!!customer.phone_verified)
    const [sentCode, setSentCode] = useState(false)
    const [code, setCode] = useState('')
    const [verifError, setVerifError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const [customMsg, setCustomMsg] = useState('')
    const [result, setResult] = useState<NotifyResponse | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Direct in-app SMS state
    const [sendingSms, setSendingSms] = useState(false)
    const [smsSent, setSmsSent] = useState(false)
    const [sendSmsError, setSendSmsError] = useState<string | null>(null)

    // OTP Mutations
    const sendOtpMutation = useMutation({
        mutationFn: () => shopApiClient.post(`/crm/customers/${customer.id}/otp/send`, { phone: customer.phone }).then(r => r.data),
        onSuccess: () => {
            setSentCode(true)
            setVerifError(null)
        },
        onError: (err: any) => {
            setVerifError(err?.response?.data?.detail ?? 'Failed to send verification code.')
        }
    })

    const verifyOtpMutation = useMutation({
        mutationFn: () => shopApiClient.post(`/crm/customers/${customer.id}/otp/verify`, { phone: customer.phone, code }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['crm', 'customers'] })
            setIsVerified(true)
            setSuccessMsg('Phone number verified successfully! ✅')
            setVerifError(null)
        },
        onError: (err: any) => {
            setVerifError(err?.response?.data?.detail ?? 'Failed to verify code.')
        }
    })

    const resendOtpMutation = useMutation({
        mutationFn: () => shopApiClient.post(`/crm/customers/${customer.id}/otp/resend`, { phone: customer.phone }).then(r => r.data),
        onSuccess: (data: any) => {
            setVerifError(null)
            alert(data.message || 'OTP code resent successfully!')
        },
        onError: (err: any) => {
            setVerifError(err?.response?.data?.detail ?? 'Failed to resend verification code.')
        }
    })

    const mutation = useMutation({
        mutationFn: () => shopApiClient.post<NotifyResponse>(`/crm/customers/${customer.id}/notify`, {
            job_card_id: jobCard.job_card_id,
            message: customMsg || undefined,
        }).then(r => r.data),
        onSuccess: data => setResult(data),
        onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to prepare notification.'),
    })

    const triggerSendSms = async (phone: string, message: string) => {
        setSendingSms(true)
        setSendSmsError(null)
        try {
            await shopApiClient.post(`/crm/customers/${customer.id}/send-sms`, {
                phone,
                message
            })
            setSmsSent(true)
        } catch (e: any) {
            setSendSmsError(e?.response?.data?.detail ?? 'Failed to send SMS through the app.')
        } finally {
            setSendingSms(false)
        }
    }

    return (
        <ModalShell title="🔔 Customer Notification" onClose={onClose}>
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!result ? (
                    !isVerified ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{customer.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    📞 {customer.phone || <span style={{ color: 'var(--danger)' }}>No phone number on file</span>}
                                </div>
                            </div>

                            {!customer.phone ? (
                                <div style={{
                                    padding: '14px', background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10,
                                    textAlign: 'center', color: 'var(--danger)', fontSize: 13
                                }}>
                                    ⚠️ Verification impossible: This customer does not have a phone number on file. Please add a phone number to their profile.
                                </div>
                            ) : (
                                <div style={{
                                    padding: '16px', background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-subtle)', borderRadius: 10,
                                    display: 'flex', flexDirection: 'column', gap: 14
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🔐</span> Phone Verification Required
                                    </div>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                                        Before sending SMS notifications, please verify the customer's phone number.
                                    </p>

                                    {!sentCode ? (
                                        <button
                                            className="btn btn-primary"
                                            style={{ alignSelf: 'flex-start' }}
                                            onClick={() => sendOtpMutation.mutate()}
                                            disabled={sendOtpMutation.isPending}
                                        >
                                            {sendOtpMutation.isPending ? 'Sending Code…' : '📨 Send Verification Code'}
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ fontSize: 11, padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, color: 'var(--accent-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>💡 Check customer's phone for code. (Demo: use code <strong>1234</strong>)</span>
                                                <button
                                                    onClick={() => resendOtpMutation.mutate()}
                                                    disabled={resendOtpMutation.isPending}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', textDecoration: 'underline', cursor: 'pointer', fontSize: 11 }}
                                                >
                                                    {resendOtpMutation.isPending ? 'Resending…' : 'Resend OTP'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Enter 4-digit code"
                                                    value={code}
                                                    maxLength={4}
                                                    onChange={e => setCode(e.target.value)}
                                                    style={{ maxWidth: 160 }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={verifyOtpMutation.isPending || code.length < 4}
                                                    onClick={() => verifyOtpMutation.mutate()}
                                                >
                                                    {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {verifError && <ErrorBanner msg={verifError} />}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {successMsg && (
                                <div style={{
                                    padding: '10px 14px', background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8,
                                    color: 'var(--success)', fontSize: 13
                                }}>
                                    {successMsg}
                                </div>
                            )}

                            <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preparing notification for</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{customer.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    {customer.phone && <span>📞 {customer.phone} <span style={{ color: 'var(--success)', fontWeight: 600 }}>(Verified ✅)</span> &nbsp;</span>}
                                    {customer.email && <span>✉️ {customer.email}</span>}
                                </div>
                            </div>

                            <InfoField label="Vehicle" value={jobCard.vehicle_registry} />
                            <InfoField label="Job Card ID" value={jobCard.job_card_id} mono />

                            <div className="form-group">
                                <label className="form-label">Custom Message (optional)</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    placeholder="Leave blank to use the default message…"
                                    value={customMsg}
                                    onChange={e => setCustomMsg(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            {error && <ErrorBanner msg={error} />}
                        </>
                    )
                ) : (
                    /* Success state */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Notification Ready</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                Contact the customer using the SMS action below.
                            </div>
                        </div>

                        <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10 }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Notification Message</div>
                            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{result.message}</div>
                        </div>

                        {result.customer_phone && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {smsSent ? (
                                    <div style={{
                                        padding: '12px 14px', background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8,
                                        color: '#10b981', fontSize: 13, textAlign: 'center', fontWeight: 600
                                    }}>
                                        📱 SMS sent successfully directly through the app! ✅
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}
                                            disabled={sendingSms}
                                            onClick={() => triggerSendSms(result.customer_phone!, result.message)}
                                        >
                                            {sendingSms ? (
                                                <><div className="spinner" style={{ width: 14, height: 14 }} /> Sending SMS…</>
                                            ) : (
                                                '💬 Send SMS (Default)'
                                            )}
                                        </button>
                                        {sendSmsError && <ErrorBanner msg={sendSmsError} />}
                                    </>
                                )}

                                <div style={{ textAlign: 'center', marginTop: 4 }}>
                                    <a
                                        href={`sms:${result.customer_phone}?body=${encodeURIComponent(result.message)}`}
                                        style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'underline' }}
                                    >
                                        Or launch native messaging client fallback
                                    </a>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                            {result.customer_phone && (
                                <a href={`tel:${result.customer_phone}`} style={{ textDecoration: 'none' }}>
                                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>📞 Call</button>
                                </a>
                            )}
                            {result.customer_email && (
                                <a href={`mailto:${result.customer_email}?subject=Vehicle Ready&body=${encodeURIComponent(result.message)}`}>
                                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>✉️ Email</button>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
                {!result && isVerified && (
                    <button
                        className="btn btn-primary"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate()}
                    >
                        {mutation.isPending ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Preparing…</> : '🔔 Prepare Notification'}
                    </button>
                )}
            </div>
        </ModalShell>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '95vw' }}>
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: '16px 0' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

function ModalFooter({
    onClose, onConfirm, confirmLabel, isPending, disabled,
}: {
    onClose: () => void
    onConfirm: () => void
    confirmLabel: string
    isPending: boolean
    disabled?: boolean
}) {
    return (
        <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={isPending || disabled} onClick={onConfirm}>
                {isPending ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : confirmLabel}
            </button>
        </div>
    )
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
                    {title}
                </div>
                {action}
            </div>
            {children}
        </div>
    )
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: 3 }}>
                {label}
            </div>
            <div style={{ fontSize: 13, fontFamily: mono ? 'monospace' : undefined, color: 'var(--text-primary)' }}>
                {value}
            </div>
        </div>
    )
}

function StatChip({ icon, label, value }: { icon: string; label: string; value: number }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)', borderRadius: 10,
            minWidth: 160,
        }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
            </div>
        </div>
    )
}

function LoadingState({ label }: { label: string }) {
    return (
        <div className="loading-state">
            <div className="spinner" />
            <span>{label}</span>
        </div>
    )
}

function ErrorBanner({ msg }: { msg: string }) {
    return (
        <div style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, color: 'var(--danger)', fontSize: 13,
        }}>
            ⚠️ {msg}
        </div>
    )
}
