import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useShopAuthStore } from '../../hooks/useShopAuth'
import shopApiClient from '../../../infrastructure/api/shopClient'
import { capitalizeName } from '../../utils'

type StaffRole = 'technician' | 'staff'

interface PersonRow {
    id: string
    name: string
    email: string
    active: boolean
    staffrole: StaffRole
    permittedModules: string[]
    can_push_global_db: boolean
}

// ── Role-change panel ─────────────────────────────────────────────────────────
function RoleChangePanel({
    people,
    onRoleChange,
}: {
    people: PersonRow[]
    onRoleChange: (id: string, role: StaffRole) => void
}) {
    const [selectedId, setSelectedId] = useState<string>('')
    const [selectedRole, setSelectedRole] = useState<StaffRole>('technician')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

    const selected = people.find(p => p.id === selectedId)

    // When a person is picked, pre-fill with their current role
    const handleSelect = (id: string) => {
        setSelectedId(id)
        const person = people.find(p => p.id === id)
        if (person) setSelectedRole(person.staffrole)
        setMsg(null)
    }

    const handleSave = async () => {
        if (!selectedId || !selected) return
        if (selectedRole === selected.staffrole) {
            setMsg({ text: 'No change — role is already ' + selectedRole + '.', ok: false })
            return
        }
        setSaving(true)
        try {
            await onRoleChange(selectedId, selectedRole)
            setMsg({ text: `✅ ${selected.name} is now a ${selectedRole}.`, ok: true })
            setSelectedId('')
        } catch {
            setMsg({ text: 'Failed to update role. Please try again.', ok: false })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Change Member Role
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, marginTop: 0 }}>
                Select an existing member and assign them a new role. They will move between tables immediately.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {/* Member picker */}
                <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                    <label className="form-label">Member</label>
                    <select
                        className="form-input"
                        value={selectedId}
                        onChange={e => handleSelect(e.target.value)}
                    >
                        <option value="">— Select a member —</option>
                        {people.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.staffrole})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Role picker */}
                <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                    <label className="form-label">New Role</label>
                    <select
                        className="form-input"
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value as StaffRole)}
                        disabled={!selectedId}
                    >
                        <option value="technician">🔧 Technician</option>
                        <option value="staff">🗂️ Staff</option>
                    </select>
                </div>

                {/* Save button */}
                <button
                    className="btn btn-primary"
                    style={{ marginBottom: 0, alignSelf: 'flex-end' }}
                    onClick={handleSave}
                    disabled={!selectedId || saving}
                >
                    {saving ? 'Saving…' : 'Apply Role'}
                </button>
            </div>

            {msg && (
                <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: msg.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: msg.ok ? '#22c55e' : '#ef4444',
                    border: `1px solid ${msg.ok ? '#22c55e33' : '#ef444433'}`,
                }}>
                    {msg.text}
                </div>
            )}
        </div>
    )
}

