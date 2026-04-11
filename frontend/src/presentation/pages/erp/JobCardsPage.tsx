import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../infrastructure/api/client'
import type { JobCard, JobCardCreate, JobCardUpdate } from '../../../domain/types'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    'pending':     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'in-progress': { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    'completed':   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'var(--text-secondary)', bg: 'transparent' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontWeight: 600, fontSize: 12, padding: '3px 10px', borderRadius: 20,
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
        </span>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobCardsPage() {
    const qc = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [filter, setFilter] = useState('')
    const [createError, setCreateError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { data: jobCards, isLoading } = useQuery({
        queryKey: ['job-cards'],
        queryFn: async () => {
            const { data } = await apiClient.get<JobCard[]>('/job-cards?limit=100')
            return data
        }
    })

    const createMutation = useMutation({
        mutationFn: (payload: JobCardCreate) =>
            apiClient.post<JobCard>('/job-cards', payload).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['job-cards'] })
            setShowModal(false)
            setCreateError(null)
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail
            if (Array.isArray(detail)) {
                setCreateError(detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(', '))
            } else {
                setCreateError(detail ?? err?.message ?? 'Failed to create job card.')
            }
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: JobCardUpdate }) =>
            apiClient.put<JobCard>(`/job-cards/${id}`, payload).then(r => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['job-cards'] })
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            apiClient.put(`/job-cards/${id}/status?status=${status}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['job-cards'] })
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/job-cards/${id}`),
        onSuccess: () => {
            setExpandedId(null)
            qc.invalidateQueries({ queryKey: ['job-cards'] })
        }
    })

    const filtered = (jobCards ?? []).filter(j =>
        !filter ||
        j.vehicle_registry.toLowerCase().includes(filter.toLowerCase()) ||
        j.vehicle_vin.toLowerCase().includes(filter.toLowerCase()) ||
        j.status.includes(filter.toLowerCase())
    )

    const toggleExpand = (id: string) =>
        setExpandedId(prev => (prev === id ? null : id))

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            Job Cards
                            <span className="badge badge-accent" style={{ fontSize: 13, textTransform: 'none', letterSpacing: '0', padding: '4px 10px' }}>
                                Subscribed
                            </span>
                        </h1>
                        <p>Track and manage all workshop repair jobs</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + New Job Card
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    className="form-input"
                    style={{ maxWidth: 320 }}
                    placeholder="Filter by registry, VIN or status…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="loading-state"><div className="spinner" /><span>Loading job cards…</span></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 28 }} />
                                <th>Registry</th>
                                <th>VIN</th>
                                <th>Parts Affected</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
                                    No job cards yet. Create one to get started.
                                </td></tr>
                            ) : filtered.map(j => (
                                <>
                                    {/* ── Main row ── */}
                                    <tr
                                        key={j.job_card_id}
                                        onClick={() => toggleExpand(j.job_card_id)}
                                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                    >
                                        {/* Chevron */}
                                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11, userSelect: 'none' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                transform: expandedId === j.job_card_id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                            }}>▶</span>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{j.vehicle_registry || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{j.vehicle_vin || '—'}</td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {j.parts_affected}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <select
                                                className="form-input form-select"
                                                style={{ padding: '4px 28px 4px 8px', fontSize: 12, width: 'auto' }}
                                                value={j.status}
                                                disabled={j.status === 'completed'}
                                                onChange={e => statusMutation.mutate({ id: j.job_card_id, status: e.target.value })}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => {
                                                    if (confirm('Delete this job card?'))
                                                        deleteMutation.mutate(j.job_card_id)
                                                }}
                                            >
                                            Delete
                                            </button>
                                        </td>
                                    </tr>

                                    {/* ── Detail drop-down row ── */}
                                    {expandedId === j.job_card_id && (
                                        <tr key={`${j.job_card_id}-detail`}>
                                            <td colSpan={6} style={{ padding: 0, borderTop: 'none' }}>
                                                <DetailPanel
                                                    card={j}
                                                    onUpdate={(payload) => updateMutation.mutate({ id: j.job_card_id, payload })}
                                                    isUpdating={updateMutation.isPending}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <CreateJobCardModal
                    onClose={() => { setShowModal(false); setCreateError(null) }}
                    onCreate={(data) => { setCreateError(null); createMutation.mutate(data) }}
                    isPending={createMutation.isPending}
                    error={createError}
                />
            )}
        </div>
    )
}

// ── Detail Panel (expandable drop-down) ───────────────────────────────────────

