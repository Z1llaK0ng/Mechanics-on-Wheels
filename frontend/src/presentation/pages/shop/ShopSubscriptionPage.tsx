import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useShopAuthStore, useModulesCatalogue } from '../../hooks/useShopAuth'
import shopApiClient from '../../../infrastructure/api/shopClient'

const MODULE_META: Record<string, { icon: string; label: string }> = {
    'job-cards':  { icon: '🔧', label: 'Job Cards' },
    'inventory':  { icon: '📦', label: 'Inventory & Parts' },
    'crm':        { icon: '👥', label: 'Customer Relationships' },
    'invoicing':  { icon: '🧾', label: 'Invoicing & Billing' },
    'employees':  { icon: '👨‍🔧', label: 'Employee Management' },
    'global-db':  { icon: '🌐', label: 'Global Database' },
}

export default function ShopSubscriptionPage() {
    const user = useShopAuthStore((s) => s.user)
    const qc   = useQueryClient()
    const { data: catalogue = [] } = useModulesCatalogue()

    // ── Live subscriptions ─────────────────────────────────────────────────────
    const { data: activeIds = [] } = useQuery<string[]>({
        queryKey: ['shop', 'subscriptions'],
        enabled: !!user,
        queryFn: async () => {
            const { data } = await shopApiClient.get<string[]>('/subscriptions/shop-active')
            return data
        },
    })

    // base IDs only (strip _monthly / _yearly)
    const activeBaseIds = [...new Set(activeIds.map(id => id.split('_')[0]))]

    const activeMods = catalogue.filter((m: any) => activeBaseIds.includes(m.id))

    // ── Mechanics list ─────────────────────────────────────────────────────────
    const { data: mechanics = [] } = useQuery({
        queryKey: ['shop', 'mechanics', user?.shopId],
        enabled: !!user?.shopId,
        queryFn: async () => {
            const { data } = await shopApiClient.get(`/shops/${user!.shopId}/mechanics`)
            return data.map((m: any) => ({
                id:    m.id,
                name:  m.full_name ?? `${m.first_name} ${m.last_name}`.trim(),
                email: m.email,
                staffrole: m.staffrole ?? 'technician',
                permittedModules: m.permitted_modules ?? [],
            }))
        },
    })

    // ── Module access mutation (patch mechanic's permitted_modules) ─────────────
    const accessMutation = useMutation({
        mutationFn: async ({ mechanicId, modules }: { mechanicId: string; modules: string[] }) => {
            await shopApiClient.patch(`/shops/mechanics/${mechanicId}/modules`, { permitted_modules: modules })
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'mechanics', user?.shopId] }),
    })

    // ── Expanded state per module card ─────────────────────────────────────────
    const [expanded, setExpanded] = useState<string | null>(null)
    const [togglingAll, setTogglingAll] = useState<string | null>(null) // track loading state for the toggle

    const toggleAccess = (mechanicId: string, moduleId: string, currentModules: string[]) => {
        const updated = currentModules.includes(moduleId)
            ? currentModules.filter(m => m !== moduleId)
            : [...currentModules, moduleId]
        accessMutation.mutate({ mechanicId, modules: updated })
    }

    const handleToggleAll = async (moduleId: string, grantToAll: boolean) => {
        setTogglingAll(moduleId)
        const promises = mechanics.map((mec: any) => {
            const hasAccess = mec.permittedModules.includes(moduleId)
            if (grantToAll && !hasAccess) {
                return accessMutation.mutateAsync({ mechanicId: mec.id, modules: [...mec.permittedModules, moduleId] })
            } else if (!grantToAll && hasAccess) {
                return accessMutation.mutateAsync({ mechanicId: mec.id, modules: mec.permittedModules.filter((m: string) => m !== moduleId) })
            }
            return Promise.resolve()
        })
        await Promise.all(promises)
        setTogglingAll(null)
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Subscriptions</h1>
                <p>Manage active modules and control staff &amp; technician access</p>
            </div>

            {activeMods.length === 0 ? (
                <div className="loading-state">
                    <span style={{ fontSize: 40 }}>📦</span>
                    <p>No active subscriptions yet.</p>
                    <a href="/shop/marketplace" className="btn btn-primary">Browse Marketplace</a>
                </div>
            ) : activeMods.map((mod: any) => {
                const meta = MODULE_META[mod.id] ?? { icon: '🧩', label: mod.name }
                const isOpen = expanded === mod.id

                // Determine if all mechanics currently have access
                const allHaveAccess = mechanics.length > 0 && mechanics.every((m: any) => m.permittedModules.includes(mod.id))
                const isToggling = togglingAll === mod.id

                return (
                    <div key={mod.id} className="card" style={{ marginBottom: 20 }}>
                        {/* ── Module header ── */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ fontSize: 28 }}>{meta.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{mod.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active subscription</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span className="badge badge-success">Active</span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setExpanded(isOpen ? null : mod.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    👥 Manage Access
                                    <span style={{ fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                                </button>
                            </div>
                        </div>

                        {/* ── Access dropdown ── */}
                        {isOpen && (
                            <div style={{ marginTop: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Staff &amp; Technician Access
                                    </div>
                                    {mechanics.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isToggling ? 0.5 : 1, pointerEvents: isToggling ? 'none' : 'auto' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Grant to All</span>
                                            <label className="shop-toggle" title="Toggle access for all mechanics">
                                                <input
                                                    type="checkbox"
                                                    checked={allHaveAccess}
                                                    onChange={(e) => handleToggleAll(mod.id, e.target.checked)}
                                                />
                                                <span className="shop-toggle-slider" />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {mechanics.length === 0 ? (
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No mechanics added yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {mechanics.map((mec: any) => {
                                            const hasAccess = mec.permittedModules.includes(mod.id)
                                            return (
                                                <div key={mec.id} className="shop-mechanic-row">
                                                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                                        {mec.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{mec.name}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                            {mec.email} · {mec.staffrole === 'staff' ? '🗂️ Staff' : '🔧 Technician'}
                                                        </div>
                                                    </div>
                                                    <label className="shop-toggle" title={`Toggle ${mec.name}'s access to ${mod.name}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={hasAccess}
                                                            onChange={() => toggleAccess(mec.id, mod.id, mec.permittedModules)}
                                                            disabled={isToggling}
                                                        />
                                                        <span className="shop-toggle-slider" />
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