// ── Module access panel ───────────────────────────────────────────────────────
function ModuleAccessPanel({
    people,
    shopModules,
    onAccessChange,
}: {
    people: PersonRow[]
    shopModules: string[]
    onAccessChange: (id: string, permitted_modules: string[]) => Promise<void>
}) {
    const [selectedId, setSelectedId] = useState<string>('')
    const [selectedModules, setSelectedModules] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

    const selected = people.find(p => p.id === selectedId)

    const handleSelect = (id: string) => {
        setSelectedId(id)
        const person = people.find(p => p.id === id)
        if (person) setSelectedModules([...(person.permittedModules || [])])
        setMsg(null)
    }

    const toggleMod = (mod: string) => {
        setSelectedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod])
    }

    const handleSave = async () => {
        if (!selectedId || !selected) return
        setSaving(true)
        try {
            await onAccessChange(selectedId, selectedModules)
            setMsg({ text: `✅ Updated module access for ${selected.name}.`, ok: true })
        } catch {
            setMsg({ text: 'Failed to update access. Please try again.', ok: false })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Module Access Control
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, marginTop: 0 }}>
                Manage which modules specific mechanics can access. Only modules your shop is subscribed to are available.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                    <label className="form-label">Member</label>
                    <select
                        className="form-input"
                        value={selectedId}
                        onChange={e => handleSelect(e.target.value)}
                    >
                        <option value="">— Select a member —</option>
                        {people.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.staffrole})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Available Modules</span>
                        {selectedId && shopModules.length > 0 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ padding: '2px 6px', fontSize: 11, height: 'auto', minHeight: 0 }}
                                    onClick={() => setSelectedModules([...shopModules])}
                                >
                                    Grant All
                                </button>
                                <button 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ padding: '2px 6px', fontSize: 11, height: 'auto', minHeight: 0 }}
                                    onClick={() => setSelectedModules([])}
                                >
                                    Revoke All
                                </button>
                            </div>
                        )}
                    </label>
                    {!selectedId ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a member to see options.</div>
                    ) : shopModules.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your shop has no active module subscriptions.</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            {shopModules.map(mod => (
                                <label key={mod} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: '4px 8px', background: 'var(--bg-layer-2)', borderRadius: 6, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={selectedModules.includes(mod)} onChange={() => toggleMod(mod)} />
                                    {mod}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="btn btn-primary"
                    style={{ marginBottom: 0, alignSelf: 'flex-end', marginTop: 16 }}
                    onClick={handleSave}
                    disabled={!selectedId || saving}
                >
                    {saving ? 'Saving…' : 'Save Access'}
                </button>
            </div>

            {msg && (
                <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: msg.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: msg.ok ? '#22c55e' : '#ef4444',
                    border: `1px solid ${msg.ok ? '#22c55e33' : '#ef444433'}`,
                }}>
                    {msg.text}
                </div>
            )}
        </div>
    )
}