function DetailPanel({
    card, onUpdate, isUpdating
}: {
    card: JobCard
    onUpdate: (payload: JobCardUpdate) => void
    isUpdating: boolean
}) {
    const isEditable = card.status !== 'completed'
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<JobCardUpdate>({
        parts_affected: card.parts_affected,
        details: card.details,
    })

    const handleSave = () => {
        onUpdate(draft)
        setEditing(false)
    }

    const handleCancel = () => {
        setDraft({ parts_affected: card.parts_affected, details: card.details })
        setEditing(false)
    }

    return (
        <div style={{
            background: 'var(--surface-raised, rgba(255,255,255,0.03))',
            borderLeft: '3px solid var(--accent, #7c3aed)',
            margin: '0 0 2px 0',
            padding: '20px 28px',
            animation: 'fadeIn 0.18s ease',
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Job Card Details</span>
                    <StatusBadge status={card.status} />
                    {card.status === 'completed' && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🔒 Read-only — card is completed
                        </span>
                    )}
                </div>
                {isEditable && !editing && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                        ✏️ Edit
                    </button>
                )}
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px', marginBottom: 18 }}>
                <InfoField label="Vehicle Registry" value={card.vehicle_registry || '—'} />
                <InfoField label="VIN" value={card.vehicle_vin || '—'} mono />
                <InfoField label="Created" value={card.created_at ? new Date(card.created_at).toLocaleString() : '—'} />
                <InfoField label="Card ID" value={card.job_card_id} mono />
            </div>

            {/* Parts Affected */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Parts Affected
                </div>
                {editing ? (
                    <input
                        className="form-input"
                        value={draft.parts_affected ?? ''}
                        onChange={e => setDraft(d => ({ ...d, parts_affected: e.target.value }))}
                    />
                ) : (
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {card.parts_affected || <em style={{ color: 'var(--text-secondary)' }}>None specified</em>}
                    </div>
                )}
            </div>

            {/* Details / Notes */}
            <div style={{ marginBottom: editing ? 18 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Details / Notes
                </div>
                {editing ? (
                    <textarea
                        className="form-input"
                        rows={4}
                        value={draft.details ?? ''}
                        onChange={e => setDraft(d => ({ ...d, details: e.target.value }))}
                        style={{ resize: 'vertical' }}
                    />
                ) : (
                    <div style={{
                        fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        padding: card.details ? '10px 14px' : 0,
                        background: card.details ? 'var(--surface, rgba(255,255,255,0.04))' : 'transparent',
                        borderRadius: 8,
                    }}>
                        {card.details || <em style={{ color: 'var(--text-secondary)' }}>No notes</em>}
                    </div>
                )}
            </div>

            {/* Edit action buttons */}
            {editing && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleCancel} disabled={isUpdating}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSave}
                        disabled={isUpdating || !draft.parts_affected || !draft.details}
                    >
                        {isUpdating ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : '💾 Save Changes'}
                    </button>
                </div>
            )}
        </div>
    )
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 3 }}>
                {label}
            </div>
            <div style={{ fontSize: 13, fontFamily: mono ? 'monospace' : undefined, color: 'var(--text-primary)' }}>
                {value}
            </div>
        </div>
    )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateJobCardModal({
    onClose, onCreate, isPending, error
}: {
    onClose: () => void
    onCreate: (data: JobCardCreate) => void
    isPending: boolean
    error: string | null
}) {
    const [form, setForm] = useState<JobCardCreate>({
        vehicle_vin: '', vehicle_registry: '', parts_affected: '', details: ''
    })

    const set = (k: keyof JobCardCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }))

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">📋 New Job Card</span>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Vehicle Registry (plate)</label>
                        <input className="form-input" placeholder="GR 1234-23" value={form.vehicle_registry} onChange={set('vehicle_registry')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">VIN</label>
                        <input className="form-input" placeholder="1HGBH41JXMN109186" value={form.vehicle_vin} onChange={set('vehicle_vin')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Parts Affected</label>
                        <input className="form-input" placeholder="e.g. Brake pads, Engine oil" value={form.parts_affected} onChange={set('parts_affected')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Details / Notes</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Describe the issue or work to be done…"
                            value={form.details}
                            onChange={set('details')}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </div>
                {error && (
                    <div style={{
                        margin: '0 24px',
                        padding: '10px 14px',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: 8,
                        color: 'var(--danger, #ef4444)',
                        fontSize: 13,
                    }}>
                        ⚠️ {error}
                    </div>
                )}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        disabled={isPending || !form.parts_affected || !form.vehicle_vin || !form.vehicle_registry || !form.details}
                        onClick={() => onCreate(form)}
                    >
                        {isPending ? <><div className="spinner" /> Creating…</> : 'Create Job Card'}
                    </button>
                </div>
            </div>
        </div>
    )
}
