import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../infrastructure/api/client'
import type { JobCard, JobCardCreate } from '../../../domain/types'

export default function JobCardsPage() {
    const qc = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [filter, setFilter] = useState('')

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
        }
    })

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            apiClient.put(`/job-cards/${id}/status?status=${status}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['job-cards'] })
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/job-cards/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['job-cards'] })
    })

    const filtered = (jobCards ?? []).filter(j =>
        !filter || j.vehicle_registry.toLowerCase().includes(filter.toLowerCase()) ||
        j.vehicle_vin.toLowerCase().includes(filter.toLowerCase()) ||
        j.status.includes(filter.toLowerCase())
    )

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Job Cards</h1>
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
                                <th>#</th>
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
                                <tr key={j.job_card_id}>
                                    <td>{j.job_card_id}</td>
                                    <td>{j.vehicle_registry || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{j.vehicle_vin || '—'}</td>
                                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {j.parts_affected}
                                    </td>
                                    <td>
                                        <select
                                            className="form-input form-select"
                                            style={{ padding: '4px 28px 4px 8px', fontSize: 12, width: 'auto' }}
                                            value={j.status}
                                            onChange={e => statusMutation.mutate({ id: j.job_card_id, status: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => {
                                                if (confirm('Delete this job card?'))
                                                    deleteMutation.mutate(j.job_card_id)
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <CreateJobCardModal
                    onClose={() => setShowModal(false)}
                    onCreate={(data) => createMutation.mutate(data)}
                    isPending={createMutation.isPending}
                />
            )}
        </div>
    )
}

function CreateJobCardModal({
    onClose, onCreate, isPending
}: {
    onClose: () => void
    onCreate: (data: JobCardCreate) => void
    isPending: boolean
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
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        disabled={isPending || !form.parts_affected}
                        onClick={() => onCreate(form)}
                    >
                        {isPending ? <><div className="spinner" /> Creating…</> : 'Create Job Card'}
                    </button>
                </div>
            </div>
        </div>
    )
}