// ── Global DB Upload Panel ──────────────────────────────────────────────────
function GlobalDbUploadPanel({
    people,
    onUploadPermissionChange,
}: {
    people: PersonRow[]
    onUploadPermissionChange: (id: string, can_push: boolean) => Promise<void>
}) {
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

    const handleToggle = async (person: PersonRow) => {
        setTogglingId(person.id)
        try {
            const newStatus = !person.can_push_global_db
            await onUploadPermissionChange(person.id, newStatus)
            setMsg({ text: `✅ Updated Global DB upload permission for ${person.name}.`, ok: true })
            setTimeout(() => setMsg(null), 3000)
        } catch {
            setMsg({ text: `Failed to update permission for ${person.name}.`, ok: false })
        } finally {
            setTogglingId(null)
        }
    }

    return (
        <div className="card" style={{ marginBottom: 28, background: 'linear-gradient(to right bottom, #111827, #1f2937)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🌐</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Global DB Upload Permissions
                </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, marginTop: 0 }}>
                Control who is allowed to bulk process and push job cards from this shop to the MoW network.
                <br/>
                <span style={{ opacity: 0.8 }}>Anyone can revoke their own job cards, but pushing requires explicit permission below.</span>
            </p>

            {people.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No members found.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {people.map(person => (
                        <div key={person.id} className="shop-mechanic-row" style={{ background: 'var(--bg-layer-1)', border: '1px solid var(--border-subtle)' }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{person.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {person.email} · {person.staffrole === 'staff' ? '🗂️ Staff' : '🔧 Technician'}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: togglingId === person.id ? 0.5 : 1 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {person.can_push_global_db ? 'Allowed' : 'Denied'}
                                </span>
                                <label className="shop-toggle" title={`Toggle upload access for ${person.name}`}>
                                    <input
                                        type="checkbox"
                                        checked={person.can_push_global_db}
                                        onChange={() => handleToggle(person)}
                                        disabled={togglingId === person.id}
                                    />
                                    <span className="shop-toggle-slider" />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {msg && (
                <div style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: msg.ok ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)',
                    color: msg.ok ? '#4ade80' : '#f87171',
                    border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                }}>
                    {msg.text}
                </div>
            )}
        </div>
    )
}

// ── Single person table ───────────────────────────────────────────────────────
function PersonTable({
    title,
    icon,
    people,
    loading,
    tableRole,
    onToggle,
    onRemove,
    onAdd,
}: {
    title: string
    icon: string
    people: PersonRow[]
    loading: boolean
    tableRole: StaffRole
    onToggle: (id: string) => void
    onRemove: (id: string) => void
    onAdd: (name: string, email: string, password: string) => Promise<void>
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [addError, setAddError] = useState('')
    const [adding, setAdding] = useState(false)

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setAdding(true)
        setAddError('')
        try {
            await onAdd(capitalizeName(form.name), form.email, form.password)
            setForm({ name: '', email: '', password: '' })
            setShowAdd(false)
        } catch (err: any) {
            setAddError(err?.response?.data?.detail || `Failed to add. Please try again.`)
        } finally {
            setAdding(false)
        }
    }

    const label = title.replace(/s$/, '') // "Technicians" → "Technician"

    return (
        <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {people.length} {people.length === 1 ? 'member' : 'members'}
                        </div>
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                    + Add {label}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading && (
                    <div className="loading-state" style={{ padding: '24px 0' }}>
                        <span>Loading {title.toLowerCase()}…</span>
                    </div>
                )}
                {!loading && people.map(person => (
                    <div key={person.id} className="shop-mechanic-row">
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                            {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{person.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{person.email}</div>
                        </div>
                        <div className="shop-mechanic-row-controls">
                            <span className={`badge ${person.active ? 'badge-success' : 'badge-warning'}`}>
                                {person.active ? 'Active' : 'Inactive'}
                            </span>
                            <label className="shop-toggle" title="Toggle active">
                                <input type="checkbox" checked={person.active} onChange={() => onToggle(person.id)} />
                                <span className="shop-toggle-slider" />
                            </label>
                            <button className="btn btn-danger btn-sm" onClick={() => onRemove(person.id)}>
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
                {!loading && people.length === 0 && (
                    <div className="loading-state" style={{ padding: '24px 0' }}>
                        <span>No {title.toLowerCase()} yet. Add one above.</span>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Add {label}</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
                        </div>
                        <form className="modal-form" onSubmit={handleAdd}>
                            {addError && (
                                <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>{addError}</div>
                            )}
                            <div className="form-group">
                                <label className="form-label" htmlFor={`add-${tableRole}-name`}>Full name</label>
                                <input
                                    id={`add-${tableRole}-name`} type="text" className="form-input"
                                    placeholder="Kofi Mensah" required
                                    value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor={`add-${tableRole}-email`}>Email</label>
                                <input
                                    id={`add-${tableRole}-email`} type="email" className="form-input"
                                    placeholder="kofi@myshop.gh" required
                                    value={form.email}
                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor={`add-${tableRole}-pw`}>Temporary password</label>
                                <input
                                    id={`add-${tableRole}-pw`} type="password" className="form-input"
                                    placeholder="••••••••" required
                                    value={form.password}
                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={adding}>
                                    {adding ? 'Adding…' : `Add ${label}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ShopManagementPage() {
    const user = useShopAuthStore(s => s.user)
    const isStaffViewer = user?.role === 'mechanic' && user?.staffrole === 'staff'
    const qc = useQueryClient()

    const { data: allPeople = [], isLoading } = useQuery<PersonRow[]>({
        queryKey: ['shop', 'mechanics', user?.shopId],
        enabled: !!user?.shopId,
        queryFn: async () => {
            if (!user?.shopId) return []
            const { data } = await shopApiClient.get(`/shops/${user.shopId}/mechanics`)
            return data.map((m: any) => ({
                id: m.id,
                name: m.full_name ?? `${m.first_name} ${m.last_name}`.trim(),
                email: m.email,
                active: m.active_status,
                staffrole: (m.staffrole ?? 'technician') as StaffRole,
                permittedModules: m.permitted_modules || [],
                can_push_global_db: m.can_push_global_db || false,
            }))
        },
    })

    const technicians = allPeople.filter(p => p.staffrole === 'technician')
    const staff = allPeople.filter(p => p.staffrole === 'staff')

    const invalidate = () => qc.invalidateQueries({ queryKey: ['shop', 'mechanics', user?.shopId] })

    // Live subscriptions – base IDs only
    const { data: liveSubIds = [] } = useQuery<string[]>({
        queryKey: ['shop', 'subscriptions'],
        enabled: !!user,
        queryFn: async () => {
            const { data } = await shopApiClient.get<string[]>('/subscriptions/shop-active')
            return data
        },
    })
    const liveModules = [...new Set(liveSubIds.map(id => id.split('_')[0]))]

    const toggleMutation = useMutation({
        mutationFn: async (id: string) => { await shopApiClient.patch(`/shops/mechanics/${id}`) },
        onSuccess: invalidate,
    })

    const removeMutation = useMutation({
        mutationFn: async (id: string) => { await shopApiClient.delete(`/shops/mechanics/${id}`) },
        onSuccess: invalidate,
    })

    const roleChangeMutation = useMutation({
        mutationFn: async ({ id, staffrole }: { id: string; staffrole: StaffRole }) => {
            await shopApiClient.patch(`/shops/mechanics/${id}/staffrole`, { staffrole })
        },
        onSuccess: invalidate,
    })

    const moduleAccessMutation = useMutation({
        mutationFn: async ({ id, permitted_modules }: { id: string; permitted_modules: string[] }) => {
            await shopApiClient.patch(`/shops/mechanics/${id}/modules`, { permitted_modules })
        },
        onSuccess: invalidate,
    })

    const globalDbPushMutation = useMutation({
        mutationFn: async ({ id, can_push_global_db }: { id: string; can_push_global_db: boolean }) => {
            await shopApiClient.patch(`/shops/mechanics/${id}/global-db-push`, { can_push_global_db })
        },
        onSuccess: invalidate,
    })

    const handleToggle = (id: string) => toggleMutation.mutate(id)

    const handleRemove = (id: string) => {
        if (!window.confirm('Remove this person?')) return
        removeMutation.mutate(id)
    }

    const handleRoleChange = async (id: string, staffrole: StaffRole) => {
        await roleChangeMutation.mutateAsync({ id, staffrole })
    }

    const handleAccessChange = async (id: string, permitted_modules: string[]) => {
        await moduleAccessMutation.mutateAsync({ id, permitted_modules })
    }

    const handleGlobalDbPushChange = async (id: string, can_push: boolean) => {
        await globalDbPushMutation.mutateAsync({ id, can_push_global_db: can_push })
    }

    const makeAddHandler = (staffrole: StaffRole) =>
        async (name: string, email: string, password: string) => {
            if (!user?.shopId) return
            await shopApiClient.post(`/shops/${user.shopId}/mechanics`, {
                full_name: name,
                email,
                password,
                staffrole,
            })
            invalidate()
        }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>{isStaffViewer ? 'Technicians' : 'Staff Management'}</h1>
                        <p style={{ margin: '4px 0 0' }}>{isStaffViewer ? 'View your shop technicians' : 'Manage your technicians and administrative staff'}</p>
                    </div>
                </div>
            </div>

            {/* ── Role change panel — admin only ── */}
            {!isStaffViewer && (
                <>
                    <RoleChangePanel people={allPeople} onRoleChange={handleRoleChange} />
                    {liveModules.includes('global-db') && (
                        <GlobalDbUploadPanel people={allPeople} onUploadPermissionChange={handleGlobalDbPushChange} />
                    )}
                    <ModuleAccessPanel
                        people={allPeople}
                        shopModules={liveModules}
                        onAccessChange={handleAccessChange}
                    />
                </>
            )}

            {/* ── Technicians table ── */}
            <PersonTable
                title="Technicians"
                icon="🔧"
                people={technicians}
                loading={isLoading}
                tableRole="technician"
                onToggle={handleToggle}
                onRemove={handleRemove}
                onAdd={makeAddHandler('technician')}
            />

            {/* ── Staff table — admin only ── */}
            {!isStaffViewer && (
                <PersonTable
                    title="Staff"
                    icon="🗂️"
                    people={staff}
                    loading={isLoading}
                    tableRole="staff"
                    onToggle={handleToggle}
                    onRemove={handleRemove}
                    onAdd={makeAddHandler('staff')}
                />
            )}
        </div>
    )
}
