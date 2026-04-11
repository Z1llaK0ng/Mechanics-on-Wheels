import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../infrastructure/api/client'
import type { JobCard } from '../../../domain/types'

interface SearchResult {
    vehicle_vin?: string
    vehicle_registry?: string
    shop_id?: string
    shop_name?: string
    job_card_id?: string | number
    parts_affected?: string
    description?: string
    details?: string
    status?: string
    created_at?: string
}

type Tab = 'search' | 'upload'

export default function GlobalDbPage() {
    const [activeTab, setActiveTab] = useState<Tab>('search')

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>🌐 Global Database</h1>
                <p>Search vehicle history across all shops — or push your job cards to the MoW network.</p>
            </div>

            {/* Feature stat cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 14,
                marginBottom: 28,
            }}>
                {FEATURES.map(f => (
                    <div key={f.label} className="stat-card" style={{ cursor: 'default' }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                        <div className="stat-card-label" style={{ fontSize: 12 }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.desc}</div>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div style={{
                display: 'flex',
                gap: 4,
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 24,
            }}>
                {([
                    { id: 'search', label: '🔍 Search Network' },
                    { id: 'upload', label: '📤 Upload to Network' },
                ] as { id: Tab; label: string }[]).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === t.id
                                ? '2px solid var(--accent-light)'
                                : '2px solid transparent',
                            color: activeTab === t.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                            fontWeight: activeTab === t.id ? 700 : 500,
                            fontSize: 14,
                            padding: '10px 18px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            marginBottom: -1,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'search' && <SearchTab />}
            {activeTab === 'upload' && <UploadTab />}
        </div>
    )
}

/* ── Search Tab ──────────────────────────────────────────────────────────── */

function SearchTab() {
    const [filter, setFilter] = useState('')
    const [selectedCard, setSelectedCard] = useState<SearchResult | null>(null)
    const [groupBy, setGroupBy] = useState<'none' | 'vin' | 'registry' | 'date'>('none')

    // Load ALL global-db job cards on mount — they are already shop-tagged
    const { data: allCards = [], isLoading, isError } = useQuery<SearchResult[]>({
        queryKey: ['global-db', 'all'],
        queryFn: async () => {
            const { data } = await apiClient.get<SearchResult[]>('/global-db')
            return data
        },
        staleTime: 1000 * 30, // refresh every 30 seconds
    })

    // Client-side filter: match VIN or registry, case-insensitive
    const trimmed = filter.trim().toLowerCase()
    const visible = trimmed
        ? allCards.filter(r =>
            r.vehicle_vin?.toLowerCase().includes(trimmed) ||
            r.vehicle_registry?.toLowerCase().includes(trimmed)
          )
        : allCards

    const groupedData = useMemo(() => {
        if (groupBy === 'none') return null
        const map = new Map<string, SearchResult[]>()
        for (const card of visible) {
            let key = 'Unknown'
            if (groupBy === 'vin') key = card.vehicle_vin || '(no VIN)'
            else if (groupBy === 'registry') key = card.vehicle_registry || '(no registry)'
            else if (groupBy === 'date') key = card.created_at ? new Date(card.created_at).toLocaleDateString() : '(no date)'
            
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(card)
        }
        return map
    }, [visible, groupBy])

    return (
        <div>
            {/* Filter bar */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🔍 Search Network</h2>
                <input
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="Filter by VIN or plate number…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    autoFocus
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    All job cards in the MoW Global Database are shown below. Type to narrow results by VIN or plate number.
                </p>
            </div>

            {/* States */}
            {isLoading && (
                <div className="loading-state"><div className="spinner" /><span>Loading global database…</span></div>
            )}

            {isError && !isLoading && (
                <div className="loading-state">
                    <span style={{ fontSize: 36 }}>⚠️</span>
                    <p style={{ color: 'var(--danger)' }}>Could not reach the global database. Check that the backend is running.</p>
                </div>
            )}

            {!isLoading && !isError && allCards.length === 0 && (
                <div className="loading-state">
                    <span style={{ fontSize: 48 }}>🌐</span>
                    <p style={{ maxWidth: 360 }}>
                        No job cards have been uploaded to the Global Database yet.
                        Use the <strong>Upload to Network</strong> tab to add some.
                    </p>
                </div>
            )}

            {!isLoading && !isError && allCards.length > 0 && visible.length === 0 && (
                <div className="loading-state">
                    <span style={{ fontSize: 36 }}>🚗</span>
                    <p>No records match <strong>"{filter}"</strong> — try a different VIN or plate number.</p>
                </div>
            )}

            {!isLoading && visible.length > 0 && (
                <div>
                    {/* Record count and Group By options */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Showing {visible.length} of {allCards.length} record{allCards.length !== 1 ? 's' : ''}
                            {trimmed && <span> matching <strong>"{filter}"</strong></span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Group by:</span>
                            <select 
                                className="form-input" 
                                style={{ padding: '6px 12px', height: '32px', fontSize: 13, minWidth: 120 }} 
                                value={groupBy} 
                                onChange={e => setGroupBy(e.target.value as any)}
                            >
                                <option value="none">None (Flat)</option>
                                <option value="vin">VIN</option>
                                <option value="registry">Registry</option>
                                <option value="date">Date</option>
                            </select>
                        </div>
                    </div>

                    {groupBy === 'none' ? (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>VIN</th>
                                        <th>Registry</th>
                                        <th>Shop</th>
                                        <th>Parts Affected</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((r, i) => (
                                        <tr 
                                            key={i} 
                                            onClick={() => setSelectedCard(r)}
                                            style={{ cursor: 'pointer' }}
                                            className="hoverable-row"
                                        >
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.vehicle_vin || '—'}</td>
                                            <td>{r.vehicle_registry || '—'}</td>
                                            <td>{r.shop_name || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.parts_affected || r.description || '—'}
                                            </td>
                                            <td>
                                                {r.status && (
                                                    <span className={`badge ${STATUS_MAP[r.status] ?? 'badge-info'}`}>
                                                        {r.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            {Array.from(groupedData!.entries()).map(([key, cards]) => (
                                <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                        background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)'
                                    }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {groupBy.toUpperCase()}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, flex: 1 }}>{key}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {cards.map((r, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedCard(r)}
                                            className="hoverable-row"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                                                borderBottom: i < cards.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer',
                                                transition: 'background 0.15s'
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.parts_affected || r.description || '—'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
                                                    <span>🛒 {r.shop_name || '—'}</span>
                                                    {groupBy !== 'date' && <span>📅 {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>}
                                                    {groupBy !== 'vin' && r.vehicle_vin && <span style={{ fontFamily: 'monospace' }}>🔢 {r.vehicle_vin}</span>}
                                                    {groupBy !== 'registry' && r.vehicle_registry && <span>🏷️ {r.vehicle_registry}</span>}
                                                </div>
                                            </div>
                                            <span className={`badge ${STATUS_MAP[r.status || ''] ?? 'badge-info'}`} style={{ fontSize: 10 }}>{r.status || 'Unknown'}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Job Card Details Modal */}
            {selectedCard && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20
                }} onClick={() => setSelectedCard(null)}>
                    <div 
                        className="card fade-in" 
                        style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Job Card Details</h2>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {selectedCard.job_card_id}
                                </p>
                            </div>
                            <button onClick={() => setSelectedCard(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                &times;
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>VIN</label>
                                <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedCard.vehicle_vin || '—'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Registry</label>
                                <div style={{ fontWeight: 500 }}>{selectedCard.vehicle_registry || '—'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Shop</label>
                                <div>{selectedCard.shop_name || '—'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
                                {selectedCard.status ? (
                                    <span className={`badge ${STATUS_MAP[selectedCard.status] ?? 'badge-info'}`}>
                                        {selectedCard.status}
                                    </span>
                                ) : '—'}
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
                                <div>{selectedCard.created_at ? new Date(selectedCard.created_at).toLocaleString() : '—'}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Parts Affected</label>
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 14 }}>
                                {selectedCard.parts_affected || selectedCard.description || '—'}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Details & Notes</label>
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 14, minHeight: 80, whiteSpace: 'pre-wrap' }}>
                                {selectedCard.details || 'No additional details provided.'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Upload Tab ──────────────────────────────────────────────────────────── */

function UploadTab() {
    const qc = useQueryClient()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [uploadResult, setUploadResult] = useState<{ updated: number } | null>(null)
    const [removeResult, setRemoveResult] = useState<{ updated: number } | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [backfilling, setBackfilling] = useState(false)
    const [backfillResult, setBackfillResult] = useState<{ updated: number } | null>(null)

    // Fetch all the mechanic's own job cards
    const { data: jobCards = [], isLoading, refetch } = useQuery<JobCard[]>({
        queryKey: ['job-cards', 'all-for-upload'],
        queryFn: async () => {
            const { data } = await apiClient.get<JobCard[]>('/job-cards?limit=100')
            return data
        },
        staleTime: 0,
    })

    // Group by VIN
    const byVin = useMemo(() => {
        const map = new Map<string, JobCard[]>()
        for (const card of jobCards) {
            const vin = card.vehicle_vin || '(no VIN)'
            if (!map.has(vin)) map.set(vin, [])
            map.get(vin)!.push(card)
        }
        return map
    }, [jobCards])

    const toggleCard = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleVin = (_vin: string, cards: JobCard[]) => {
        const ids = cards.map(c => c.job_card_id)
        const allSelected = ids.every(id => selected.has(id))
        setSelected(prev => {
            const next = new Set(prev)
            if (allSelected) ids.forEach(id => next.delete(id))
            else ids.forEach(id => next.add(id))
            return next
        })
    }

    const selectAll = () => setSelected(new Set(jobCards.map(c => c.job_card_id)))
    const clearAll  = () => setSelected(new Set())

    // Tag selected cards with shop_id (upload to network)
    const tagMutation = useMutation({
        mutationFn: (ids: string[]) =>
            apiClient.patch('/job-cards/tag-shop-id', { job_card_ids: ids }).then(r => r.data),
        onSuccess: (data) => {
            setUploadResult({ updated: data.updated })
            setRemoveResult(null)
            setUploadError(data.errors?.length ? `Some failed: ${data.errors.join(', ')}` : null)
            setSelected(new Set())
            qc.invalidateQueries({ queryKey: ['job-cards', 'all-for-upload'] })
            qc.invalidateQueries({ queryKey: ['global-db'] })
        },
        onError: (err: any) => {
            if (err?.response?.status === 403) {
                setUploadError('Your shop admin has not granted you permission to push data to the Global Database.')
                return
            }
            setUploadError(err?.response?.data?.detail ?? err?.message ?? 'Upload failed.')
        },
    })

    // Untag selected cards (remove from network)
    const untagMutation = useMutation({
        mutationFn: (ids: string[]) =>
            apiClient.patch('/job-cards/untag-shop-id', { job_card_ids: ids }).then(r => r.data),
        onSuccess: (data) => {
            setRemoveResult({ updated: data.updated })
            setUploadResult(null)
            setUploadError(data.errors?.length ? `Some failed: ${data.errors.join(', ')}` : null)
            setSelected(new Set())
            qc.invalidateQueries({ queryKey: ['job-cards', 'all-for-upload'] })
            qc.invalidateQueries({ queryKey: ['global-db'] })
        },
        onError: (err: any) => {
            if (err?.response?.status === 403) {
                setUploadError('Your shop admin has not granted you permission to remove data from the Global Database.')
                return
            }
            setUploadError(err?.response?.data?.detail ?? err?.message ?? 'Remove failed.')
        },
    })

    // Backfill ALL cards
    const handleBackfill = async () => {
        setBackfilling(true)
        setBackfillResult(null)
        try {
            const { data } = await apiClient.post('/job-cards/backfill-shop-id')
            setBackfillResult({ updated: data.updated })
            refetch()
            qc.invalidateQueries({ queryKey: ['job-cards'] })
        } catch (e: any) {
            if (e?.response?.status === 403) {
                setUploadError('Your shop admin has not granted you permission to push data to the Global Database.')
            } else {
                setUploadError(e?.response?.data?.detail ?? 'Backfill failed.')
            }
        } finally {
            setBackfilling(false)
        }
    }

    const untagged = jobCards.filter(c => !c.is_uploaded).length
    const tagged   = jobCards.filter(c => !!c.is_uploaded).length

    // How many of the currently selected cards are tagged vs untagged
    const taggedSelected   = jobCards.filter(c => selected.has(c.job_card_id) && !!c.is_uploaded).map(c => c.job_card_id)
    const untaggedSelected = jobCards.filter(c => selected.has(c.job_card_id) && !c.is_uploaded).map(c => c.job_card_id)

    if (isLoading) return <div className="loading-state"><div className="spinner" /><span>Loading your job cards…</span></div>

    if (jobCards.length === 0) {
        return (
            <div className="loading-state">
                <span style={{ fontSize: 40 }}>📋</span>
                <p>You have no job cards yet. Create some in the Job Cards module first.</p>
            </div>
        )
    }

    return (
        <div>
            {/* Summary bar */}
            <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📊 Your Job Cards</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                        <span>✅ <strong>{tagged}</strong> tagged with shop</span>
                        <span>⚠️ <strong>{untagged}</strong> missing shop tag</span>
                        <span>📋 <strong>{jobCards.length}</strong> total</span>
                    </div>
                </div>
                {untagged > 0 && (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleBackfill}
                        disabled={backfilling}
                        title="Stamp your shop ID on all cards that are missing it"
                    >
                        {backfilling
                            ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Tagging…</>
                            : `🏷️ Tag All ${untagged} Missing`}
                    </button>
                )}
            </div>

            {backfillResult && (
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>
                    ✅ Backfill complete — {backfillResult.updated} card{backfillResult.updated !== 1 ? 's' : ''} updated with your shop tag.
                </div>
            )}

            {uploadResult && (
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>
                    ✅ {uploadResult.updated} card{uploadResult.updated !== 1 ? 's' : ''} uploaded to the network.
                </div>
            )}

            {removeResult && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
                    🗑️ {removeResult.updated} card{removeResult.updated !== 1 ? 's' : ''} removed from the Global Database.
                </div>
            )}

            {uploadError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
                    ⚠️ {uploadError}
                </div>
            )}

            {/* Select actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Select job cards by VIN to upload. Registry is excluded — only VIN is used to link history across shops.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
                    <button className="btn btn-ghost btn-sm" onClick={clearAll} disabled={selected.size === 0}>Clear</button>
                </div>
            </div>

            {/* VIN groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {Array.from(byVin.entries()).map(([vin, cards]) => {
                    const ids = cards.map(c => c.job_card_id)
                    const allSel = ids.every(id => selected.has(id))
                    const someSel = ids.some(id => selected.has(id))
                    const allTagged = cards.every(c => !!c.is_uploaded)

                    return (
                        <div key={vin} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* VIN header row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 16px',
                                    background: 'var(--bg-tertiary)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => toggleVin(vin, cards)}
                            >
                                <input
                                    type="checkbox"
                                    checked={allSel}
                                    ref={el => { if (el) el.indeterminate = someSel && !allSel }}
                                    onChange={() => toggleVin(vin, cards)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>VIN</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', flex: 1 }}>{vin}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
                                {allTagged && (
                                    <span className="badge badge-success" style={{ fontSize: 10 }}>✅ Tagged</span>
                                )}
                            </div>

                            {/* Individual cards */}
                            {cards.map(card => (
                                <div
                                    key={card.job_card_id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 16px 10px 44px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        background: selected.has(card.job_card_id) ? 'rgba(124,58,237,0.06)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}
                                    onClick={() => toggleCard(card.job_card_id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(card.job_card_id)}
                                        onChange={() => toggleCard(card.job_card_id)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ width: 14, height: 14, cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {card.parts_affected || '—'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {card.created_at ? new Date(card.created_at).toLocaleDateString() : ''}
                                            {card.vehicle_registry ? ` · ${card.vehicle_registry}` : ''}
                                        </div>
                                    </div>
                                    <span className={`badge ${STATUS_MAP[card.status] ?? 'badge-info'}`} style={{ fontSize: 10 }}>{card.status}</span>
                                    {card.is_uploaded
                                        ? <span title="Already uploaded to network" style={{ fontSize: 14 }}>✅</span>
                                        : <span title="Not yet uploaded" style={{ fontSize: 14, opacity: 0.4 }}>⬜</span>
                                    }
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {selected.size > 0
                        ? `${selected.size} card${selected.size !== 1 ? 's' : ''} selected · ${taggedSelected.length} in network · ${untaggedSelected.length} not yet uploaded`
                        : 'Select cards above to upload or remove from the network'}
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                    {/* Remove: only shown when tagged cards are selected */}
                    {taggedSelected.length > 0 && (
                        <button
                            className="btn btn-danger"
                            disabled={untagMutation.isPending || tagMutation.isPending}
                            onClick={() => untagMutation.mutate(taggedSelected)}
                            title="Remove selected cards from the Global Database"
                        >
                            {untagMutation.isPending
                                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Removing…</>
                                : `🗑️ Remove ${taggedSelected.length} from Network`}
                        </button>
                    )}
                    {/* Upload: only shown when untagged cards are selected */}
                    {untaggedSelected.length > 0 && (
                        <button
                            className="btn btn-primary"
                            disabled={tagMutation.isPending || untagMutation.isPending}
                            onClick={() => tagMutation.mutate(untaggedSelected)}
                        >
                            {tagMutation.isPending
                                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</>
                                : `📤 Upload ${untaggedSelected.length} to Network`}
                        </button>
                    )}
                    {/* Disabled placeholder when nothing is selected */}
                    {selected.size === 0 && (
                        <button className="btn btn-primary" disabled>📤 Upload to Network</button>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ── Static data ─────────────────────────────────────────────────────────── */

const FEATURES = [
    { icon: '🔍', label: 'Cross-Shop Search',   desc: 'Find vehicle records from any shop on the network' },
    { icon: '🚗', label: 'VIN-Based History',   desc: 'Job history linked by VIN — not by plate' },
    { icon: '📤', label: 'Network Upload',       desc: 'Tag your job cards for cross-shop visibility' },
    { icon: '🔗', label: 'Network-Wide',         desc: 'Data shared across all MoW partner shops' },
]

const STATUS_MAP: Record<string, string> = {
    'pending':     'badge-warning',
    'in-progress': 'badge-info',
    'completed':   'badge-success',
}
